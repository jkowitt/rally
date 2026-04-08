import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'

export default function ClaudeTerminal() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [prompt, setPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [currentResponse, setCurrentResponse] = useState(null)
  const inputRef = useRef(null)
  const outputRef = useRef(null)

  // Past sessions
  const { data: sessions } = useQuery({
    queryKey: ['biz-code-sessions'],
    queryFn: async () => {
      const { data } = await supabase.from('biz_code_sessions').select('*').order('created_at', { ascending: false }).limit(20)
      return data || []
    },
  })

  async function handleSubmit(e) {
    e?.preventDefault()
    if (!prompt.trim() || generating) return
    setGenerating(true)
    setCurrentResponse(null)

    // Save the session
    const { data: session } = await supabase.from('biz_code_sessions').insert({
      prompt: prompt.trim(),
      status: 'generating',
      created_by: profile?.id,
    }).select().single()

    try {
      // Call Claude via edge function
      const { data, error } = await supabase.functions.invoke('contract-ai', {
        body: {
          action: 'edit_contract',
          contract_text: `You are a senior full-stack developer working on the Loud Legacy CRM platform. The tech stack is:
- React 18 + Vite + Tailwind CSS v4
- Supabase (PostgreSQL + Auth + Edge Functions)
- Recharts for charts
- pdfjs-dist for PDF parsing
- Dark theme with gold accent (#E8B84B)

The user wants the following change:`,
          instructions: `${prompt.trim()}

Respond with:
1. ANALYSIS: Brief explanation of what needs to change
2. FILES: List each file that needs to be modified with its path
3. CHANGES: For each file, show the exact code changes needed (old code → new code)
4. MIGRATION: If database changes are needed, show the SQL
5. TESTING: How to verify the change works

Be specific with file paths (they start with website/src/) and show actual code, not pseudocode.`,
        },
      })

      if (error) throw error

      const response = data?.contract_text || data?.text || JSON.stringify(data)
      setCurrentResponse(response)

      // Update session with response
      await supabase.from('biz_code_sessions').update({
        response,
        status: 'review',
      }).eq('id', session.id)

      queryClient.invalidateQueries({ queryKey: ['biz-code-sessions'] })
    } catch (err) {
      setCurrentResponse(`Error: ${err.message}`)
      await supabase.from('biz_code_sessions').update({ response: err.message, status: 'rejected' }).eq('id', session.id)
    }

    setGenerating(false)
    setPrompt('')
  }

  async function updateSessionStatus(id, status) {
    await supabase.from('biz_code_sessions').update({ status }).eq('id', id)
    queryClient.invalidateQueries({ queryKey: ['biz-code-sessions'] })
    toast({ title: `Session ${status}`, type: status === 'approved' ? 'success' : 'warning' })
  }

  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight
  }, [currentResponse])

  const statusColors = { pending: 'text-text-muted', generating: 'text-warning animate-pulse', review: 'text-accent', approved: 'text-success', deployed: 'text-success', rejected: 'text-danger' }

  return (
    <div className="space-y-4">
      <div className="bg-bg-surface border border-accent/30 rounded-lg overflow-hidden">
        <div className="px-4 py-2 bg-bg-card border-b border-border flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-danger" />
          <span className="w-3 h-3 rounded-full bg-warning" />
          <span className="w-3 h-3 rounded-full bg-success" />
          <span className="text-xs font-mono text-text-muted ml-2">Claude Code Terminal</span>
          {generating && <span className="text-xs font-mono text-warning animate-pulse ml-auto">Generating...</span>}
        </div>

        {/* Output area */}
        <div ref={outputRef} className="p-4 max-h-[400px] overflow-y-auto bg-[#0a0e14] font-mono text-sm">
          {!currentResponse && !generating && (
            <div className="text-text-muted">
              <p>Welcome to Claude Code Terminal.</p>
              <p className="mt-1">Describe what you want to change on the platform and Claude will generate the code.</p>
              <p className="mt-1 text-accent">Examples:</p>
              <p className="text-text-secondary">"Add a dark mode toggle to the settings page"</p>
              <p className="text-text-secondary">"Create a CSV export button on the pipeline table"</p>
              <p className="text-text-secondary">"Add a notification when a deal is overdue by 30 days"</p>
              <p className="mt-2 text-text-muted text-xs">Note: This generates code suggestions. You review and implement them manually or via Claude Code CLI.</p>
            </div>
          )}
          {generating && (
            <div className="text-warning animate-pulse">
              <p>Analyzing codebase and generating changes...</p>
              <p className="mt-1">This may take 10-30 seconds.</p>
            </div>
          )}
          {currentResponse && (
            <pre className="whitespace-pre-wrap text-text-primary text-xs leading-relaxed">{currentResponse}</pre>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="border-t border-border flex">
          <span className="px-3 py-3 text-accent font-mono text-sm">$</span>
          <input
            ref={inputRef}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Describe what you want to change..."
            disabled={generating}
            className="flex-1 bg-transparent text-text-primary text-sm font-mono py-3 focus:outline-none placeholder-text-muted disabled:opacity-50"
            autoFocus
          />
          <button type="submit" disabled={generating || !prompt.trim()} className="px-4 text-accent hover:text-accent/80 disabled:opacity-30 font-mono text-sm">
            Run
          </button>
        </form>
      </div>

      {/* Session History */}
      {(sessions || []).length > 0 && (
        <div className="bg-bg-surface border border-border rounded-lg p-4">
          <h3 className="text-xs font-mono text-text-muted uppercase tracking-wider mb-3">Session History</h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {(sessions || []).map(s => (
              <div key={s.id} className="bg-bg-card border border-border rounded p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono ${statusColors[s.status]}`}>{s.status}</span>
                      <span className="text-[10px] text-text-muted font-mono">{new Date(s.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-text-primary mt-1 truncate">{s.prompt}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {s.status === 'review' && (
                      <>
                        <button onClick={() => updateSessionStatus(s.id, 'approved')} className="text-[9px] font-mono bg-success/10 text-success px-2 py-0.5 rounded">Approve</button>
                        <button onClick={() => updateSessionStatus(s.id, 'rejected')} className="text-[9px] font-mono bg-danger/10 text-danger px-2 py-0.5 rounded">Reject</button>
                      </>
                    )}
                    <button onClick={() => setCurrentResponse(s.response)} className="text-[9px] font-mono text-accent hover:underline">View</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
