import { supabase } from './supabase'

// Run smart matching on contract benefits
export async function smartMatchContractAssets(contractId, propertyId) {
  // Get benefits for this contract
  const { data: benefits } = await supabase
    .from('contract_benefits')
    .select('*')
    .eq('contract_id', contractId)

  if (!benefits?.length) return { auto_matched: 0, needs_approval: 0, total: 0 }

  // Call the edge function for AI matching
  const { data, error } = await supabase.functions.invoke('contract-ai', {
    body: {
      action: 'smart_match_assets',
      contract_id: contractId,
      property_id: propertyId,
      benefits: benefits.map(b => ({
        id: b.id,
        benefit_description: b.benefit_description,
        quantity: b.quantity,
        frequency: b.frequency,
        value: b.value,
      })),
    },
  })

  if (error) throw error
  return data
}

// Approve a queued match
export async function approveMatch(queueId, assetId, profileId) {
  const { data: queue } = await supabase
    .from('asset_match_queue')
    .select('*, contract_benefits(*)')
    .eq('id', queueId)
    .single()

  if (!queue) throw new Error('Match not found')

  // Update the benefit with the approved asset
  if (queue.benefit_id) {
    await supabase.from('contract_benefits').update({
      asset_id: assetId,
    }).eq('id', queue.benefit_id)
  }

  // Mark queue item as approved
  await supabase.from('asset_match_queue').update({
    status: 'approved',
    resolved_asset_id: assetId,
    resolved_by: profileId,
    resolved_at: new Date().toISOString(),
  }).eq('id', queueId)

  // Log to history for learning
  const { data: asset } = await supabase
    .from('assets')
    .select('name, category')
    .eq('id', assetId)
    .single()

  // Get property_id from contract
  const { data: contract } = await supabase
    .from('contracts')
    .select('property_id')
    .eq('id', queue.contract_id)
    .maybeSingle()

  await supabase.from('asset_match_history').insert({
    property_id: contract?.property_id,
    benefit_text: queue.benefit_text,
    matched_asset_id: assetId,
    matched_asset_name: asset?.name,
    matched_category: asset?.category,
    confidence: 1.0, // user-approved = 100% confidence
    was_auto: false,
    approved: true,
  })

  return { success: true }
}

// Reject a match and create a new asset instead
export async function rejectAndCreateAsset(queueId, newAssetData, profileId) {
  const { data: queue } = await supabase
    .from('asset_match_queue')
    .select('*')
    .eq('id', queueId)
    .single()

  if (!queue) throw new Error('Match not found')

  // Create the new asset
  const { data: asset, error } = await supabase.from('assets').insert({
    ...newAssetData,
    from_contract: true,
    source_contract_id: queue.contract_id,
  }).select().single()

  if (error) throw error

  // Link benefit to new asset
  if (queue.benefit_id) {
    await supabase.from('contract_benefits').update({
      asset_id: asset.id,
    }).eq('id', queue.benefit_id)
  }

  // Mark queue as new_asset
  await supabase.from('asset_match_queue').update({
    status: 'new_asset',
    resolved_asset_id: asset.id,
    resolved_by: profileId,
    resolved_at: new Date().toISOString(),
  }).eq('id', queueId)

  // Log to history — this teaches the system for future matches
  await supabase.from('asset_match_history').insert({
    property_id: newAssetData.property_id,
    benefit_text: queue.benefit_text,
    matched_asset_id: asset.id,
    matched_asset_name: asset.name,
    matched_category: asset.category,
    confidence: 1.0,
    was_auto: false,
    approved: true,
  })

  return { success: true, asset }
}

// Sync matched assets to fulfillment records
export async function syncMatchedToFulfillment(contractId, dealId) {
  const { data: benefits } = await supabase
    .from('contract_benefits')
    .select('*')
    .eq('contract_id', contractId)
    .not('asset_id', 'is', null)

  if (!benefits?.length) return 0

  // Get contract dates
  const { data: contract } = await supabase
    .from('contracts')
    .select('effective_date, expiration_date')
    .eq('id', contractId)
    .single()

  // Check existing fulfillment to avoid duplicates
  const { data: existing } = await supabase
    .from('fulfillment_records')
    .select('benefit_id')
    .eq('contract_id', contractId)

  const existingBenefitIds = new Set((existing || []).map(e => e.benefit_id))
  const newBenefits = benefits.filter(b => !existingBenefitIds.has(b.id))

  if (!newBenefits.length) return 0

  // Generate fulfillment records
  const { data: result } = await supabase.functions.invoke('contract-ai', {
    body: {
      action: 'generate_fulfillment',
      contract_id: contractId,
      deal_id: dealId,
      start_date: contract?.effective_date,
      end_date: contract?.expiration_date,
    },
  })

  return result?.count || 0
}
