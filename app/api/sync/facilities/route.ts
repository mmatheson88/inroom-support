import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

// Sheet must be shared as "Anyone with the link can view"
// Requires GOOGLE_SHEETS_API_KEY env var (Google Cloud > APIs & Services > Credentials > API Key)
const SHEET_ID = '1QVD4wLKGNWWnBNNIuglLI6fVo43buQFQjxufzWYbQ4w'
const SHEET_RANGE = 'Won Deals!A:I'

export async function POST() {
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GOOGLE_SHEETS_API_KEY env var not set' }, { status: 500 })
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(SHEET_RANGE)}?key=${apiKey}`
  const res = await fetch(url)
  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: `Sheets API error: ${err}` }, { status: 500 })
  }

  const json = await res.json()
  const rows: string[][] = json.values ?? []

  if (rows.length < 2) {
    return NextResponse.json({ upserted: 0, skipped: 0, message: 'No data rows found' })
  }

  // Skip header row
  const dataRows = rows.slice(1)
  const supabase = createServiceClient()
  let upserted = 0
  let skipped = 0

  for (const row of dataRows) {
    const name = row[0]?.trim()
    if (!name) { skipped++; continue }

    // Column mapping: A=name, B=address, C=deal_type, E=room_count, F=product, G=deal_open_date, I=deal_won_date
    const address = row[1]?.trim() || null
    const dealType = row[2]?.trim() || null
    const roomCount = row[4] ? (parseInt(row[4].replace(/[^0-9]/g, ''), 10) || null) : null
    const product = row[5]?.trim() || null
    const dealOpenDate = row[6]?.trim() || null
    const dealWonDate = row[8]?.trim() || null

    const { data: existing } = await supabase
      .from('facilities')
      .select('id')
      .ilike('name', name)
      .maybeSingle()

    if (existing) {
      await supabase.from('facilities').update({
        address,
        deal_type: dealType,
        room_count: roomCount,
        product,
        deal_open_date: dealOpenDate,
        deal_won_date: dealWonDate,
      }).eq('id', existing.id)
    } else {
      await supabase.from('facilities').insert({
        name,
        address,
        deal_type: dealType,
        room_count: roomCount,
        product,
        deal_open_date: dealOpenDate,
        deal_won_date: dealWonDate,
        created_at: new Date().toISOString(),
      })
    }
    upserted++
  }

  return NextResponse.json({ upserted, skipped })
}
