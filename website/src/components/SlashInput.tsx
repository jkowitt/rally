import { useEffect, useRef, useState, type TextareaHTMLAttributes } from 'react'

// Notion/Linear-style slash command primitive. Drop-in replacement
// for a textarea: when the user types "/" at the start of a line
// (or after whitespace), a popover surfaces matching commands.

export interface SlashCommandContext {
  value: string
  setValue: (next: string) => void
  replaceTrigger: (replacement?: string) => void
}

export interface SlashCommand {
  id: string
  label: string
  hint?: string
  icon?: string
  keywords?: string
  insert?: string
  run?: (ctx: SlashCommandContext) => void
}

export interface SlashInputProps {
  value: string
  onChange: (next: string) => void
  commands?: SlashCommand[]
  placeholder?: string
  rows?: number
  className?: string
  textareaProps?: TextareaHTMLAttributes<HTMLTextAreaElement>
}

interface TriggerInfo {
  start: number
  filter: string
}

export default function SlashInput({
  value,
  onChange,
  commands = [],
  placeholder = '',
  rows = 4,
  className = '',
  textareaProps = {},
}: SlashInputProps) {
  const ref = useRef<HTMLTextAreaElement | null>(null)
  const [open, setOpen] = useState<boolean>(false)
  const [triggerStart, setTriggerStart] = useState<number>(-1)
  const [filter, setFilter] = useState<string>('')
  const [activeIdx, setActiveIdx] = useState<number>(0)

  // Filter commands by the substring after "/"
  const matched = filter
    ? commands.filter(c =>
        c.label.toLowerCase().includes(filter.toLowerCase()) ||
        (c.keywords || '').toLowerCase().includes(filter.toLowerCase())
      )
    : commands

  function detectTrigger(text: string, caret: number): TriggerInfo | null {
    // Look back from the caret for a "/" that starts a token
    for (let i = caret - 1; i >= 0; i--) {
      const ch = text[i]
      if (ch === '/') {
        const before = i === 0 ? '\n' : text[i - 1]
        if (before === '\n' || before === ' ' || before === '\t' || i === 0) {
          return { start: i, filter: text.slice(i + 1, caret) }
        }
        return null
      }
      if (ch === ' ' || ch === '\n') return null
    }
    return null
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value
    onChange(next)
    const trigger = detectTrigger(next, e.target.selectionStart)
    if (trigger && commands.length > 0) {
      setOpen(true)
      setTriggerStart(trigger.start)
      setFilter(trigger.filter)
      setActiveIdx(0)
    } else {
      setOpen(false)
    }
  }

  function replaceTrigger(replacement = '') {
    if (triggerStart < 0) return
    const before = value.slice(0, triggerStart)
    const after = value.slice(ref.current?.selectionStart ?? value.length)
    const next = before + replacement + after
    onChange(next)
    setOpen(false)
    requestAnimationFrame(() => {
      if (!ref.current) return
      const pos = before.length + replacement.length
      ref.current.focus()
      ref.current.setSelectionRange(pos, pos)
    })
  }

  function runCommand(cmd: SlashCommand | undefined) {
    if (!cmd) return
    if (typeof cmd.run === 'function') {
      cmd.run({ value, setValue: onChange, replaceTrigger })
      return
    }
    replaceTrigger(cmd.insert || '')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, matched.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      if (matched.length > 0) {
        e.preventDefault()
        runCommand(matched[activeIdx])
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  useEffect(() => {
    if (!open) return
    function close(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div className={`relative ${className}`}>
      <textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent"
        {...textareaProps}
      />
      {open && matched.length > 0 && (
        <div
          role="listbox"
          aria-label="Slash commands"
          className="absolute left-2 mt-1 w-64 bg-bg-surface border border-border rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto"
        >
          <div className="text-[10px] font-mono text-text-muted px-3 py-1.5 border-b border-border uppercase tracking-wider">
            Commands
          </div>
          {matched.map((cmd, i) => (
            <button
              key={cmd.id}
              type="button"
              onMouseEnter={() => setActiveIdx(i)}
              onClick={() => runCommand(cmd)}
              className={`w-full text-left px-3 py-2 transition-colors flex items-center gap-2 ${
                i === activeIdx ? 'bg-accent/10 text-accent' : 'text-text-primary hover:bg-bg-card'
              }`}
            >
              <span className="text-text-muted">{cmd.icon || '⌘'}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{cmd.label}</div>
                {cmd.hint && <div className="text-xs text-text-muted truncate">{cmd.hint}</div>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
