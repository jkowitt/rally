// Generate iCal (.ics) content from events
export function generateICalEvent(event) {
  const dtStart = formatICalDate(event.event_date)
  const dtEnd = formatICalDate(event.event_date, 120) // 2 hour default
  const uid = event.id + '@loud-legacy.com'

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Loud CRM//Sports Events//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcal(event.name)}`,
    event.venue ? `LOCATION:${escapeIcal(event.venue)}` : '',
    event.notes ? `DESCRIPTION:${escapeIcal(event.notes)}` : '',
    `STATUS:${event.status === 'Confirmed' ? 'CONFIRMED' : 'TENTATIVE'}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n')
}

export function generateICalFeed(events) {
  const vevents = events.map(event => {
    const dtStart = formatICalDate(event.event_date)
    const dtEnd = formatICalDate(event.event_date, 120)
    return [
      'BEGIN:VEVENT',
      `UID:${event.id}@loud-legacy.com`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${escapeIcal(event.name)}`,
      event.venue ? `LOCATION:${escapeIcal(event.venue)}` : '',
      event.notes ? `DESCRIPTION:${escapeIcal(event.notes)}` : '',
      'END:VEVENT',
    ].filter(Boolean).join('\r\n')
  }).join('\r\n')

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Loud CRM//Sports Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Loud CRM Events',
    vevents,
    'END:VCALENDAR',
  ].join('\r\n')
}

export function downloadIcal(content, filename) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || 'event.ics'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function formatICalDate(dateStr, addMinutes = 0) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (addMinutes) d.setMinutes(d.getMinutes() + addMinutes)
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function escapeIcal(str) {
  return (str || '').replace(/[\;,\n]/g, (m) => {
    if (m === '\n') return '\\n'
    return '\\' + m
  })
}
