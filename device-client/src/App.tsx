import { useState, useRef } from 'react'
import { Smartphone, Send, LogIn, LogOut, Users, Loader2 } from 'lucide-react'

interface Message {
  id: string
  type: 'sent' | 'received'
  content: string
  timestamp: Date
}

interface Device {
  deviceId: string
  token: string
  deviceName: string
}

function App() {
  const [deviceName, setDeviceName] = useState('')
  const [deviceType, setDeviceType] = useState('ios')
  const [device, setDevice] = useState<Device | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const wsRef = useRef<WebSocket | null>(null)

  // Register device
  const registerDevice = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await fetch('http://localhost:8080/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceName: deviceName || `Device-${Math.random().toString(36).substr(2, 6)}`,
          deviceType,
          osVersion: 'iOS 17',
          appVersion: '1.0.0'
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Fixed: backend returns { deviceId, token } directly in data
        setDevice({
          deviceId: data.data.deviceId,
          token: data.data.token,
          deviceName: deviceName || 'Unknown Device'
        })
        connectWebSocket(data.data.token)
      } else {
        setError(data.error || 'Registration failed')
      }
    } catch (err) {
      setError('Failed to register device: ' + err)
    } finally {
      setLoading(false)
    }
  }

  // Connect WebSocket
  const connectWebSocket = (token: string) => {
    const ws = new WebSocket(`ws://localhost:8080/ws?token=${token}`)
    wsRef.current = ws

    ws.onopen = () => {
      setIsConnected(true)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        // Skip 'connected' welcome message — shown via isConnected state
        if (data.type === 'connected') return
        const content = data.payload?.message || data.payload?.echo?.content || JSON.stringify(data.payload)
        const newMessage: Message = {
          id: Math.random().toString(36).substr(2, 9),
          type: 'received',
          content,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, newMessage])
      } catch {
        const newMessage: Message = {
          id: Math.random().toString(36).substr(2, 9),
          type: 'received',
          content: event.data,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, newMessage])
      }
    }

    ws.onclose = () => {
      setIsConnected(false)
    }

    ws.onerror = (err) => {
      setError('WebSocket error: ' + err)
      setIsConnected(false)
    }
  }

  // Send message
  const sendMessage = () => {
    if (!inputMessage.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return
    }

    const message = {
      type: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    }

    wsRef.current.send(JSON.stringify(message))
    
    const newMessage: Message = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'sent',
      content: inputMessage,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, newMessage])
    setInputMessage('')
  }

  // Disconnect
  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close()
    }
    setDevice(null)
    setIsConnected(false)
    setMessages([])
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-4">
          <div className="flex items-center gap-3">
            <Smartphone className="w-8 h-8 text-blue-500" />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Guojiajia Device Client</h1>
              <p className="text-gray-500">Web-based Device Simulator</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-500">Multi-device support</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Device Registration Panel */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <LogIn className="w-5 h-5" />
              Device Registration
            </h2>

            {!device ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Device Name
                  </label>
                  <input
                    type="text"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    placeholder="My Device"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Device Type
                  </label>
                  <select
                    value={deviceType}
                    onChange={(e) => setDeviceType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ios">iOS</option>
                    <option value="android">Android</option>
                    <option value="embedded">Embedded</option>
                  </select>
                </div>

                <button
                  onClick={registerDevice}
                  disabled={loading}
                  className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Connecting...' : 'Register & Connect'}
                </button>

                {error && (
                  <div className="text-red-500 text-sm mt-2 p-2 bg-red-50 rounded">{error}</div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <div className="flex items-center gap-2 text-green-700 mb-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="font-medium">{isConnected ? 'Connected' : 'Disconnected'}</span>
                  </div>
                  <p className="text-sm text-gray-600">Device ID: {device.deviceId}</p>
                  <p className="text-sm text-gray-600">Name: {device.deviceName}</p>
                </div>

                <button
                  onClick={disconnect}
                  className="w-full bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Disconnect
                </button>
              </div>
            )}
          </div>

          {/* Chat Panel */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6 flex flex-col">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Send className="w-5 h-5" />
              Messages
            </h2>

            {/* Message List */}
            <div className="flex-1 overflow-y-auto space-y-2 mb-4 min-h-[300px] max-h-[400px] border border-gray-100 rounded-md p-3 bg-gray-50">
              {messages.length === 0 ? (
                <p className="text-gray-400 text-sm text-center mt-8">No messages yet. Connect a device and start chatting.</p>
              ) : (
                messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.type === 'sent' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                        msg.type === 'sent'
                          ? 'bg-blue-500 text-white'
                          : 'bg-white border border-gray-200 text-gray-800'
                      }`}
                    >
                      <p>{msg.content}</p>
                      <p className={`text-xs mt-1 ${msg.type === 'sent' ? 'text-blue-100' : 'text-gray-400'}`}>
                        {msg.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input Area */}
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder={isConnected ? 'Type a message...' : 'Connect a device first'}
                disabled={!isConnected}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-50"
              />
              <button
                onClick={sendMessage}
                disabled={!isConnected || !inputMessage.trim()}
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App