import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { setMasterToggle, setSubToggle, invalidateCache } from '@/services/automationGate'

export interface AutomationSettings {
  master_automation_enabled: boolean
  email_sequences_enabled: boolean
  trial_nurture_enabled: boolean
  upgrade_prompts_enabled: boolean
  operational_tasks_enabled: boolean
  social_scheduling_enabled: boolean
  ad_campaigns_enabled: boolean
  social_auto_publish: boolean
}

export type AutomationSubKey = Exclude<keyof AutomationSettings, 'master_automation_enabled'>

export interface UseAutomationAPI {
  loaded: boolean
  saving: string | null
  settings: AutomationSettings
  isMasterOn: boolean
  toggleMaster: (enabled: boolean) => Promise<void>
  toggleSub: (key: AutomationSubKey, enabled: boolean) => Promise<void>
  reload: () => Promise<void>
}

const DEFAULTS: AutomationSettings = {
  master_automation_enabled: false,
  email_sequences_enabled: true,
  trial_nurture_enabled: true,
  upgrade_prompts_enabled: true,
  operational_tasks_enabled: true,
  social_scheduling_enabled: true,
  ad_campaigns_enabled: true,
  social_auto_publish: false,
}

export function useAutomation(): UseAutomationAPI {
  const { profile } = useAuth()
  const [settings, setSettings] = useState<AutomationSettings>(DEFAULTS)
  const [loaded, setLoaded] = useState<boolean>(false)
  const [saving, setSaving] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data } = await supabase.from('automation_settings').select('*').limit(1).maybeSingle()
    setSettings((data as AutomationSettings | null) || DEFAULTS)
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

  const toggleMaster = useCallback(async (enabled: boolean) => {
    setSaving('master')
    await setMasterToggle(enabled, profile?.id)
    invalidateCache()
    await load()
    setSaving(null)
  }, [profile?.id, load])

  const toggleSub = useCallback(async (key: AutomationSubKey, enabled: boolean) => {
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
