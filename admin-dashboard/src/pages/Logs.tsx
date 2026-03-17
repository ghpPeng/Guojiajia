import useSWR from 'swr'
import { api } from '../services/api'
import { LogEntry } from '../types'

export default function Logs() {
  const { data: logs } = useSWR<LogEntry[]>('/api/logs', api.get)

  const levelColors = {
    info: 'text-blue-600',
    warn: 'text-yellow-600',
    error: 'text-red-600'
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Logs</h2>
      <div className="bg-white rounded shadow overflow-hidden">
        <div className="p-4 font-mono text-sm space-y-2">
          {logs?.map((log, i) => (
            <div key={i} className="flex gap-4">
              <span className="text-gray-500">{log.timestamp}</span>
              <span className={`font-semibold ${levelColors[log.level]}`}>{log.level.toUpperCase()}</span>
              <span>{log.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
