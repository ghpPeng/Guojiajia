import useSWR from 'swr'
import { api } from '../services/api'
import { Device } from '../types'

export default function Devices() {
  const { data: devices, mutate } = useSWR<Device[]>('/api/devices', api.get)

  const handleDelete = async (id: string) => {
    await api.post(`/api/devices/${id}/delete`, {})
    mutate()
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Devices</h2>
      <div className="bg-white rounded shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Seen</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {devices?.map(device => (
              <tr key={device.id}>
                <td className="px-6 py-4 text-sm">{device.id}</td>
                <td className="px-6 py-4 text-sm">{device.name}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded ${
                    device.status === 'online' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {device.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">{device.lastSeen}</td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleDelete(device.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
