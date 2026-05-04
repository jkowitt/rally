import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import { useAuth } from '@/hooks/useAuth'
import { Button, Card, Badge, EmptyState } from '@/components/ui'
import { humanError } from '@/lib/humanError'
import { Plus, Trash2, GripVertical, Settings as SettingsIcon } from 'lucide-react'

const TYPE_LABELS: Record<string, string> = {
  text: 'Text',
  number: 'Number',
  currency: 'Currency',
  date: 'Date',
  select: 'Single select',
  multiselect: 'Multi-select',
  checkbox: 'Checkbox',
  url: 'URL',
}

interface FieldDef {
  id: string
  property_id: string
  applies_to: string
  field_key: string
  label: string
  field_type: string
  options?: string[] | null
  required: boolean
  position: number
  help_text?: string | null
}

// CustomFieldsEditor — admin surface inside Settings to define
// per-property custom fields on deals/contacts/contracts. Stores
// rows in custom_field_defs; values land in jsonb columns on the
// parent rows.
export default function CustomFieldsEditor({ propertyId, appliesTo = 'deal' }: { propertyId: string; appliesTo?: 'deal' | 'contact' | 'contract' }) {
  const { profile } = useAuth()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)

  const { data: defs = [] } = useQuery({
    queryKey: ['custom-field-defs', propertyId, appliesTo],
    enabled: !!propertyId,
    queryFn: async (): Promise<FieldDef[]> => {
      const { data } = await supabase
        .from('custom_field_defs')
        .select('*')
        .eq('property_id', propertyId)
        .eq('applies_to', appliesTo)
        .order('position', { ascending: true })
      return (data || []) as FieldDef[]
    },
  })

  const upsert = useMutation({
    mutationFn: async (row: Partial<FieldDef> & { label: string; field_type: string }) => {
      const fieldKey = row.field_key || row.label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
      const payload = {
        property_id: propertyId,
        applies_to: appliesTo,
        field_key: fieldKey,
        label: row.label,
        field_type: row.field_type,
        options: row.options || null,
        required: !!row.required,
        position: row.position ?? defs.length,
        help_text: row.help_text || null,
      }
      if (row.id) {
        const { error } = await supabase.from('custom_field_defs').update(payload).eq('id', row.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('custom_field_defs').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom-field-defs', propertyId, appliesTo] })
      setAdding(false)
      toast({ title: 'Field saved', type: 'success' })
    },
    onError: (e: any) => toast({ title: 'Save failed', description: humanError(e), type: 'error' }),
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('custom_field_defs').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['custom-field-defs', propertyId, appliesTo] }),
  })

  return (
    <Card padding="md" className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SettingsIcon className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold text-text-primary">
            Custom fields on {appliesTo === 'deal' ? 'deals' : appliesTo === 'contact' ? 'contacts' : 'contracts'}
          </h3>
          {defs.length > 0 && <Badge tone="info">{defs.length}</Badge>}
        </div>
        <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
          <Plus className="w-3.5 h-3.5" /> Add field
        </Button>
      </div>

      {defs.length === 0 && !adding && (
        <EmptyState
          title="No custom fields yet"
          description={`Add a property-specific column on ${appliesTo}s — e.g. "Renewal quarter" or "Activation tier".`}
          className="py-4 border-0"
        />
      )}

      <ul className="space-y-1.5">
        {defs.map(d => (
          <li key={d.id} className="flex items-center justify-between bg-bg-card border border-border rounded p-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <GripVertical className="w-3.5 h-3.5 text-text-muted shrink-0" />
              <span className="text-sm text-text-primary truncate">{d.label}</span>
              <span className="text-[10px] font-mono text-text-muted">{d.field_key}</span>
              <Badge tone="neutral">{TYPE_LABELS[d.field_type] || d.field_type}</Badge>
              {d.required && <Badge tone="warning">required</Badge>}
            </div>
            <button
              onClick={() => { if (confirm(`Delete "${d.label}"? Existing values stay in jsonb.`)) remove.mutate(d.id) }}
              className="text-text-muted hover:text-danger p-1"
              aria-label="Delete field"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </li>
        ))}
      </ul>

      {adding && (
        <FieldEditor
          onCancel={() => setAdding(false)}
          onSave={(row) => upsert.mutate(row)}
          saving={upsert.isPending}
        />
      )}
    </Card>
  )
}

