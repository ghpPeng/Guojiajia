import useSWR from 'swr'
import { api } from '../services/api'
import { Stats } from '../types'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function Dashboard() {
  const { data: stats } = useSWR<Stats>('/api/stats', api.get)

  const chartData = [
    { name: 'Total', value: stats?.totalDevices || 0 },
    { name: 'Online', value: stats?.onlineDevices || 0 },
    { name: 'Messages', value: stats?.totalMessages || 0 }
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Dashboard</h2>
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded shadow">
          <div className="text-gray-500">Total Devices</div>
          <div className="text-3xl font-bold">{stats?.totalDevices || 0}</div>
        </div>
        <div className="bg-white p-6 rounded shadow">
          <div className="text-gray-500">Online</div>
          <div className="text-3xl font-bold text-green-600">{stats?.onlineDevices || 0}</div>
        </div>
        <div className="bg-white p-6 rounded shadow">
          <div className="text-gray-500">Messages</div>
          <div className="text-3xl font-bold">{stats?.totalMessages || 0}</div>
        </div>
        <div className="bg-white p-6 rounded shadow">
          <div className="text-gray-500">Error Rate</div>
          <div className="text-3xl font-bold text-red-600">{stats?.errorRate || 0}%</div>
        </div>
      </div>
      <div className="bg-white p-6 rounded shadow">
        <h3 className="text-lg font-semibold mb-4">Statistics</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
