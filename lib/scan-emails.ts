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

const FALLBACK_RESULT: ScanResult = {
  isIssue: false, confidence: 0, facility: '', contactName: '', contactEmail: '',
  issueType: 'other', priority: 'low', title: '', summary: '',
}

async function analyzeEmail(subject: string, body: string, from: string): Promise<ScanResult> {
  let rawText = ''
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: `You analyze customer support emails for InRoom Media (inroomtv.com), a company that provides DIRECTV television services via COM3000 headend systems to senior living facilities, nursing homes, assisted living facilities, and memory care centers across the United States.

Customers are facility directors, administrators, maintenance staff, or residents at senior living properties. Common issues include: TV channels not working or showing black screens, missing channels, remote controls not responding, billing disputes, channel lineup or programming questions, COM3000 headend equipment problems, no signal, audio issues, and service outages.

Identify if an email is a customer support issue that needs attention. Ignore: sales emails, spam, internal company emails, automated notifications, newsletters, meeting requests, and general correspondence that is not a service complaint or technical issue.

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

Issue types: channel=specific channels missing/black screen/wrong channel, remote=remote control not working/responding, billing=invoice/payment/pricing dispute, tech=equipment failure/COM3000/headend/signal/hardware, programming=channel lineup/package/guide issues, other=anything else.
Priority: critical=complete outage affecting all TVs or entire facility, high=major disruption affecting multiple rooms or wings, medium=partial issue affecting some rooms or channels, low=minor issue/single room/informational request.`,
      messages: [
        {
          role: 'user',
          content: `From: ${from}\nSubject: ${subject}\n\n${body.slice(0, 3000)}`,
        },
      ],
    })

    rawText = message.content[0].type === 'text' ? message.content[0].text : ''
    console.log(`[claude] raw response: ${rawText}`)

    // Strip markdown code fences if present (```json ... ``` or ``` ... ```)
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

    return JSON.parse(cleaned)
  } catch (err) {
    console.error(`[claude] error — message: ${(err as Error).message}`)
    if (rawText) console.error(`[claude] raw response was: ${rawText}`)
    return FALLBACK_RESULT
  }
}

