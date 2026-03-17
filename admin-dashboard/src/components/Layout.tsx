import { Link, useLocation } from 'react-router-dom'

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()

  const links = [
    { path: '/', label: 'Dashboard' },
    { path: '/devices', label: 'Devices' },
    { path: '/messages', label: 'Messages' },
    { path: '/logs', label: 'Logs' },
    { path: '/tests', label: 'Tests' }
  ]

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex h-16 items-center space-x-8">
            <h1 className="text-xl font-bold">Guojiajia Admin</h1>
            {links.map(link => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-2 rounded ${
                  location.pathname === link.path
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
