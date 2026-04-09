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
  { label: 'List files', prompt: '/ls website/src/modules' },
  { label: 'Read file', prompt: '/read ' },
  { label: 'Add feature', prompt: '' },
  { label: 'Fix bug', prompt: '' },
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

    const { data: session } = await supabase.from('biz_code_sessions').insert({
      prompt: userMsg, status: 'generating', created_by: profile?.id,
    }).select().single()

    try {
      // Build conversation history for multi-turn context
      const conversation = history.slice(-10).filter(h => h.role === 'user' || h.role === 'assistant').map(h => ({
        role: h.role, content: h.content,
      }))

      let response
      // Try code_assistant first (Sonnet with system prompt), fall back to edit_contract
      const { data, error } = await supabase.functions.invoke('contract-ai', {
        body: {
          action: 'code_assistant',
          prompt: userMsg,
          conversation,
          page_context: `Current page: ${window.location.pathname}`,
        },
      })

      if (error || (typeof data?.error === 'string' && data.error.includes('Unknown action'))) {
        // Fallback to edit_contract if code_assistant not deployed yet
        const contextMsgs = history.slice(-6).map(h => `${h.role === 'user' ? 'USER' : 'CLAUDE'}: ${h.content.slice(0, 500)}`).join('\n\n')
        const { data: fb, error: fbErr } = await supabase.functions.invoke('contract-ai', {
          body: {
            action: 'edit_contract',
            contract_text: `You are a senior full-stack developer working on the Loud Legacy CRM platform.\nTech stack: React 18, Vite, Tailwind CSS v4, Supabase, Recharts.\n${contextMsgs ? `Previous conversation:\n${contextMsgs}\n\n` : ''}Current request:`,
            instructions: userMsg,
          },
        })
        if (fbErr) throw fbErr
        response = fb?.contract_text || fb?.text || JSON.stringify(fb)
      } else {
        response = data?.response || data?.contract_text || data?.text || JSON.stringify(data)
      }
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

  // Get GitHub token from ui_content table
  async function getGitHubToken() {
    const { data } = await supabase.from('ui_content').select('value').eq('key', 'github_token').maybeSingle()
    if (!data?.value) {
      toast({ title: 'GitHub token not set', description: 'Go to Dev Tools > Feature Flags and set your GitHub token', type: 'error' })
      return null
    }
    return data.value
  }

  const GITHUB_OWNER = 'jkowitt'
  const GITHUB_REPO = 'rally'
  const GITHUB_BRANCH = 'main'

  // Read a file from the repo
  async function readFile(path) {
    setHistory(prev => [...prev, { role: 'system', content: `Reading ${path}...` }])
    const token = await getGitHubToken()
    if (!token) return null
    try {
      const resp = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' },
      })
      if (!resp.ok) throw new Error(`File not found: ${path}`)
      const data = await resp.json()
      const content = atob(data.content)
      setHistory(prev => [...prev, { role: 'assistant', content: `📄 ${path} (${content.length} chars):\n\n${content.slice(0, 3000)}${content.length > 3000 ? '\n...(truncated)' : ''}` }])
      return { content, sha: data.sha }
    } catch (err) {
      setHistory(prev => [...prev, { role: 'assistant', content: `Error reading ${path}: ${err.message}` }])
      return null
    }
  }

  // Write a file to the repo (commits directly to main)
  async function writeFile(path, content, message) {
    setHistory(prev => [...prev, { role: 'system', content: `Writing ${path}...` }])
    const token = await getGitHubToken()
    if (!token) return null
    try {
      // Get current SHA
      let sha = null
      try {
        const getResp = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' },
        })
        if (getResp.ok) { const d = await getResp.json(); sha = d.sha }
      } catch {}

      const payload = {
        message: message || `Claude Code: update ${path}`,
        content: btoa(unescape(encodeURIComponent(content))),
        branch: GITHUB_BRANCH,
      }
      if (sha) payload.sha = sha

      const resp = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!resp.ok) throw new Error(`GitHub API error ${resp.status}`)
      const result = await resp.json()
      setHistory(prev => [...prev, { role: 'assistant', content: `✅ Committed to main: ${path}\nCommit: ${result.commit?.sha?.slice(0, 7)}\nRailway will auto-deploy.` }])
      toast({ title: `Deployed: ${path}`, type: 'success' })

      await supabase.from('biz_code_sessions').insert({
        prompt: `[deploy] ${path}`, response: `Committed ${result.commit?.sha}`, status: 'deployed', created_by: profile?.id,
      })
      queryClient.invalidateQueries({ queryKey: ['biz-code-sessions'] })
      return result
    } catch (err) {
      setHistory(prev => [...prev, { role: 'assistant', content: `❌ Deploy failed: ${err.message}` }])
      toast({ title: 'Deploy failed', description: err.message, type: 'error' })
      return null
    }
  }

  // List files in a directory
  async function listFiles(path) {
    const token = await getGitHubToken()
    if (!token) return
    try {
      const resp = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path || 'website/src'}?ref=${GITHUB_BRANCH}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' },
      })
      if (!resp.ok) throw new Error('Could not list files')
      const data = await resp.json()
      const listing = (Array.isArray(data) ? data : []).map(f => `${f.type === 'dir' ? '📁' : '📄'} ${f.path}`).join('\n')
      setHistory(prev => [...prev, { role: 'assistant', content: `Files in ${path || 'website/src'}:\n${listing}` }])
    } catch (err) {
      setHistory(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}` }])
    }
  }

  // Edit a file: read → Claude modifies → confirm → write
  async function editFile(path, instructions) {
    setHistory(prev => [...prev, { role: 'system', content: `Editing ${path}...` }])
    setGenerating(true)

    // Read the file
    const token = await getGitHubToken()
    if (!token) { setGenerating(false); return }
    let fileContent = ''
    try {
      const resp = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' },
      })
      if (!resp.ok) throw new Error(`File not found: ${path}`)
      const data = await resp.json()
      fileContent = atob(data.content)
    } catch (err) {
      setHistory(prev => [...prev, { role: 'assistant', content: `Error reading ${path}: ${err.message}` }])
      setGenerating(false)
      return
    }

    setHistory(prev => [...prev, { role: 'system', content: `Read ${fileContent.length} chars. Sending to Claude...` }])

    // Send to Claude with the file content and instructions
    try {
      let newContent = ''
      const { data, error } = await supabase.functions.invoke('contract-ai', {
        body: {
          action: 'code_assistant',
          prompt: `Edit this file: ${instructions}\n\nReturn the COMPLETE updated file content. Do not truncate or summarize — return every line of the file.`,
          file_context: fileContent,
          file_path: path,
        },
      })
      if (!error && !(typeof data?.error === 'string' && data.error.includes('Unknown action'))) {
        newContent = data?.response || data?.contract_text || ''
      } else {
        // Fallback to edit_contract
        const { data: fb, error: fbErr } = await supabase.functions.invoke('contract-ai', {
          body: {
            action: 'edit_contract',
            contract_text: fileContent,
            instructions: `Edit this file (${path}). ${instructions}\n\nReturn the COMPLETE updated file content. Do not truncate or summarize — return every line.`,
          },
        })
        if (fbErr) throw fbErr
        newContent = fb?.contract_text || ''
      }
      if (!newContent || newContent.length < 10) throw new Error('Claude returned empty content')

      // Show what changed
      const oldLines = fileContent.split('\n').length
      const newLines = newContent.split('\n').length
      setHistory(prev => [...prev, {
        role: 'assistant',
        content: `📝 Edit ready for ${path}\n\nOriginal: ${oldLines} lines (${fileContent.length} chars)\nModified: ${newLines} lines (${newContent.length} chars)\nDiff: ${newLines - oldLines > 0 ? '+' : ''}${newLines - oldLines} lines\n\nType /deploy to commit this change, or /preview to see the full file.`
      }])

      // Store the new content for /deploy
      window.__pendingEdit = { path, content: newContent, original: fileContent }

      await supabase.from('biz_code_sessions').insert({
        prompt: `[edit] ${path}: ${instructions}`, response: `${oldLines}→${newLines} lines`, status: 'review', created_by: profile?.id,
      })
      queryClient.invalidateQueries({ queryKey: ['biz-code-sessions'] })
    } catch (err) {
      setHistory(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}` }])
    }
    setGenerating(false)
  }

  // Handle special commands
  function handleCommand(input) {
    const trimmed = input.trim()
    if (trimmed.startsWith('/read ')) { readFile(trimmed.slice(6).trim()); return true }
    if (trimmed.startsWith('/edit ')) {
      const rest = trimmed.slice(5).trim()
      const spaceIdx = rest.indexOf(' ')
      if (spaceIdx === -1) { toast({ title: 'Usage: /edit filepath instructions', type: 'warning' }); return true }
      const path = rest.slice(0, spaceIdx).trim()
      const instructions = rest.slice(spaceIdx + 1).trim()
      editFile(path, instructions)
      return true
    }
    if (trimmed.startsWith('/write ')) {
      const parts = trimmed.slice(7).split(' ')
      const path = parts[0]
      const lastResponse = history.filter(h => h.role === 'assistant').pop()?.content || ''
      if (!path) { toast({ title: 'Usage: /write filepath', type: 'warning' }); return true }
      if (confirm(`Commit changes to ${path} on main? This will deploy immediately.`)) {
        writeFile(path, lastResponse, `Claude Code: update ${path}`)
      }
      return true
    }
    if (trimmed === '/deploy') {
      if (window.__pendingEdit) {
        const { path, content } = window.__pendingEdit
        if (confirm(`Deploy changes to ${path}? This commits to main and auto-deploys.`)) {
          writeFile(path, content, `Claude Code: edit ${path}`)
          window.__pendingEdit = null
        }
      } else {
        toast({ title: 'No pending edit. Use /edit filepath instructions first.', type: 'warning' })
      }
      return true
    }
    if (trimmed === '/preview') {
      if (window.__pendingEdit) {
        setHistory(prev => [...prev, { role: 'assistant', content: `📄 Preview of ${window.__pendingEdit.path}:\n\n${window.__pendingEdit.content.slice(0, 4000)}${window.__pendingEdit.content.length > 4000 ? '\n...(truncated)' : ''}` }])
      } else {
        toast({ title: 'No pending edit to preview.', type: 'warning' })
      }
      return true
    }
    if (trimmed.startsWith('/ls') || trimmed.startsWith('/list')) { listFiles(trimmed.split(' ')[1] || ''); return true }
    return false
  }

  // Override handleSubmit to check for commands first
  const origSubmit = handleSubmit
  handleSubmit = async function(e) {
    e?.preventDefault()
    if (!prompt.trim() || generating) return
    if (handleCommand(prompt)) { setPrompt(''); return }
    return origSubmit(e)
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
        <div ref={outputRef} className="p-3 sm:p-4 max-h-[60vh] sm:max-h-[500px] overflow-y-auto bg-[#0a0e14] font-mono text-xs sm:text-sm space-y-3">
          {history.length === 0 && !generating && (
            <div className="text-text-muted">
              <p>Claude Code Terminal — edit any file on the site and deploy.</p>
              <p className="mt-2 text-accent">Commands:</p>
              <p className="text-text-secondary text-xs">/ls [path] — browse the codebase</p>
              <p className="text-text-secondary text-xs">/read [filepath] — read a file</p>
              <p className="text-text-secondary text-xs">/edit [filepath] [instructions] — Claude edits the file for you</p>
              <p className="text-text-secondary text-xs">/preview — see the pending edit</p>
              <p className="text-text-secondary text-xs">/deploy — commit the edit to main (auto-deploys)</p>
              <p className="text-text-secondary text-xs">/write [filepath] — commit the last response as a file</p>
              <p className="mt-1 text-text-secondary text-xs">Or type any request and Claude will generate code suggestions.</p>
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
