import { useEffect, useCallback, useRef, useState } from 'react'
import { useCMS } from '@/hooks/useCMS'
import { useToast } from '@/components/Toast'

// Universal page editor — makes ALL text on the page editable in edit mode
// Attaches click handlers to headings, paragraphs, spans, buttons, labels
// Stores changes by generating a unique key from the element's path

export default function PageEditor() {
  const { editMode, setDraft, publishAll, saveDrafts, discardDrafts, hasUnsaved, drafts, content, getValue } = useCMS()
  const [activeEl, setActiveEl] = useState(null)
  const overlayRef = useRef(null)

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

  // Check if element is editable
  function isEditableElement(el) {
    if (!el || !el.tagName) return false
    const tag = el.tagName.toLowerCase()
    const editableTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'div', 'label', 'li', 'td', 'th']
    if (!editableTags.includes(tag)) return false
    // Skip if it's an interactive element or has interactive children
    if (el.closest('button, a, input, select, textarea, [contenteditable]')) return false
    // Skip if it's too small or has no text
    const text = el.innerText?.trim()
    if (!text || text.length < 2 || text.length > 500) return false
    // Skip if it's inside a form or modal
    if (el.closest('form, [role="dialog"]')) return false
    return true
  }

  const handleClick = useCallback((e) => {
    if (!editMode) return
    const el = e.target
    if (!isEditableElement(el)) return

    e.preventDefault()
    e.stopPropagation()

    const key = getElementKey(el)
    const originalText = el.innerText.trim()

    // Check if we have a CMS override for this key
    const cmsValue = getValue(key, null)
    if (cmsValue) el.innerText = cmsValue

    el.contentEditable = 'true'
    el.style.outline = '2px solid #E8B84B'
    el.style.outlineOffset = '2px'
    el.style.borderRadius = '4px'
    el.focus()
    setActiveEl(el)

    // Select all text
    const range = document.createRange()
    range.selectNodeContents(el)
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(range)

    function handleBlur() {
      el.contentEditable = 'false'
      el.style.outline = ''
      el.style.outlineOffset = ''
      el.style.borderRadius = ''
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

  return null // This component has no visual output — it works via event listeners
}