function FieldEditor({ onCancel, onSave, saving }: { onCancel: () => void; onSave: (row: any) => void; saving: boolean }) {
  const [label, setLabel] = useState('')
  const [type, setType] = useState('text')
  const [required, setRequired] = useState(false)
  const [helpText, setHelpText] = useState('')
  const [optionsRaw, setOptionsRaw] = useState('')

  const needsOptions = type === 'select' || type === 'multiselect'

  return (
    <div className="bg-accent/5 border border-accent/30 rounded p-3 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] text-text-muted uppercase tracking-wider">Label</label>
          <input
            type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Renewal quarter"
            className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-sm text-text-primary mt-0.5 focus:outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="text-[11px] text-text-muted uppercase tracking-wider">Type</label>
          <select
            value={type} onChange={(e) => setType(e.target.value)}
            className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-sm text-text-primary mt-0.5 focus:outline-none focus:border-accent"
          >
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      {needsOptions && (
        <div>
          <label className="text-[11px] text-text-muted uppercase tracking-wider">Options (one per line)</label>
          <textarea
            rows={3} value={optionsRaw} onChange={(e) => setOptionsRaw(e.target.value)}
            placeholder={"Q1\nQ2\nQ3\nQ4"}
            className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-sm text-text-primary mt-0.5 focus:outline-none focus:border-accent resize-none font-mono"
          />
        </div>
      )}

      <div>
        <label className="text-[11px] text-text-muted uppercase tracking-wider">Help text (optional)</label>
        <input
          type="text" value={helpText} onChange={(e) => setHelpText(e.target.value)}
          className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-sm text-text-primary mt-0.5 focus:outline-none focus:border-accent"
        />
      </div>

      <label className="flex items-center gap-2 text-xs text-text-secondary">
        <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} className="accent-accent w-3.5 h-3.5" />
        Required
      </label>

      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button
          size="sm"
          disabled={!label.trim() || saving}
          onClick={() => onSave({
            label: label.trim(),
            field_type: type,
            required,
            help_text: helpText || null,
            options: needsOptions ? optionsRaw.split('\n').map(s => s.trim()).filter(Boolean) : null,
          })}
        >
          {saving ? 'Saving…' : 'Add field'}
        </Button>
      </div>
    </div>
  )
}

// Renderer for the deal/contact form. Reads defs from props and
// renders the appropriate input per type, writing into a
// `custom_fields` jsonb object.
export function CustomFieldsRenderer({
  defs, value, onChange,
}: {
  defs: FieldDef[]
  value: Record<string, any>
  onChange: (next: Record<string, any>) => void
}) {
  if (defs.length === 0) return null
  function set(key: string, v: any) {
    onChange({ ...(value || {}), [key]: v })
  }

  return (
    <div className="space-y-3">
      {defs.map(d => {
        const v = value?.[d.field_key]
        return (
          <div key={d.id}>
            <label className="text-xs text-text-muted">
              {d.label}{d.required && <span className="text-danger ml-0.5">*</span>}
            </label>
            {d.help_text && <p className="text-[10px] text-text-muted/70 mt-0.5">{d.help_text}</p>}
            <FieldInput def={d} value={v} onChange={(next) => set(d.field_key, next)} />
          </div>
        )
      })}
    </div>
  )
}

function FieldInput({ def, value, onChange }: { def: FieldDef; value: any; onChange: (v: any) => void }) {
  const cls = 'w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent mt-1'
  switch (def.field_type) {
    case 'number':
    case 'currency':
      return <input type="number" value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} className={cls} />
    case 'date':
      return <input type="date" value={value || ''} onChange={(e) => onChange(e.target.value || null)} className={cls} />
    case 'url':
      return <input type="url" value={value || ''} onChange={(e) => onChange(e.target.value || null)} placeholder="https://…" className={cls} />
    case 'checkbox':
      return (
        <label className="flex items-center gap-2 text-sm text-text-secondary mt-1">
          <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} className="accent-accent w-4 h-4" />
          {value ? 'Yes' : 'No'}
        </label>
      )
    case 'select':
      return (
        <select value={value || ''} onChange={(e) => onChange(e.target.value || null)} className={cls}>
          <option value="">— select —</option>
          {(def.options || []).map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      )
    case 'multiselect':
      return (
        <select
          multiple value={Array.isArray(value) ? value : []}
          onChange={(e) => onChange(Array.from(e.target.selectedOptions).map(o => o.value))}
          className={cls}
        >
          {(def.options || []).map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      )
    default:
      return <input type="text" value={value || ''} onChange={(e) => onChange(e.target.value || null)} className={cls} />
  }
}
