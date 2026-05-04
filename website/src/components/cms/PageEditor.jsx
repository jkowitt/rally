import { useEffect, useCallback, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useCMS } from '@/hooks/useCMS'

// Format toolbar that appears above the selected element
function FormatToolbar({ target, onClose }) {
  const [pos, setPos] = useState({ top: 0, left: 0 })
  // showSection used to be declared AFTER the early-return below.
  // That violated the rules of hooks: when target was null, this
  // useState wasn't called → on next render with target present
  // it WAS, so React saw a different hook count and crashed.
  // Moved above the early-return.
  const [showSection, setShowSection] = useState(false)
  const { setDraft, uploadImage } = useCMS()
  const fileRef = useRef(null)

  useEffect(() => {
    if (!target) return
    const rect = target.getBoundingClientRect()
    setPos({ top: rect.top + window.scrollY - 44, left: Math.max(8, rect.left + rect.width / 2 - 200) })
  }, [target])

  if (!target) return null

  const isImage = target.tagName?.toLowerCase() === 'img'
  const computed = window.getComputedStyle(target)

  // Find the nearest section/container parent
  const section = target.closest('section, [class*="bg-bg"], [class*="rounded-lg"], [class*="border"]') || target.parentElement

  function applyStyle(prop, value) {
    target.style[prop] = value
  }

  function applySectionStyle(prop, value) {
    if (section) section.style[prop] = value
  }

  function getElementKey(el) {
    const parts = []
    let node = el
    while (node && node !== document.body) {
      const tag = node.tagName?.toLowerCase()
      if (!tag) break
      const siblings = node.parentNode ? Array.from(node.parentNode.children).filter(c => c.tagName === node.tagName) : []
      const idx = siblings.indexOf(node)
      parts.unshift(`${tag}${siblings.length > 1 ? `[${idx}]` : ''}`)
      node = node.parentNode
    }
    return `style:${window.location.pathname}:${parts.join('/')}`
  }

  function saveStyles() {
    const key = getElementKey(target)
    const styles = {}
    if (target.style.fontSize) styles.fontSize = target.style.fontSize
    if (target.style.color) styles.color = target.style.color
    if (target.style.fontWeight) styles.fontWeight = target.style.fontWeight
    if (target.style.fontStyle) styles.fontStyle = target.style.fontStyle
    if (target.style.textAlign) styles.textAlign = target.style.textAlign
    if (target.style.textDecoration) styles.textDecoration = target.style.textDecoration
    if (target.style.width) styles.width = target.style.width
    if (target.style.maxWidth) styles.maxWidth = target.style.maxWidth
    if (target.style.opacity) styles.opacity = target.style.opacity
    if (Object.keys(styles).length > 0) {
      setDraft(key, JSON.stringify(styles), 'json')
    }
  }

  function saveSectionStyles() {
    if (!section) return
    const key = getElementKey(section) + ':section'
    const styles = {}
    if (section.style.backgroundColor) styles.backgroundColor = section.style.backgroundColor
    if (section.style.padding) styles.padding = section.style.padding
    if (section.style.paddingTop) styles.paddingTop = section.style.paddingTop
    if (section.style.paddingBottom) styles.paddingBottom = section.style.paddingBottom
    if (section.style.margin) styles.margin = section.style.margin
    if (section.style.marginTop) styles.marginTop = section.style.marginTop
    if (section.style.marginBottom) styles.marginBottom = section.style.marginBottom
    if (section.style.borderRadius) styles.borderRadius = section.style.borderRadius
    if (section.style.borderColor) styles.borderColor = section.style.borderColor
    if (Object.keys(styles).length > 0) {
      setDraft(key, JSON.stringify(styles), 'json')
    }
  }

  async function handleImageReplace(e) {
    const file = e.target.files?.[0]
    if (!file || !isImage) return
    try {
      const media = await uploadImage(file)
      target.src = media.file_data
      const key = getElementKey(target) + ':src'
      setDraft(key, media.file_data, 'image')
    } catch (err) { console.error(err) }
    if (fileRef.current) fileRef.current.value = ''
  }

  return createPortal(
    <div
      className="fixed z-[9999] bg-bg-surface border border-accent/30 rounded-lg shadow-xl px-2 py-1.5 flex items-center gap-1 flex-wrap"
      style={{ top: pos.top, left: pos.left, maxWidth: 420 }}
    >
      {!isImage ? (
        <>
          {/* Font size */}
          <select
            defaultValue={parseInt(computed.fontSize) || 14}
            onChange={(e) => { applyStyle('fontSize', e.target.value + 'px'); saveStyles() }}
            className="bg-bg-card border border-border rounded px-1.5 py-1 text-[10px] text-text-primary focus:outline-none w-14"
          >
            {[10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48, 56, 64, 72].map(s => (
              <option key={s} value={s}>{s}px</option>
            ))}
          </select>

          {/* Text color */}
          <input
            type="color"
            defaultValue={rgbToHex(computed.color)}
            onChange={(e) => { applyStyle('color', e.target.value); saveStyles() }}
            className="w-6 h-6 rounded border border-border cursor-pointer"
            title="Text color"
          />

          {/* Bold */}
          <button
            onClick={() => { applyStyle('fontWeight', computed.fontWeight === '700' || computed.fontWeight === 'bold' ? 'normal' : 'bold'); saveStyles() }}
            className={`w-6 h-6 flex items-center justify-center rounded text-xs font-bold ${computed.fontWeight === '700' || computed.fontWeight === 'bold' ? 'bg-accent text-bg-primary' : 'bg-bg-card text-text-secondary'}`}
            title="Bold"
          >B</button>

          {/* Italic */}
          <button
            onClick={() => { applyStyle('fontStyle', computed.fontStyle === 'italic' ? 'normal' : 'italic'); saveStyles() }}
            className={`w-6 h-6 flex items-center justify-center rounded text-xs italic ${computed.fontStyle === 'italic' ? 'bg-accent text-bg-primary' : 'bg-bg-card text-text-secondary'}`}
            title="Italic"
          >I</button>

          {/* Underline */}
          <button
            onClick={() => { applyStyle('textDecoration', computed.textDecoration.includes('underline') ? 'none' : 'underline'); saveStyles() }}
            className={`w-6 h-6 flex items-center justify-center rounded text-xs underline ${computed.textDecoration.includes('underline') ? 'bg-accent text-bg-primary' : 'bg-bg-card text-text-secondary'}`}
            title="Underline"
          >U</button>

          <div className="w-px h-5 bg-border mx-0.5" />

          {/* Alignment */}
          {['left', 'center', 'right'].map(align => (
            <button
              key={align}
              onClick={() => { applyStyle('textAlign', align); saveStyles() }}
              className={`w-6 h-6 flex items-center justify-center rounded text-[10px] ${computed.textAlign === align ? 'bg-accent text-bg-primary' : 'bg-bg-card text-text-secondary'}`}
              title={`Align ${align}`}
            >
              {align === 'left' ? '≡' : align === 'center' ? '≡' : '≡'}
            </button>
          ))}
        </>
      ) : (
        <>
          {/* Image controls */}
          <button onClick={() => fileRef.current?.click()} className="text-[10px] text-accent hover:underline px-2 py-1">Replace image</button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleImageReplace} className="hidden" />
          <div className="w-px h-5 bg-border mx-0.5" />
          {/* Width control */}
          <select
            defaultValue=""
            onChange={(e) => { if (e.target.value) { applyStyle('width', e.target.value); applyStyle('maxWidth', e.target.value); } else { target.style.width = ''; target.style.maxWidth = ''; } saveStyles() }}
            className="bg-bg-card border border-border rounded px-1.5 py-1 text-[10px] text-text-primary focus:outline-none w-20"
          >
            <option value="">Auto</option>
            <option value="50px">50px</option>
            <option value="80px">80px</option>
            <option value="120px">120px</option>
            <option value="160px">160px</option>
            <option value="200px">200px</option>
            <option value="300px">300px</option>
            <option value="400px">400px</option>
            <option value="100%">Full width</option>
            <option value="50%">50%</option>
          </select>
          {/* Opacity */}
          <input
            type="range" min="10" max="100" step="10"
            defaultValue={Math.round(parseFloat(computed.opacity || 1) * 100)}
            onChange={(e) => { applyStyle('opacity', e.target.value / 100); saveStyles() }}
            className="w-16 accent-accent"
            title="Opacity"
          />
        </>
      )}

      <div className="w-px h-5 bg-border mx-0.5" />

      {/* Section/container controls toggle */}
      <button
        onClick={() => setShowSection(!showSection)}
        className={`text-[10px] font-mono px-1.5 py-1 rounded ${showSection ? 'bg-accent text-bg-primary' : 'bg-bg-card text-text-secondary hover:text-text-primary'}`}
        title="Edit section/container styles"
      >
        ◻ Section
      </button>

      <button onClick={onClose} className="text-text-muted hover:text-text-primary text-xs px-1">✕</button>

      {/* Section controls panel */}
      {showSection && section && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-bg-surface border border-accent/30 rounded-lg shadow-xl p-2.5 flex items-center gap-2 flex-wrap">
          <span className="text-[9px] text-text-muted font-mono uppercase">Section:</span>

          {/* Background color */}
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-text-muted">BG</span>
            <input
              type="color"
              defaultValue={rgbToHex(window.getComputedStyle(section).backgroundColor)}
              onChange={(e) => { applySectionStyle('backgroundColor', e.target.value); saveSectionStyles() }}
              className="w-5 h-5 rounded border border-border cursor-pointer"
            />
            <button
              onClick={() => { section.style.backgroundColor = ''; saveSectionStyles() }}
              className="text-[8px] text-text-muted hover:text-text-primary"
              title="Reset background"
            >×</button>
          </div>

          <div className="w-px h-4 bg-border" />

          {/* Padding */}
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-text-muted">Pad</span>
            <select
              defaultValue=""
              onChange={(e) => { applySectionStyle('padding', e.target.value); saveSectionStyles() }}
              className="bg-bg-card border border-border rounded px-1 py-0.5 text-[9px] text-text-primary focus:outline-none w-14"
            >
              <option value="">—</option>
              <option value="0px">0</option>
              <option value="8px">8px</option>
              <option value="16px">16px</option>
              <option value="24px">24px</option>
              <option value="32px">32px</option>
              <option value="48px">48px</option>
              <option value="64px">64px</option>
              <option value="96px">96px</option>
            </select>
          </div>

          {/* Top/Bottom padding */}
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-text-muted">↕</span>
            <select
              defaultValue=""
              onChange={(e) => { applySectionStyle('paddingTop', e.target.value); applySectionStyle('paddingBottom', e.target.value); saveSectionStyles() }}
              className="bg-bg-card border border-border rounded px-1 py-0.5 text-[9px] text-text-primary focus:outline-none w-14"
            >
              <option value="">—</option>
              <option value="0px">0</option>
              <option value="8px">8px</option>
              <option value="16px">16px</option>
              <option value="24px">24px</option>
              <option value="32px">32px</option>
              <option value="48px">48px</option>
              <option value="64px">64px</option>
              <option value="96px">96px</option>
            </select>
          </div>

          <div className="w-px h-4 bg-border" />

          {/* Margin top/bottom */}
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-text-muted">Margin ↕</span>
            <select
              defaultValue=""
              onChange={(e) => { applySectionStyle('marginTop', e.target.value); applySectionStyle('marginBottom', e.target.value); saveSectionStyles() }}
              className="bg-bg-card border border-border rounded px-1 py-0.5 text-[9px] text-text-primary focus:outline-none w-14"
            >
              <option value="">—</option>
              <option value="0px">0</option>
              <option value="8px">8px</option>
              <option value="16px">16px</option>
              <option value="24px">24px</option>
              <option value="32px">32px</option>
              <option value="48px">48px</option>
              <option value="64px">64px</option>
            </select>
          </div>

          <div className="w-px h-4 bg-border" />

          {/* Border radius */}
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-text-muted">Radius</span>
            <select
              defaultValue=""
              onChange={(e) => { applySectionStyle('borderRadius', e.target.value); saveSectionStyles() }}
              className="bg-bg-card border border-border rounded px-1 py-0.5 text-[9px] text-text-primary focus:outline-none w-14"
            >
              <option value="">—</option>
              <option value="0px">0</option>
              <option value="4px">4px</option>
              <option value="8px">8px</option>
              <option value="12px">12px</option>
              <option value="16px">16px</option>
              <option value="24px">24px</option>
              <option value="9999px">Pill</option>
            </select>
          </div>

          {/* Border color */}
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-text-muted">Border</span>
            <input
              type="color"
              defaultValue={rgbToHex(window.getComputedStyle(section).borderColor)}
              onChange={(e) => { applySectionStyle('borderColor', e.target.value); applySectionStyle('borderWidth', '1px'); applySectionStyle('borderStyle', 'solid'); saveSectionStyles() }}
              className="w-5 h-5 rounded border border-border cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>,
    document.body
  )
}

