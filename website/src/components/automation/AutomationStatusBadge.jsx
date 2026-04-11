import { Link } from 'react-router-dom'
import { useAutomation } from '@/hooks/useAutomation'

export default function AutomationStatusBadge() {
  const { isMasterOn, loaded } = useAutomation()
  if (!loaded) return null

  return (
    <Link
      to="/app/admin/automation"
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono font-medium transition-colors ${isMasterOn ? 'bg-success/15 text-success border border-success/30' : 'bg-bg-card text-text-muted border border-border'}`}
      title={isMasterOn ? 'Automation Active' : 'Manual Mode'}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isMasterOn ? 'bg-success animate-pulse' : 'bg-text-muted'}`} />
      {isMasterOn ? 'AUTO' : 'MANUAL'}
    </Link>
  )
}
