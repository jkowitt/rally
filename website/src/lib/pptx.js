import PptxGenJS from 'pptxgenjs'

// Generate a fulfillment recap PowerPoint
export function generateFulfillmentReport({ dealName, logoUrl, benefits, deliveredItems, dateRange }) {
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_16x9'
  pptx.author = 'Loud CRM'
  pptx.company = 'Loud CRM'
  pptx.subject = `${dealName} Fulfillment Recap`

  const gold = 'E8B84B'
  const dark = '080A0F'
  const surface = '0F1218'
  const textLight = 'F0F2F8'
  const textMuted = '8B92A8'

  // SLIDE 1: Title
  const slide1 = pptx.addSlide()
  slide1.background = { color: dark }
  slide1.addText(dealName, { x: 0.8, y: 1.5, w: 8.4, h: 1.2, fontSize: 36, color: textLight, bold: true, fontFace: 'Arial' })
  slide1.addText('Sponsorship Fulfillment Recap', { x: 0.8, y: 2.8, w: 8.4, h: 0.6, fontSize: 18, color: gold, fontFace: 'Arial' })
  slide1.addText(dateRange || new Date().getFullYear().toString(), { x: 0.8, y: 3.5, w: 8.4, h: 0.5, fontSize: 14, color: textMuted, fontFace: 'Arial' })
  if (logoUrl) {
    try { slide1.addImage({ path: logoUrl, x: 7.5, y: 0.5, w: 2, h: 1.2 }) } catch (e) { console.warn(e) }
  }
  slide1.addText('LOUD CRM', { x: 0.8, y: 6.5, w: 3, h: 0.4, fontSize: 10, color: textMuted, fontFace: 'Courier New' })

  // SLIDE 2: Summary
  const slide2 = pptx.addSlide()
  slide2.background = { color: dark }
  slide2.addText('Fulfillment Summary', { x: 0.5, y: 0.3, w: 9, h: 0.8, fontSize: 24, color: textLight, bold: true, fontFace: 'Arial' })

  const totalBenefits = benefits?.length || 0
  const totalDelivered = deliveredItems?.length || 0
  const pct = totalBenefits > 0 ? Math.round((totalDelivered / totalBenefits) * 100) : 0

  const summaryRows = [
    ['Metric', 'Value'],
    ['Total Benefits', String(totalBenefits)],
    ['Delivered', String(totalDelivered)],
    ['Completion', `${pct}%`],
  ]
  slide2.addTable(summaryRows, {
    x: 0.5, y: 1.5, w: 4, fontFace: 'Arial', fontSize: 14,
    color: textLight, border: { pt: 1, color: '1E2435' },
    rowH: 0.5,
    colW: [2.5, 1.5],
    autoPage: false,
  })

  // SLIDE 3+: Benefits detail
  if (benefits?.length > 0) {
    const slide3 = pptx.addSlide()
    slide3.background = { color: dark }
    slide3.addText('Benefits & Deliverables', { x: 0.5, y: 0.3, w: 9, h: 0.8, fontSize: 24, color: textLight, bold: true, fontFace: 'Arial' })

    const rows = [['Benefit', 'Qty', 'Status']]
    benefits.forEach(b => {
      const delivered = deliveredItems?.some(d => d.benefit_id === b.id)
      rows.push([
        b.benefit_description || 'Benefit',
        String(b.quantity || 1),
        delivered ? 'Delivered' : 'Pending',
      ])
    })

    slide3.addTable(rows, {
      x: 0.5, y: 1.3, w: 9, fontFace: 'Arial', fontSize: 11,
      color: textLight, border: { pt: 1, color: '1E2435' },
      rowH: 0.4, colW: [5.5, 1, 2.5],
      autoPage: true, autoPageRepeatHeader: true,
    })
  }

  // FINAL SLIDE: Thank you
  const slideLast = pptx.addSlide()
  slideLast.background = { color: dark }
  slideLast.addText('Thank You', { x: 0.5, y: 2, w: 9, h: 1, fontSize: 36, color: gold, bold: true, align: 'center', fontFace: 'Arial' })
  slideLast.addText(`${dealName} — ${dateRange || new Date().getFullYear()}`, { x: 0.5, y: 3.2, w: 9, h: 0.6, fontSize: 16, color: textMuted, align: 'center', fontFace: 'Arial' })
  if (logoUrl) {
    try { slideLast.addImage({ path: logoUrl, x: 4, y: 4, w: 2, h: 1.2 }) } catch (e) { console.warn(e) }
  }
  slideLast.addText('Powered by LOUD CRM', { x: 0.5, y: 6.5, w: 9, h: 0.4, fontSize: 10, color: textMuted, align: 'center', fontFace: 'Courier New' })

  return pptx
}