function rgbToHex(rgb) {
  if (!rgb || rgb.startsWith('#')) return rgb || '#ffffff'
  const match = rgb.match(/\d+/g)
  if (!match || match.length < 3) return '#ffffff'
  return '#' + match.slice(0, 3).map(x => parseInt(x).toString(16).padStart(2, '0')).join('')
}

export default function PageEditor() {
  const { editMode, setDraft, content, getValue } = useCMS()
  const [activeEl, setActiveEl] = useState(null)
  const [formatTarget, setFormatTarget] = useState(null)

  // Generate a stable key for an element based on its position in the DOM
  function getElementKey(el) {
    const parts = []
    let node = el
    while (node && node !== document.body) {
      const tag = node.tagName?.toLowerCase()
      if (!tag) break
      const siblings = node.parentNode ? Array.from(node.parentNode.children).filter(c => c.tagName === node.tagName) : []
      const idx = siblings.indexOf(node)
      parts.unshift(`${tag}${siblings.length > 1 ? `[${idx}]` : ''}`)
      node = node.parentNode
    }
    // Use page path + element path as key
    return `page:${window.location.pathname}:${parts.join('/')}`
  }

  function isEditableElement(el) {
    if (!el || !el.tagName) return false
    const tag = el.tagName.toLowerCase()
    // Images are editable (resize, replace)
    if (tag === 'img') return true
    const editableTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'div', 'label', 'li', 'td', 'th']
    if (!editableTags.includes(tag)) return false
    if (el.closest('button, a, input, select, textarea, [contenteditable]')) return false
    const text = el.innerText?.trim()
    if (!text || text.length < 2 || text.length > 500) return false
    if (el.closest('form, [role="dialog"]')) return false
    return true
  }

  const handleClick = useCallback((e) => {
    if (!editMode) return
    const el = e.target
    if (!isEditableElement(el)) return

    e.preventDefault()
    e.stopPropagation()

    const isImage = el.tagName.toLowerCase() === 'img'

    // Show format toolbar for the element
    setFormatTarget(el)
    el.style.outline = '2px solid #E8B84B'
    el.style.outlineOffset = '2px'
    el.style.borderRadius = '4px'

    if (isImage) {
      setActiveEl(el)
      return // images handled by FormatToolbar only
    }

    const key = getElementKey(el)
    const originalText = el.innerText.trim()

    const cmsValue = getValue(key, null)
    if (cmsValue) el.innerText = cmsValue

    el.contentEditable = 'true'
    el.focus()
    setActiveEl(el)

    const range = document.createRange()
    range.selectNodeContents(el)
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(range)

    function handleBlur() {
      el.contentEditable = 'false'
      const newText = el.innerText.trim()
      if (newText !== originalText) {
        setDraft(key, newText, 'text')
      }
      el.removeEventListener('blur', handleBlur)
      el.removeEventListener('keydown', handleKeydown)
      setActiveEl(null)
    }

    function handleKeydown(e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); el.blur() }
      if (e.key === 'Escape') { el.innerText = originalText; el.blur() }
    }

    el.addEventListener('blur', handleBlur)
    el.addEventListener('keydown', handleKeydown)
  }, [editMode, setDraft, getValue])

  // Add hover highlight for editable elements
  const handleMouseOver = useCallback((e) => {
    if (!editMode || activeEl) return
    const el = e.target
    if (isEditableElement(el)) {
      el.style.outline = '1px dashed rgba(232, 184, 75, 0.3)'
      el.style.outlineOffset = '2px'
      el.style.cursor = 'text'
    }
  }, [editMode, activeEl])

  const handleMouseOut = useCallback((e) => {
    if (!editMode) return
    const el = e.target
    if (el !== activeEl) {
      el.style.outline = ''
      el.style.outlineOffset = ''
      el.style.cursor = ''
    }
  }, [editMode, activeEl])

  useEffect(() => {
    if (!editMode) return
    document.addEventListener('click', handleClick, true)
    document.addEventListener('mouseover', handleMouseOver, true)
    document.addEventListener('mouseout', handleMouseOut, true)
    return () => {
      document.removeEventListener('click', handleClick, true)
      document.removeEventListener('mouseover', handleMouseOver, true)
      document.removeEventListener('mouseout', handleMouseOut, true)
    }
  }, [editMode, handleClick, handleMouseOver, handleMouseOut])

  // Apply saved CMS content overrides to the page
  useEffect(() => {
    if (editMode) return // don't apply while editing
    const prefix = `page:${window.location.pathname}:`
    const overrides = Object.entries(content || {}).filter(([key]) => key.startsWith(prefix))
    // This is a best-effort approach — it won't work perfectly for dynamic content
    // but handles static text well
  }, [content, editMode])

  function closeToolbar() {
    if (formatTarget) {
      formatTarget.style.outline = ''
      formatTarget.style.outlineOffset = ''
      formatTarget.style.borderRadius = ''
    }
    setFormatTarget(null)
    setActiveEl(null)
  }

  // Close toolbar when clicking outside
  useEffect(() => {
    if (!formatTarget) return
    function handleOutsideClick(e) {
      if (formatTarget.contains(e.target)) return
      if (e.target.closest('[class*="FormatToolbar"], [class*="z-\\[9999\\]"]')) return
      // Don't close if clicking the toolbar itself
      const toolbar = document.querySelector('[class*="z-\\[9999\\]"]')
      if (toolbar?.contains(e.target)) return
    }
    // Use a timeout to avoid closing immediately
    const timer = setTimeout(() => {
      document.addEventListener('click', handleOutsideClick)
    }, 100)
    return () => { clearTimeout(timer); document.removeEventListener('click', handleOutsideClick) }
  }, [formatTarget])

  return <FormatToolbar target={formatTarget} onClose={closeToolbar} />
}
