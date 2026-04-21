import { google } from 'googleapis'
import Anthropic from '@anthropic-ai/sdk'
import { decrypt } from './crypto'
import { createServiceClient } from './supabase/service'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface ScanResult {
  isIssue: boolean
  confidence: number
  facility: string
  contactName: string
  contactEmail: string
  issueType: string
  priority: string
  title: string
  summary: string
}

async function analyzeEmail(subject: string, body: string, from: string): Promise<ScanResult> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 512,
    system: `You analyze customer support emails for a company that provides DIRECTV services via COM3000 headend systems to senior living facilities. Identify if an email is a support issue.

Return JSON only, no other text:
{
  "isIssue": boolean,
  "confidence": 0.0-1.0,
  "facility": "facility name or empty string",
  "contactName": "sender name or empty",
  "contactEmail": "sender email or empty",
  "issueType": "channel|remote|billing|tech|programming|other",
  "priority": "critical|high|medium|low",
  "title": "brief issue title under 80 chars",
  "summary": "1-2 sentence summary"
}

Issue types: channel=specific channels missing/wrong, remote=remote control issues, billing=payment/billing, tech=technical/equipment, programming=channel lineup/packages, other=anything else.
Priority: critical=complete outage, high=major disruption, medium=partial issue, low=minor/informational.`,
    messages: [
      {
        role: 'user',
        content: `From: ${from}\nSubject: ${subject}\n\n${body.slice(0, 3000)}`,
      },
    ],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : '{}'
  try {
    return JSON.parse(text.trim())
  } catch {
    return { isIssue: false, confidence: 0, facility: '', contactName: '', contactEmail: '', issueType: 'other', priority: 'low', title: '', summary: '' }
  }
}

export async function scanUserInbox(userId: string) {
  const supabase = createServiceClient()

  const { data: user } = await supabase
    .from('users')
    .select('gmail_access_token, gmail_refresh_token, last_scan_at')
    .eq('id', userId)
    .single()

  if (!user?.gmail_access_token) return

  const { data: settings } = await supabase.from('scan_settings').select('*').single()

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'https://inroom-support.vercel.app/api/gmail/callback'
  )

  oauth2Client.setCredentials({
    access_token: decrypt(user.gmail_access_token),
    refresh_token: user.gmail_refresh_token ? decrypt(user.gmail_refresh_token) : undefined,
  })

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

  const sinceDate = user.last_scan_at
    ? new Date(user.last_scan_at)
    : new Date(Date.now() - 24 * 60 * 60 * 1000)

  const query = `after:${Math.floor(sinceDate.getTime() / 1000)} -from:me`

  const listRes = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults: 20,
  })

  const messages = listRes.data.messages ?? []

  for (const msg of messages) {
    if (!msg.id) continue

    const { data: existing } = await supabase
      .from('email_scans')
      .select('id')
      .eq('gmail_message_id', msg.id)
      .single()

    if (existing) continue

    const msgData = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'full' })
    const headers = msgData.data.payload?.headers ?? []
    const subject = headers.find(h => h.name === 'Subject')?.value ?? '(no subject)'
    const from = headers.find(h => h.name === 'From')?.value ?? ''

    const parts = msgData.data.payload?.parts ?? []
    let body = ''
    const textPart = parts.find(p => p.mimeType === 'text/plain') ?? msgData.data.payload
    if (textPart?.body?.data) {
      body = Buffer.from(textPart.body.data, 'base64').toString('utf8')
    }

    const analysis = await analyzeEmail(subject, body, from)

    const scanRecord = {
      user_id: userId,
      gmail_message_id: msg.id,
      scanned_at: new Date().toISOString(),
      ticket_created: false,
      ticket_id: null as string | null,
      confidence_score: analysis.confidence,
      raw_summary: analysis.summary,
    }

    if (!analysis.isIssue || analysis.confidence < 0.4) {
      await supabase.from('email_scans').insert(scanRecord)
      continue
    }

    if (analysis.confidence >= 0.85) {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const { data: duplicate } = await supabase
        .from('tickets')
        .select('id')
        .eq('facility_name', analysis.facility)
        .eq('type', analysis.issueType)
        .gte('created_at', sevenDaysAgo)
        .in('status', ['open', 'in_progress'])
        .single()

      if (!duplicate && settings?.auto_create) {
        const { data: ticket } = await supabase
          .from('tickets')
          .insert({
            title: analysis.title,
            description: analysis.summary,
            facility_name: analysis.facility,
            contact_name: analysis.contactName,
            contact_email: analysis.contactEmail || from,
            type: analysis.issueType,
            priority: analysis.priority,
            source: 'auto_email',
            status: 'open',
            created_by: userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (ticket) {
          scanRecord.ticket_created = true
          scanRecord.ticket_id = ticket.id
          await supabase.from('email_scans').insert(scanRecord)
          await supabase.from('users').update({ last_scan_at: new Date().toISOString() }).eq('id', userId)
          continue
        }
      }
    }

    await supabase.from('review_queue').insert({
      user_id: userId,
      gmail_message_id: msg.id,
      from_email: from,
      subject,
      summary: analysis.summary,
      suggested_facility: analysis.facility,
      suggested_type: analysis.issueType,
      suggested_priority: analysis.priority,
      confidence_score: analysis.confidence,
      status: 'pending',
      created_at: new Date().toISOString(),
    })

    await supabase.from('email_scans').insert(scanRecord)
  }

  await supabase.from('users').update({ last_scan_at: new Date().toISOString() }).eq('id', userId)
}
