import { useState, useRef, useEffect } from 'react'
import { useCMS } from '@/hooks/useCMS'

// Inline editable text — renders as normal text, becomes editable in edit mode
export default function EditableText({ contentKey, fallback, tag: Tag = 'span', className, multiline }) {
  const { editMode, getValue, setDraft } = useCMS()
  const [editing, setEditing] = useState(false)
  const ref = useRef(null)
  const value = getValue(contentKey, fallback)

  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus()
      // Move cursor to end
      const range = document.createRange()
      range.selectNodeContents(ref.current)
      range.collapse(false)
      const sel = window.getSelection()
      sel.removeAllRanges()
      sel.addRange(range)
    }
  }, [editing])

  if (!editMode) {
    return <Tag className={className}>{value}</Tag>
  }

  return (
    <Tag
      ref={ref}
      className={`${className} ${editing ? 'outline outline-2 outline-accent/50 outline-offset-2 rounded' : 'cursor-pointer hover:outline hover:outline-1 hover:outline-accent/30 hover:outline-offset-2 hover:rounded'}`}
      contentEditable={editing}
      suppressContentEditableWarning
      onClick={() => !editing && setEditing(true)}
      onBlur={(e) => {
        const newValue = e.target.innerText.trim()
        if (newValue !== value) setDraft(contentKey, newValue, 'text')
        setEditing(false)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !multiline) { e.preventDefault(); e.target.blur() }
        if (e.key === 'Escape') { e.target.innerText = value; setEditing(false) }
      }}
    >
      {value}
    </Tag>
  )
}

// Inline editable image — shows image, click to replace in edit mode
export function EditableImage({ contentKey, fallback, className, alt }) {
  const { editMode, getValue, setDraft, uploadImage } = useCMS()
  const fileRef = useRef(null)
  const value = getValue(contentKey, fallback)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const media = await uploadImage(file)
      setDraft(contentKey, media.file_data, 'image')
    } catch (err) {
      console.error('Image upload failed:', err)
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  if (!editMode) {
    return value ? <img src={value} alt={alt || ''} className={className} /> : null
  }

  return (
    <div className="relative group inline-block">
      {value ? (
        <img src={value} alt={alt || ''} className={`${className} cursor-pointer`} onClick={() => fileRef.current?.click()} />
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          className={`${className} border-2 border-dashed border-accent/30 rounded flex items-center justify-center text-accent/50 hover:border-accent hover:text-accent transition-colors`}
          style={{ minHeight: 60, minWidth: 100 }}
        >
          + Image
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      {editMode && value && (
        <button
          onClick={() => setDraft(contentKey, '', 'image')}
          className="absolute -top-2 -right-2 w-5 h-5 bg-danger text-white text-[10px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
        >
          ×
        </button>
      )}
    </div>
  )
}
