export interface Device {
  id: string
  name: string
  status: 'online' | 'offline'
  lastSeen: string
}

export interface Message {
  id: string
  deviceId: string
  content: string
  timestamp: string
  direction: 'sent' | 'received'
}

export interface LogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error'
  message: string
}

export interface Stats {
  totalDevices: number
  onlineDevices: number
  totalMessages: number
  errorRate: number
}
