// PDF text extraction with OCR fallback. Extracted from ContractManager
// so any caller (contract upload, document parser, future digest tools)
// can reuse it without dragging in 30k LOC of contract-specific UI.
//
// Pipeline:
// 1. Try embedded text via pdfjs-dist getTextContent() — fast and exact.
// 2. If the PDF is scanned (no embedded text), fall back to Tesseract.js
//    OCR. Capped at 10 pages so we don't hang the tab on a 200-page scan.
//
// onStatus(msg) is optional — useful for showing progress in a UI.
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.js?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

const OCR_PAGE_CAP = 10

export async function extractPdfText(arrayBuffer, onStatus) {
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise
  let text = ''

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    text += content.items.map(item => item.str).join(' ') + '\n\n'
  }

  if (text.trim().length > 20) return text.trim()

  // Scanned doc path — OCR with Tesseract
  if (onStatus) onStatus('Scanned PDF detected — running OCR...')
  try {
    const { createWorker } = await import('tesseract.js')
    const worker = await createWorker('eng')
    let ocrText = ''

    const pageCount = Math.min(pdf.numPages, OCR_PAGE_CAP)
    for (let i = 1; i <= pageCount; i++) {
      if (onStatus) onStatus(`OCR: reading page ${i} of ${pageCount}...`)
      const page = await pdf.getPage(i)
      const viewport = page.getViewport({ scale: 2 })
      const canvas = document.createElement('canvas')
      canvas.width = viewport.width
      canvas.height = viewport.height
      const ctx = canvas.getContext('2d')
      await page.render({ canvasContext: ctx, viewport }).promise
      const { data } = await worker.recognize(canvas)
      ocrText += data.text + '\n\n'
    }

    await worker.terminate()
    return ocrText.trim()
  } catch (err) {
    console.warn('OCR failed:', err.message)
    return text.trim()
  }
}

export { pdfjsLib }
