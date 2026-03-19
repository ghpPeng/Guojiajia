const API_URL = 'http://localhost:8080/api'

export const api = {
  get: async (path: string) => {
    const token = localStorage.getItem('admin_token')
    const headers: Record<string, string> = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    const res = await fetch(`${API_URL}${path}`, { headers })
    if (!res.ok) {
      if (res.status === 401) {
        localStorage.removeItem('admin_token')
        window.location.href = '/login'
      }
      throw new Error(`API error: ${res.status}`)
    }
    return res.json()
  },
  post: async (path: string, data: unknown) => {
    const token = localStorage.getItem('admin_token')
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    })
    if (!res.ok) {
      if (res.status === 401) {
        localStorage.removeItem('admin_token')
        window.location.href = '/login'
      }
      const error = await res.json()
      throw new Error(error.error || `API error: ${res.status}`)
    }
    return res.json()
  },
  delete: async (path: string) => {
    const token = localStorage.getItem('admin_token')
    const headers: Record<string, string> = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    const res = await fetch(`${API_URL}${path}`, {
      method: 'DELETE',
      headers
    })
    if (!res.ok) {
      if (res.status === 401) {
        localStorage.removeItem('admin_token')
        window.location.href = '/login'
      }
      throw new Error(`API error: ${res.status}`)
    }
    return res.json()
  }
}
