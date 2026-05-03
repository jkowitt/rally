// Hand-rolled minimal types for the most-touched Supabase tables.
// NOT a complete schema — just enough that highest-leverage hooks
// and shared utils can opt into typing without a full migration.
//
// To regenerate from the live DB:
//   supabase gen types typescript --project-id <id> > src/types/supabase.ts
// (deferred — would need to be done as part of the wider TS migration.)

export type Role = 'developer' | 'admin' | 'businessops' | 'rep'

export type PropertyType =
  | 'college' | 'professional' | 'minor_league'
  | 'agency' | 'entertainment' | 'conference'
  | 'nonprofit' | 'media' | 'realestate' | 'other'

export interface Property {
  id: string
  name: string | null
  type: PropertyType | null
  sport: string | null
  plan: string | null
  created_at?: string
}

export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  role: Role | string
  property_id: string | null
  onboarding_completed: boolean
  properties?: Property | null
}

export type DealStage =
  | 'Prospect' | 'Proposal Sent' | 'Negotiation'
  | 'Contracted' | 'In Fulfillment' | 'Renewed' | 'Declined'

export interface Deal {
  id: string
  property_id: string
  brand_name: string | null
  contact_name: string | null
  contact_email: string | null
  contact_first_name?: string | null
  contact_last_name?: string | null
  contact_company?: string | null
  value: number | null
  stage: DealStage | string
  priority?: 'High' | 'Medium' | 'Low' | null
  source?: string | null
  start_date?: string | null
  end_date?: string | null
  created_at?: string
  notes?: string | null
}

export interface Contract {
  id: string
  property_id: string
  deal_id: string | null
  brand_name: string | null
  status: string | null
  file_name?: string | null
  effective_date?: string | null
  expiration_date?: string | null
  total_value: number | null
  signed?: boolean | null
  archived_at?: string | null
  archived_reason?: string | null
  is_template?: boolean | null
  created_at?: string
}

export interface ContractBenefit {
  id: string
  contract_id: string
  benefit_description: string | null
  quantity: number | null
  frequency?: string | null
  value?: number | null
}

export interface FulfillmentRecord {
  id: string
  deal_id: string | null
  contract_id: string | null
  benefit_id: string | null
  scheduled_date: string | null
  delivered: boolean
  delivery_notes?: string | null
  delivered_at?: string | null
}

export interface ContractVersion {
  id: string
  contract_id: string
  property_id: string
  version_number: number
  snapshot: { contract: Contract; benefits: ContractBenefit[] }
  archived_at: string
  archived_by: string | null
  archived_reason: string | null
}
