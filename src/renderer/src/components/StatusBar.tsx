import { useApp } from '../store'

const toneClass: Record<string, string> = {
  ok: 'ok',
  bad: 'bad',
  warn: 'warn',
  dim: 'muted'
}

export default function StatusBar(): JSX.Element {
  const { status } = useApp()
  return (
    <div className="statusbar">
      <span className={toneClass[status.tone]}>{status.text}</span>
    </div>
  )
}
