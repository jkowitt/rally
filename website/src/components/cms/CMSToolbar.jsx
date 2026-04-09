import { useState, useRef } from 'react'
import { useCMS } from '@/hooks/useCMS'
import { useToast } from '@/components/Toast'

export default function CMSToolbar() {
  const { editMode, canEdit, setEditMode, hasUnsaved, drafts, publishAll, saveDrafts, discardDrafts, media, uploadImage, deleteImage } = useCMS()
  const { toast } = useToast()
  const [showMedia, setShowMedia] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const fileRef = useRef(null)
  const draftCount = Object.keys(drafts).length

  if (!canEdit) return null

  // Edit mode toggle button (always visible for developers)
  if (!editMode) {
    return (
      <button
        onClick={() => setEditMode(true)}
        className="fixed top-16 right-4 z-50 bg-accent text-bg-primary px-3 py-1.5 rounded shadow-lg text-[10px] font-mono font-medium hover:opacity-90 transition-opacity"
      >
        Edit Mode
      </button>
    )
  }

  return (
    <>
      {/* Bottom toolbar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-bg-surface border-t border-accent/30 px-4 py-2.5 flex items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-accent uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
            Edit Mode
          </span>
          {draftCount > 0 && (
            <span className="text-[10px] font-mono text-warning bg-warning/10 px-2 py-0.5 rounded">
              {draftCount} unsaved change{draftCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Media library */}
          <button
            onClick={() => setShowMedia(!showMedia)}
            className="text-[10px] font-mono text-text-secondary hover:text-text-primary border border-border rounded px-3 py-1.5 hover:border-accent/50 transition-colors"
          >
            📁 Media
          </button>

          {/* Discard */}
          {hasUnsaved && (
            <button
              onClick={() => { discardDrafts(); toast({ title: 'Changes discarded', type: 'warning' }) }}
              className="text-[10px] font-mono text-danger hover:bg-danger/10 border border-danger/30 rounded px-3 py-1.5 transition-colors"
            >
              Discard
            </button>
          )}

          {/* Save draft */}
          {hasUnsaved && (
            <button
              onClick={async () => {
                const count = await saveDrafts()
                toast({ title: `${count} draft${count !== 1 ? 's' : ''} saved`, type: 'success' })
              }}
              className="text-[10px] font-mono text-text-secondary hover:text-text-primary border border-border rounded px-3 py-1.5 hover:border-accent/50 transition-colors"
            >
              Save Draft
            </button>
          )}

          {/* Publish */}
          <button
            onClick={async () => {
              if (draftCount === 0) { toast({ title: 'No changes to publish', type: 'warning' }); return }
              setPublishing(true)
              const count = await publishAll()
              toast({ title: `${count} change${count !== 1 ? 's' : ''} published!`, type: 'success' })
              setPublishing(false)
            }}
            disabled={draftCount === 0 || publishing}
            className="text-[10px] font-mono bg-accent text-bg-primary rounded px-4 py-1.5 font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {publishing ? 'Publishing...' : `Publish (${draftCount})`}
          </button>

          {/* Exit edit mode */}
          <button
            onClick={() => {
              if (hasUnsaved && !confirm('You have unsaved changes. Exit edit mode?')) return
              setEditMode(false)
              discardDrafts()
            }}
            className="text-[10px] font-mono text-text-muted hover:text-text-primary border border-border rounded px-3 py-1.5 transition-colors"
          >
            Exit ✕
          </button>
        </div>
      </div>

      {/* Media Library Panel */}
      {showMedia && (
        <div className="fixed bottom-12 right-4 z-50 w-80 max-h-[400px] bg-bg-surface border border-border rounded-lg shadow-xl overflow-hidden">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <span className="text-xs font-mono text-text-muted uppercase">Media Library</span>
            <div className="flex gap-2">
              <button
                onClick={() => fileRef.current?.click()}
                className="text-[10px] text-accent hover:underline"
              >
                + Upload
              </button>
              <button onClick={() => setShowMedia(false)} className="text-text-muted hover:text-text-primary text-sm">×</button>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            try {
              await uploadImage(file)
              toast({ title: 'Image uploaded', type: 'success' })
            } catch { toast({ title: 'Upload failed', type: 'error' }) }
            if (fileRef.current) fileRef.current.value = ''
          }} className="hidden" />
          <div className="p-3 overflow-y-auto max-h-[340px]">
            {media.length === 0 ? (
              <div className="text-center text-text-muted text-xs py-8">No media uploaded yet</div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {media.map(m => (
                  <div key={m.id} className="relative group">
                    <img
                      src={m.file_data}
                      alt={m.alt_text || m.file_name}
                      className="w-full h-20 object-cover rounded border border-border cursor-pointer hover:border-accent transition-colors"
                      onClick={() => {
                        navigator.clipboard.writeText(m.file_data.slice(0, 50) + '...')
                        toast({ title: 'Image ID copied', type: 'success' })
                      }}
                    />
                    <button
                      onClick={() => { if (confirm('Delete this image?')) deleteImage(m.id) }}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-danger text-white text-[8px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      ×
                    </button>
                    <div className="text-[8px] text-text-muted truncate mt-0.5">{m.file_name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Spacer so content doesn't hide behind toolbar */}
      <div className="h-12" />
    </>
  )
}
