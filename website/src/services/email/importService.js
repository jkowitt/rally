import { supabase } from '@/lib/supabase'
import { addSubscribersToList } from './emailListService'

/**
 * CSV import pipeline with column mapping + duplicate handling.
 */

const SUBSCRIBER_FIELDS = [
  'email', 'first_name', 'last_name', 'organization', 'title',
  'industry', 'phone', 'linkedin_url',
]

const ALIASES = {
  email: ['email', 'email address', 'e-mail', 'work email'],
  first_name: ['first name', 'firstname', 'given name', 'fname'],
  last_name: ['last name', 'lastname', 'surname', 'family name', 'lname'],
  organization: ['organization', 'organisation', 'company', 'company name', 'employer'],
  title: ['title', 'job title', 'position', 'role'],
  industry: ['industry', 'sector', 'vertical'],
  phone: ['phone', 'phone number', 'telephone', 'mobile', 'cell'],
  linkedin_url: ['linkedin', 'linkedin url', 'linkedin profile'],
}

/** Parse a CSV string into array-of-objects with original headers preserved. */
export function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(l => l.length > 0)
  if (lines.length === 0) return { headers: [], rows: [] }
  const headers = splitCsvLine(lines[0]).map(h => h.trim())
  const rows = lines.slice(1).map(line => {
    const cells = splitCsvLine(line)
    const row = {}
    headers.forEach((h, i) => { row[h] = (cells[i] || '').trim() })
    return row
  })
  return { headers, rows }
}

/** Minimal CSV splitter that handles double-quoted cells. */
function splitCsvLine(line) {
  const cells = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      cells.push(cur); cur = ''
    } else {
      cur += ch
    }
  }
  cells.push(cur)
  return cells
}

/** Fuzzy auto-mapping of CSV headers → subscriber fields. */
export function autoMapColumns(headers) {
  const map = {}
  headers.forEach(h => {
    const lower = h.toLowerCase().trim()
    for (const field of SUBSCRIBER_FIELDS) {
      if (ALIASES[field]?.some(a => lower === a || lower.includes(a))) {
        map[h] = field
        return
      }
    }
    map[h] = null // unmapped
  })
  return map
}

/**
 * Execute the import. Returns a summary and per-row error list.
 *
 * @param rows parsed CSV rows
 * @param columnMap { csvHeader: subscriberField | null }
 * @param options { listIds, tags, duplicateAction: 'skip' | 'update', unsubscribedAction: 'skip' | 'resub', propertyId }
 * @param onProgress callback fn(done, total)
 */
export async function runImport(rows, columnMap, options, onProgress) {
  const summary = {
    total: rows.length,
    added: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  }

  const { listIds = [], tags = [], duplicateAction = 'update', unsubscribedAction = 'skip', propertyId } = options

  // Preload suppression list
  const { data: suppressedRows } = await supabase.from('email_suppression_list').select('email')
  const suppressed = new Set((suppressedRows || []).map(r => r.email.toLowerCase()))

  const createdIds = []

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i]
    const fields = { tags, source: 'import', property_id: propertyId }
    for (const [csvHeader, subField] of Object.entries(columnMap)) {
      if (subField && raw[csvHeader]) fields[subField] = raw[csvHeader]
    }
    // Validate email
    if (!fields.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
      summary.failed++
      summary.errors.push({ row: i + 2, reason: 'invalid_email', value: fields.email })
      continue
    }
    fields.email = fields.email.toLowerCase()

    // Suppression check
    if (suppressed.has(fields.email) && unsubscribedAction === 'skip') {
      summary.skipped++
      summary.errors.push({ row: i + 2, reason: 'suppressed' })
      continue
    }

    // Duplicate check
    const { data: existing } = await supabase
      .from('email_subscribers')
      .select('id, status, global_unsubscribe')
      .ilike('email', fields.email)
      .maybeSingle()

    if (existing) {
      if (existing.global_unsubscribe && unsubscribedAction === 'skip') {
        summary.skipped++
        continue
      }
      if (duplicateAction === 'skip') {
        summary.skipped++
        continue
      }
      // Update
      await supabase.from('email_subscribers').update(fields).eq('id', existing.id)
      createdIds.push(existing.id)
      summary.updated++
    } else {
      const { data: created, error } = await supabase
        .from('email_subscribers')
        .insert(fields)
        .select()
        .single()
      if (error) {
        summary.failed++
        summary.errors.push({ row: i + 2, reason: error.message })
        continue
      }
      createdIds.push(created.id)
      summary.added++
    }

    if (i % 10 === 0) onProgress?.(i + 1, rows.length)
  }

  // Bulk-add to target lists
  for (const lid of listIds) {
    await addSubscribersToList(lid, createdIds, 'import')
  }

  onProgress?.(rows.length, rows.length)
  return summary
}

/** Sample CSV for download. */
export const SAMPLE_CSV = `email,first_name,last_name,organization,title,industry,phone,linkedin_url
jane.smith@example.com,Jane,Smith,Example Conferences,Director of Sponsorships,conference_events,555-0100,https://linkedin.com/in/janesmith
bob.jones@sample.org,Bob,Jones,Sample Sports,VP Partnerships,minor_league_sports,555-0101,
`
