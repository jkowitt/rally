import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'

export type CMSContentType = 'text' | 'image' | 'html' | string

export interface CMSRow {
  key: string
  value: string | null
  draft_value: string | null
  content_type: CMSContentType
  published?: boolean
  updated_at?: string
  updated_by?: string
}

export interface CMSMediaRow {
  id: string
  file_name: string
  file_data: string
  mime_type: string
  alt_text: string | null
  page: string
  uploaded_by?: string
  created_at?: string
}

export interface CMSDraft {
  value: string
  type: CMSContentType
}

export interface CMSContextValue {
  editMode: boolean
  canEdit: boolean
  setEditMode: (v: boolean) => void
  content: Record<string, CMSRow>
  media: CMSMediaRow[]
  getValue: (key: string, fallback?: string) => string
  getImage: (key: string, fallback?: string) => string
  setDraft: (key: string, value: string, contentType?: CMSContentType) => void
  drafts: Record<string, CMSDraft>
  hasUnsaved: boolean
  publishAll: () => Promise<number | undefined>
  saveDrafts: () => Promise<number>
  discardDrafts: () => void
  uploadImage: (file: File, page?: string) => Promise<CMSMediaRow>
  deleteImage: (id: string) => Promise<void>
}

const CMSContext = createContext<CMSContextValue | null>(null)

export function CMSProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  const isDev = profile?.role === 'developer'
  const queryClient = useQueryClient()
  const [editMode, setEditMode] = useState<boolean>(false)
  const [drafts, setDrafts] = useState<Record<string, CMSDraft>>({})
  const [hasUnsaved, setHasUnsaved] = useState<boolean>(false)

  // Load all content from DB
  const { data: content } = useQuery<Record<string, CMSRow>>({
    queryKey: ['cms-content'],
    queryFn: async () => {
      const { data } = await supabase.from('ui_content').select('*')
      const map: Record<string, CMSRow> = {}
      for (const row of (data || []) as CMSRow[]) {
        map[row.key] = row
      }
      return map
    },
    staleTime: 60000,
  })

  // Load media
  const { data: media } = useQuery<CMSMediaRow[]>({
    queryKey: ['cms-media'],
    queryFn: async () => {
      const { data } = await supabase.from('cms_media').select('*').order('created_at', { ascending: false })
      return (data || []) as CMSMediaRow[]
    },
    staleTime: 60000,
  })

  // Get content value (draft if in edit mode, published otherwise)
  const getValue = useCallback((key: string, fallback = ''): string => {
    if (editMode && drafts[key] !== undefined) return drafts[key].value
    const row = content?.[key]
    if (!row) return fallback
    if (editMode && row.draft_value) return row.draft_value
    return row.value || fallback
  }, [content, drafts, editMode])

  // Get image URL from media
  const getImage = useCallback((key: string, fallback = ''): string => {
    const row = content?.[key]
    if (row?.content_type === 'image' && row.value) return row.value
    return fallback
  }, [content])

  // Set draft value
  const setDraft = useCallback((key: string, value: string, contentType: CMSContentType = 'text') => {
    setDrafts(prev => ({ ...prev, [key]: { value, type: contentType } }))
    setHasUnsaved(true)
  }, [])

  // Publish all drafts
  const publishAll = useCallback(async (): Promise<number | undefined> => {
    const entries = Object.entries(drafts)
    if (entries.length === 0) return

    for (const [key, { value, type }] of entries) {
      const existing = content?.[key]
      if (existing) {
        await supabase.from('ui_content').update({
          value,
          draft_value: null,
          content_type: type,
          published: true,
          updated_at: new Date().toISOString(),
          updated_by: profile?.id,
        }).eq('key', key)
      } else {
        await supabase.from('ui_content').insert({
          key,
          value,
          content_type: type,
          published: true,
          updated_by: profile?.id,
        })
      }
    }

    setDrafts({})
    setHasUnsaved(false)
    queryClient.invalidateQueries({ queryKey: ['cms-content'] })
    return entries.length
  }, [drafts, content, profile?.id, queryClient])

  // Save as draft (don't publish)
  const saveDrafts = useCallback(async (): Promise<number> => {
    const entries = Object.entries(drafts)
    for (const [key, { value, type }] of entries) {
      const existing = content?.[key]
      if (existing) {
        await supabase.from('ui_content').update({
          draft_value: value,
          content_type: type,
          updated_at: new Date().toISOString(),
          updated_by: profile?.id,
        }).eq('key', key)
      } else {
        await supabase.from('ui_content').insert({
          key,
          draft_value: value,
          value: '',
          content_type: type,
          published: false,
          updated_by: profile?.id,
        })
      }
    }
    queryClient.invalidateQueries({ queryKey: ['cms-content'] })
    return entries.length
  }, [drafts, content, profile?.id, queryClient])

  // Discard all drafts
  const discardDrafts = useCallback(() => {
    setDrafts({})
    setHasUnsaved(false)
  }, [])

  // Upload image
  const uploadImage = useCallback(async (file: File, page = 'general'): Promise<CMSMediaRow> => {
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.readAsDataURL(file)
    })

    const { data, error } = await supabase.from('cms_media').insert({
      file_name: file.name,
      file_data: base64,
      mime_type: file.type,
      alt_text: file.name.replace(/\.[^.]+$/, ''),
      page,
      uploaded_by: profile?.id,
    }).select().single()

    if (error) throw error
    queryClient.invalidateQueries({ queryKey: ['cms-media'] })
    return data as CMSMediaRow
  }, [profile?.id, queryClient])

  // Delete image
  const deleteImage = useCallback(async (id: string): Promise<void> => {
    await supabase.from('cms_media').delete().eq('id', id)
    queryClient.invalidateQueries({ queryKey: ['cms-media'] })
  }, [queryClient])

  const value: CMSContextValue = {
    editMode: !!(isDev && editMode),
    canEdit: !!isDev,
    setEditMode,
    content: content || {},
    media: media || [],
    getValue,
    getImage,
    setDraft,
    drafts,
    hasUnsaved,
    publishAll,
    saveDrafts,
    discardDrafts,
    uploadImage,
    deleteImage,
  }

  return (
    <CMSContext.Provider value={value}>
      {children}
    </CMSContext.Provider>
  )
}

const EMPTY_CONTEXT: Partial<CMSContextValue> = {}

export function useCMS(): CMSContextValue | Partial<CMSContextValue> {
  return useContext(CMSContext) || EMPTY_CONTEXT
}
