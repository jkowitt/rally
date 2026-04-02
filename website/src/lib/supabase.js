import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://juaqategmrghsfkbaiap.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_yBmy9yYrchSL94IWrth3kA_qCCIGgWz'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
