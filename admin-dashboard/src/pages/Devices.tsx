import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { Trash2, RefreshCw } from 'lucide-react'

interface Device {
  deviceId: string
  deviceName: string
  deviceType: string
  status: string
  lastSeen: string
}

export default function Devices() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchDevices = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await api.get('/devices')
      if (res.success) {
        setDevices(res.data)
      } else {
        setError(res.error || 'Failed to fetch devices')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch devices')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDevices()
    const interval = setInterval(fetchDevices, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleDelete = async (deviceId: string) => {
    if (!confirm('Are you sure you want to delete this device?')) {
      return
    }
    try {
      await api.delete(`/devices/${deviceId}`)
      fetchDevices()
    } catch (err: any) {
      setError(err.message || 'Failed to delete device')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Devices</h2>
        <button
          onClick={fetchDevices}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : (
        <div className="bg-white rounded shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Seen</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {devices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No devices found
                  </td>
                </tr>
              ) : (
                devices.map(device => (
                  <tr key={device.deviceId}>
                    <td className="px-6 py-4 text-sm font-mono">{device.deviceId}</td>
                    <td className="px-6 py-4 text-sm">{device.deviceName}</td>
                    <td className="px-6 py-4 text-sm">{device.deviceType}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded ${
                        device.status === 'online' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {device.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">{new Date(device.lastSeen).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleDelete(device.deviceId)}
                        className="text-red-600 hover:text-red-800 flex items-center gap-1"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