export async function scanUserInbox(userId: string, deepScan = false) {
  const supabase = createServiceClient()
  console.log(`[scan] starting scan for user=${userId} deepScan=${deepScan}`)

  const { data: user } = await supabase
    .from('users')
    .select('gmail_access_token, gmail_refresh_token, last_scan_at')
    .eq('id', userId)
    .single()

  if (!user?.gmail_access_token) {
    console.log(`[scan] user=${userId} has no gmail_access_token — skipping`)
    return
  }

  const { data: settings } = await supabase.from('scan_settings').select('*').single()
  console.log(`[scan] settings: auto_create=${settings?.auto_create} frequency=${settings?.frequency_minutes}min`)

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

  const sinceDate = deepScan
    ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    : user.last_scan_at
      ? new Date(user.last_scan_at)
      : new Date(Date.now() - 24 * 60 * 60 * 1000)

  const query = `after:${Math.floor(sinceDate.getTime() / 1000)} -from:me`
  console.log(`[scan] gmail query: "${query}" (since ${sinceDate.toISOString()})`)

  const listRes = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults: 50,
  })

  const messages = listRes.data.messages ?? []
  console.log(`[scan] fetched ${messages.length} messages from Gmail`)

  let skippedAlreadyScanned = 0
  let skippedNotIssue = 0
  let addedToQueue = 0
  let ticketsCreated = 0

  for (const msg of messages) {
    if (!msg.id) continue

    const { data: existing } = await supabase
      .from('email_scans')
      .select('id')
      .eq('gmail_message_id', msg.id)
      .single()

    if (existing) {
      skippedAlreadyScanned++
      continue
    }

    const msgData = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'full' })
    const headers = msgData.data.payload?.headers ?? []
    const subject = headers.find(h => h.name === 'Subject')?.value ?? '(no subject)'
    const from = headers.find(h => h.name === 'From')?.value ?? ''

    console.log(`[scan] processing message id=${msg.id} from="${from}" subject="${subject}"`)

    const parts = msgData.data.payload?.parts ?? []
    let body = ''
    const textPart = parts.find(p => p.mimeType === 'text/plain') ?? msgData.data.payload
    if (textPart?.body?.data) {
      body = Buffer.from(textPart.body.data, 'base64').toString('utf8')
    }
    console.log(`[scan] body length=${body.length} chars`)

    // Keyword pre-filter — skip Claude call if no keywords match
    const keywords: string[] = settings?.keywords ?? ['issue', 'problem', 'broken', 'not working', 'outage', 'channel']
    const searchText = `${subject} ${body}`.toLowerCase()
    const matchedKeyword = keywords.find(kw => searchText.includes(kw.toLowerCase()))
    if (!matchedKeyword) {
      console.log(`[scan] SKIP — no keywords matched in subject/body (keywords: ${keywords.join(', ')})`)
      await supabase.from('email_scans').insert({
        user_id: userId,
        gmail_message_id: msg.id,
        scanned_at: new Date().toISOString(),
        ticket_created: false,
        ticket_id: null,
        confidence_score: 0,
        raw_summary: '',
      })
      skippedNotIssue++
      continue
    }
    console.log(`[scan] keyword match: "${matchedKeyword}" — sending to Claude`)

    await new Promise(r => setTimeout(r, 2000))
    const analysis = await analyzeEmail(subject, body, from)
    console.log(`[scan] claude response: isIssue=${analysis.isIssue} confidence=${analysis.confidence} type=${analysis.issueType} priority=${analysis.priority} title="${analysis.title}"`)

    const scanRecord = {
      user_id: userId,
      gmail_message_id: msg.id,
      scanned_at: new Date().toISOString(),
      ticket_created: false,
      ticket_id: null as string | null,
      confidence_score: analysis.confidence,
      raw_summary: analysis.summary,
    }

    if (!analysis.isIssue || analysis.confidence < 0.3) {
      console.log(`[scan] SKIP — isIssue=${analysis.isIssue} confidence=${analysis.confidence} (below 0.3 threshold)`)
      await supabase.from('email_scans').insert(scanRecord)
      skippedNotIssue++
      continue
    }

    if (analysis.confidence >= 0.75) {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const { data: duplicate } = await supabase
        .from('tickets')
        .select('id')
        .eq('facility_name', analysis.facility)
        .eq('type', analysis.issueType)
        .gte('created_at', sevenDaysAgo)
        .in('status', ['open', 'in_progress'])
        .single()

      if (duplicate) {
        console.log(`[scan] QUEUE — confidence=${analysis.confidence} >= 0.75 but duplicate ticket exists (id=${duplicate.id})`)
      } else if (!settings?.auto_create) {
        console.log(`[scan] QUEUE — confidence=${analysis.confidence} >= 0.75 but auto_create is disabled`)
      } else {
        console.log(`[scan] AUTO-CREATE ticket — confidence=${analysis.confidence} facility="${analysis.facility}"`)

        // Try to match facility name to a real facility record
        let facilityId: string | null = null
        if (analysis.facility) {
          const { data: matchedFacility } = await supabase
            .from('facilities')
            .select('id')
            .ilike('name', `%${analysis.facility}%`)
            .limit(1)
            .maybeSingle()
          if (matchedFacility) {
            facilityId = matchedFacility.id
            console.log(`[scan] matched facility_id=${facilityId} for name="${analysis.facility}"`)
          }
        }

        const { data: ticket, error: ticketError } = await supabase
          .from('tickets')
          .insert({
            title: analysis.title,
            description: analysis.summary,
            facility_id: facilityId,
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

        if (ticketError) {
          console.log(`[scan] ticket insert error: ${ticketError.message}`)
        }

        if (ticket) {
          console.log(`[scan] ticket created id=${ticket.id}`)
          scanRecord.ticket_created = true
          scanRecord.ticket_id = ticket.id
          await supabase.from('email_scans').insert(scanRecord)
          await supabase.from('users').update({ last_scan_at: new Date().toISOString() }).eq('id', userId)
          ticketsCreated++
          continue
        }
      }
    } else {
      console.log(`[scan] QUEUE — confidence=${analysis.confidence} is between 0.3 and 0.75`)
    }

    console.log(`[scan] adding to review_queue`)
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
    addedToQueue++
  }

  await supabase.from('users').update({ last_scan_at: new Date().toISOString() }).eq('id', userId)
  console.log(`[scan] done — total=${messages.length} alreadyScanned=${skippedAlreadyScanned} notIssue=${skippedNotIssue} queue=${addedToQueue} tickets=${ticketsCreated}`)
}
