import { useState } from 'react'
import useSWR from 'swr'
import { api } from '../services/api'
import { Message } from '../types'

export default function Messages() {
  const { data: messages, mutate } = useSWR<Message[]>('/api/messages', api.get)
  const [deviceId, setDeviceId] = useState('')
  const [content, setContent] = useState('')

  const handleSend = async () => {
    await api.post('/api/messages', { deviceId, content })
    setContent('')
    mutate()
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Messages</h2>
      <div className="bg-white p-6 rounded shadow">
        <h3 className="font-semibold mb-4">Send Message</h3>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Device ID"
            value={deviceId}
            onChange={e => setDeviceId(e.target.value)}
            className="w-full px-3 py-2 border rounded"
          />
          <textarea
            placeholder="Message content"
            value={content}
            onChange={e => setContent(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            rows={3}
          />
          <button
            onClick={handleSend}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Send
          </button>
        </div>
      </div>
      <div className="bg-white rounded shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Device</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Content</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Direction</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {messages?.map(msg => (
              <tr key={msg.id}>
                <td className="px-6 py-4 text-sm">{msg.deviceId}</td>
                <td className="px-6 py-4 text-sm">{msg.content}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded ${
                    msg.direction === 'sent' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {msg.direction}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">{msg.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
