import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Devices from './pages/Devices'
import Messages from './pages/Messages'
import Logs from './pages/Logs'
import Tests from './pages/Tests'

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/devices" element={<Devices />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/logs" element={<Logs />} />
          <Route path="/tests" element={<Tests />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
