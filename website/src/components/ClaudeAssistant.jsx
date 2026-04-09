import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import { useCMS } from '@/hooks/useCMS'

// Floating Claude assistant — available on every page for developer/businessops
export default function ClaudeAssistant() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [messages, setMessages] = useState([])
  const [mode, setMode] = useState('ask') // 'ask', 'code', 'qa', 'report'
  const outputRef = useRef(null)

  const hasAccess = profile?.role === 'developer' || profile?.role === 'businessops'
  if (!hasAccess) return null

  async function handleSubmit(e) {
    e?.preventDefault()
    if (!prompt.trim() || generating) return
    const userMsg = prompt.trim()
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setPrompt('')
    setGenerating(true)

    // Build context based on current page
    const pageContext = `Current page: ${window.location.pathname}`
    const modeInstructions = {
      ask: 'Answer the question about the Loud Legacy platform, its features, codebase, or business operations.',
      code: `Generate specific code changes for the Loud Legacy platform (React 18 + Vite + Tailwind + Supabase). Show file paths, old code, and new code.`,
      qa: `Analyze this from a QA perspective. Identify potential issues, edge cases, and testing recommendations for the Loud Legacy platform.`,
      report: `Generate a business report or analysis based on the request. Use data-driven insights and actionable recommendations.`,
    }

    const contextMsgs = messages.slice(-4).map(m => `${m.role === 'user' ? 'USER' : 'CLAUDE'}: ${m.content.slice(0, 300)}`).join('\n')

    try {
      const { data, error } = await supabase.functions.invoke('contract-ai', {
        body: {
          action: 'edit_contract',
          contract_text: `${modeInstructions[mode]}\n\n${pageContext}\n${contextMsgs ? `\nConversation:\n${contextMsgs}\n` : ''}`,
          instructions: userMsg,
        },
      })
      if (error) throw error
      const response = data?.contract_text || data?.text || JSON.stringify(data)
      setMessages(prev => [...prev, { role: 'assistant', content: response }])

      // Save to session history
      await supabase.from('biz_code_sessions').insert({
        prompt: `[${mode}] ${userMsg}`, response, status: 'review', created_by: profile?.id,
      })
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}` }])
    }
    setGenerating(false)
  }

  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight
  }, [messages, generating])

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-14 right-3 z-40 bg-accent text-bg-primary px-3 py-2 rounded-full shadow-lg flex items-center gap-1.5 hover:opacity-90 transition-opacity text-xs font-mono font-medium md:bottom-4 md:right-4"
        title="Legacy Helper"
      >
        LH
      </button>
    )
  }

  return (
    <div className="fixed inset-0 sm:inset-auto sm:bottom-4 sm:right-4 z-50 sm:w-96 sm:max-h-[600px] bg-bg-surface sm:border sm:border-accent/30 sm:rounded-lg shadow-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 bg-bg-card border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-accent font-bold">Legacy Helper</span>
          <div className="flex gap-0.5">
            {[
              { id: 'ask', label: 'Ask' },
              { id: 'code', label: 'Code' },
              { id: 'qa', label: 'QA' },
              { id: 'report', label: 'Report' },
            ].map(m => (
              <button key={m.id} onClick={() => setMode(m.id)} className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${mode === m.id ? 'bg-accent text-bg-primary' : 'text-text-muted hover:text-text-primary'}`}>{m.label}</button>
            ))}
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setMessages([])} className="text-[9px] text-text-muted hover:text-text-secondary">Clear</button>
          <button onClick={() => setOpen(false)} className="text-text-muted hover:text-text-primary text-sm ml-1">-</button>
        </div>
      </div>

      {/* Messages */}
      <div ref={outputRef} className="flex-1 p-3 overflow-y-auto max-h-[400px] space-y-2 bg-[#0a0e14]">
        {messages.length === 0 && (
          <div className="text-text-muted text-xs font-mono">
            <p>Mode: <span className="text-accent">{mode}</span></p>
            <p className="mt-1">{mode === 'ask' ? 'Ask anything about the platform.' : mode === 'code' ? 'Describe a code change.' : mode === 'qa' ? 'Describe a QA concern.' : 'Request a business report.'}</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i}>
            <div className="flex items-center gap-1 mb-0.5">
              <span className={`text-[8px] font-mono ${msg.role === 'user' ? 'text-accent' : 'text-success'}`}>{msg.role === 'user' ? 'You' : 'Claude'}</span>
              {msg.role === 'assistant' && (
                <button onClick={() => { navigator.clipboard.writeText(msg.content); toast({ title: 'Copied', type: 'success' }) }} className="text-[8px] text-text-muted hover:text-accent">copy</button>
              )}
            </div>
            <pre className={`whitespace-pre-wrap text-[11px] leading-relaxed ${msg.role === 'user' ? 'text-accent' : 'text-text-primary'}`}>{msg.content}</pre>
          </div>
        ))}
        {generating && <div className="text-warning animate-pulse text-[11px] font-mono">Thinking...</div>}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-border flex">
        <input
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder={mode === 'code' ? 'Describe a code change...' : mode === 'qa' ? 'Describe a QA concern...' : mode === 'report' ? 'What report do you need?' : 'Ask anything...'}
          disabled={generating}
          className="flex-1 bg-transparent text-text-primary text-xs font-mono px-3 py-2.5 focus:outline-none placeholder-text-muted disabled:opacity-50"
          autoFocus
        />
        <button type="submit" disabled={generating || !prompt.trim()} className="px-3 text-accent hover:text-accent/80 disabled:opacity-30 font-mono text-xs">Send</button>
      </form>
    </div>
  )
}
