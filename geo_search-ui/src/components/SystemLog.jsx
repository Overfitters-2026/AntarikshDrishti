import { useEffect, useRef } from 'react'

function SystemLog({ logs }) {
  const listRef = useRef(null)

  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [logs])

  return (
    <section className="panel system-log" aria-label="System log">
      <h2 className="panel-heading">SYSTEM LOG</h2>
      <div className="log-list data" ref={listRef} role="log" aria-live="polite">
        {[...logs].reverse().map((entry) => (
          <div className={`log-entry severity-${entry.severity.toLowerCase()}`} key={entry.id}>
            [{entry.timestamp.slice(11, 19)} UTC] [{entry.severity}] {entry.message}
          </div>
        ))}
      </div>
    </section>
  )
}

export default SystemLog
