import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { setMasterToggle, setSubToggle, invalidateCache } from '@/services/automationGate'

const DEFAULTS = {
  master_automation_enabled: false,
  email_sequences_enabled: true,
  trial_nurture_enabled: true,
  upgrade_prompts_enabled: true,
  operational_tasks_enabled: true,
  social_scheduling_enabled: true,
  ad_campaigns_enabled: true,
  social_auto_publish: false,
}

export function useAutomation() {
  const { profile } = useAuth()
  const [settings, setSettings] = useState(DEFAULTS)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(null)

  const load = useCallback(async () => {
    const { data } = await supabase.from('automation_settings').select('*').limit(1).maybeSingle()
    setSettings(data || DEFAULTS)
    setLoaded(true)
  }, [])

  useEffect(() => { load() }, [load])

  // Real-time subscription to settings changes
  useEffect(() => {
    const channel = supabase
      .channel('automation_settings_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'automation_settings' }, () => load())
      .subscribe()
    return () => { channel.unsubscribe() }
  }, [load])

  const toggleMaster = useCallback(async (enabled) => {
    setSaving('master')
    await setMasterToggle(enabled, profile?.id)
    invalidateCache()
    await load()
    setSaving(null)
  }, [profile?.id, load])

  const toggleSub = useCallback(async (key, enabled) => {
    setSaving(key)
    await setSubToggle(key, enabled, profile?.id)
    invalidateCache()
    await load()
    setSaving(null)
  }, [profile?.id, load])

  return {
    loaded,
    saving,
    settings,
    isMasterOn: settings.master_automation_enabled === true,
    toggleMaster,
    toggleSub,
    reload: load,
  }
}
