import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'

const QUICK_PROMPTS = [
  { label: 'Fix all errors', prompt: 'Scan the codebase for potential runtime errors, null reference crashes, and unhandled edge cases. List each one with the fix.' },
  { label: 'Add CSV export', prompt: 'Add a CSV export button to the pipeline table view that exports all visible deals with their current column values.' },
  { label: 'Audit security', prompt: 'Audit the codebase for security vulnerabilities: XSS, injection, exposed secrets, missing auth checks. List findings with severity.' },
  { label: 'Optimize performance', prompt: 'Identify the top 5 performance bottlenecks in the React codebase and suggest specific optimizations.' },
  { label: 'Add new feature', prompt: '' },
  { label: 'Fix a bug', prompt: '' },
]

export default function ClaudeTerminal() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [prompt, setPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [history, setHistory] = useState([]) // { role: 'user'|'assistant', content: '' }
  const inputRef = useRef(null)
  const outputRef = useRef(null)

  const { data: sessions } = useQuery({
    queryKey: ['biz-code-sessions'],
    queryFn: async () => {
      const { data } = await supabase.from('biz_code_sessions').select('*').order('created_at', { ascending: false }).limit(30)
      return data || []
    },
  })

  async function handleSubmit(e) {
    e?.preventDefault()
    if (!prompt.trim() || generating) return
    const userMsg = prompt.trim()
    setHistory(prev => [...prev, { role: 'user', content: userMsg }])
    setPrompt('')
    setGenerating(true)

    // Build conversation context from history
    const contextMsgs = history.slice(-6).map(h => `${h.role === 'user' ? 'USER' : 'CLAUDE'}: ${h.content.slice(0, 500)}`).join('\n\n')

    const { data: session } = await supabase.from('biz_code_sessions').insert({
      prompt: userMsg, status: 'generating', created_by: profile?.id,
    }).select().single()

    try {
      const { data, error } = await supabase.functions.invoke('contract-ai', {
        body: {
          action: 'edit_contract',
          contract_text: `You are a senior full-stack developer working on the Loud Legacy CRM platform.

Tech stack: React 18, Vite, Tailwind CSS v4, Supabase (PostgreSQL + Auth + Edge Functions), Recharts, pdfjs-dist.
Dark theme with gold accent (#E8B84B). Files start with website/src/.

${contextMsgs ? `Previous conversation:\n${contextMsgs}\n\n` : ''}Current request:`,
          instructions: `${userMsg}

Respond with actionable code. For each change:
1. File path (e.g. website/src/modules/crm/DealPipeline.jsx)
2. What to find (old code)
3. What to replace with (new code)
4. SQL migration if needed

If the request is a question, answer it directly. If it's a code change, show the exact diff.`,
        },
      })

      if (error) throw error
      const response = data?.contract_text || data?.text || JSON.stringify(data)
      setHistory(prev => [...prev, { role: 'assistant', content: response }])

      await supabase.from('biz_code_sessions').update({ response, status: 'review' }).eq('id', session.id)
      queryClient.invalidateQueries({ queryKey: ['biz-code-sessions'] })
    } catch (err) {
      const errMsg = `Error: ${err.message}`
      setHistory(prev => [...prev, { role: 'assistant', content: errMsg }])
      await supabase.from('biz_code_sessions').update({ response: err.message, status: 'rejected' }).eq('id', session.id)
    }
    setGenerating(false)
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
    toast({ title: 'Copied to clipboard', type: 'success' })
  }

  async function updateSessionStatus(id, status) {
    await supabase.from('biz_code_sessions').update({ status }).eq('id', id)
    queryClient.invalidateQueries({ queryKey: ['biz-code-sessions'] })
    toast({ title: `Session ${status}`, type: status === 'approved' ? 'success' : 'warning' })
  }

  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight
  }, [history, generating])

  const statusColors = { pending: 'text-text-muted', generating: 'text-warning', review: 'text-accent', approved: 'text-success', deployed: 'text-success', rejected: 'text-danger' }

  return (
    <div className="space-y-4">
      {/* Quick prompts */}
      <div className="flex gap-2 flex-wrap">
        {QUICK_PROMPTS.map((qp, i) => (
          <button key={i} onClick={() => {
            if (qp.prompt) { setPrompt(qp.prompt); setTimeout(() => handleSubmit(), 100) }
            else setPrompt(qp.label + ': ')
          }} className="text-[10px] bg-bg-card border border-border text-text-secondary px-2 py-1 rounded hover:border-accent/50 hover:text-text-primary">{qp.label}</button>
        ))}
      </div>

      <div className="bg-bg-surface border border-accent/30 rounded-lg overflow-hidden">
        {/* Title bar */}
        <div className="px-4 py-2 bg-bg-card border-b border-border flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-danger" />
          <span className="w-3 h-3 rounded-full bg-warning" />
          <span className="w-3 h-3 rounded-full bg-success" />
          <span className="text-xs font-mono text-text-muted ml-2">Claude Code Terminal</span>
          {generating && <span className="text-xs font-mono text-warning animate-pulse ml-auto">Generating...</span>}
          {history.length > 0 && (
            <button onClick={() => setHistory([])} className="text-[10px] text-text-muted hover:text-text-secondary ml-auto">Clear</button>
          )}
        </div>

        {/* Output */}
        <div ref={outputRef} className="p-4 max-h-[500px] overflow-y-auto bg-[#0a0e14] font-mono text-sm space-y-3">
          {history.length === 0 && !generating && (
            <div className="text-text-muted">
              <p>Claude Code Terminal — write prompts, get code changes.</p>
              <p className="mt-2 text-accent">Try a quick prompt above, or type your own request below.</p>
              <p className="mt-1 text-text-secondary text-xs">Conversation history is maintained — Claude remembers context from previous messages in this session.</p>
            </div>
          )}
          {history.map((msg, i) => (
            <div key={i} className={msg.role === 'user' ? 'pl-0' : 'pl-0'}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${msg.role === 'user' ? 'bg-accent/20 text-accent' : 'bg-success/20 text-success'}`}>{msg.role === 'user' ? 'You' : 'Claude'}</span>
                {msg.role === 'assistant' && (
                  <button onClick={() => copyToClipboard(msg.content)} className="text-[9px] text-text-muted hover:text-accent">Copy</button>
                )}
              </div>
              <pre className={`whitespace-pre-wrap text-xs leading-relaxed ${msg.role === 'user' ? 'text-accent' : 'text-text-primary'}`}>{msg.content}</pre>
            </div>
          ))}
          {generating && <div className="text-warning animate-pulse text-xs">Thinking...</div>}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="border-t border-border flex">
          <span className="px-3 py-3 text-accent font-mono text-sm">$</span>
          <input
            ref={inputRef}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Describe a change, ask a question, or paste an error..."
            disabled={generating}
            className="flex-1 bg-transparent text-text-primary text-sm font-mono py-3 focus:outline-none placeholder-text-muted disabled:opacity-50"
            autoFocus
          />
          <button type="submit" disabled={generating || !prompt.trim()} className="px-4 text-accent hover:text-accent/80 disabled:opacity-30 font-mono text-sm">Run</button>
        </form>
      </div>

      {/* Session History */}
      {(sessions || []).length > 0 && (
        <div className="bg-bg-surface border border-border rounded-lg p-4">
          <h3 className="text-xs font-mono text-text-muted uppercase tracking-wider mb-3">Session History ({(sessions || []).length})</h3>
          <div className="space-y-2 max-h-[250px] overflow-y-auto">
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
                    {s.response && <button onClick={() => { setHistory(prev => [...prev, { role: 'user', content: s.prompt }, { role: 'assistant', content: s.response }]) }} className="text-[9px] font-mono text-accent hover:underline">Load</button>}
                    {s.response && <button onClick={() => copyToClipboard(s.response)} className="text-[9px] font-mono text-text-muted hover:text-text-primary">Copy</button>}
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
