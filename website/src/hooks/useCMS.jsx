import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'

const CMSContext = createContext(null)

export function CMSProvider({ children }) {
  const { profile } = useAuth()
  const isDev = profile?.role === 'developer'
  const queryClient = useQueryClient()
  const [editMode, setEditMode] = useState(false)
  const [drafts, setDrafts] = useState({}) // { key: { value, type } }
  const [hasUnsaved, setHasUnsaved] = useState(false)

  // Load all content from DB
  const { data: content } = useQuery({
    queryKey: ['cms-content'],
    queryFn: async () => {
      const { data } = await supabase.from('ui_content').select('*')
      const map = {}
      for (const row of (data || [])) {
        map[row.key] = row
      }
      return map
    },
    staleTime: 60000,
  })

  // Load media
  const { data: media } = useQuery({
    queryKey: ['cms-media'],
    queryFn: async () => {
      const { data } = await supabase.from('cms_media').select('*').order('created_at', { ascending: false })
      return data || []
    },
    staleTime: 60000,
  })

  // Get content value (draft if in edit mode, published otherwise)
  const getValue = useCallback((key, fallback = '') => {
    if (editMode && drafts[key] !== undefined) return drafts[key].value
    const row = content?.[key]
    if (!row) return fallback
    if (editMode && row.draft_value) return row.draft_value
    return row.value || fallback
  }, [content, drafts, editMode])

  // Get image URL from media
  const getImage = useCallback((key, fallback = '') => {
    const row = content?.[key]
    if (row?.content_type === 'image' && row.value) return row.value
    return fallback
  }, [content])

  // Set draft value
  const setDraft = useCallback((key, value, contentType = 'text') => {
    setDrafts(prev => ({ ...prev, [key]: { value, type: contentType } }))
    setHasUnsaved(true)
  }, [])

  // Publish all drafts
  const publishAll = useCallback(async () => {
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
  const saveDrafts = useCallback(async () => {
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
  const uploadImage = useCallback(async (file, page = 'general') => {
    const base64 = await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
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
    return data
  }, [profile?.id, queryClient])

  // Delete image
  const deleteImage = useCallback(async (id) => {
    await supabase.from('cms_media').delete().eq('id', id)
    queryClient.invalidateQueries({ queryKey: ['cms-media'] })
  }, [queryClient])

  return (
    <CMSContext.Provider value={{
      editMode: isDev && editMode,
      canEdit: isDev,
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
    }}>
      {children}
    </CMSContext.Provider>
  )
}

export function useCMS() {
  return useContext(CMSContext) || {}
}
