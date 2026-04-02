import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export default function LoginPage() {
  const { signIn, signUp, session } = useAuth()
  const navigate = useNavigate()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (session) {
    navigate('/app', { replace: true })
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isSignUp) {
        await signUp(email, password, fullName)
      } else {
        await signIn(email, password)
      }
      navigate('/app', { replace: true })
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-mono font-bold text-accent text-2xl tracking-wider">LOUD LEGACY</h1>
          <p className="text-text-muted text-sm mt-1">Sports Business Operating Suite</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-bg-surface border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-text-primary">
            {isSignUp ? 'Create Account' : 'Sign In'}
          </h2>

          {isSignUp && (
            <input
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
            />
          )}

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
          />

          {error && (
            <div className="text-danger text-xs">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-bg-primary font-semibold py-2.5 rounded hover:opacity-90 transition-opacity disabled:opacity-50 text-sm"
          >
            {loading ? 'Loading...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>

          <button
            type="button"
            onClick={() => { setIsSignUp(!isSignUp); setError('') }}
            className="w-full text-center text-text-muted text-xs hover:text-text-secondary"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </form>

        <p className="text-center text-text-muted text-xs mt-6">
          Contact <a href="mailto:jason@loud-legacy.com" className="text-accent hover:underline">jason@loud-legacy.com</a> for access
        </p>
      </div>
    </div>
  )
}
