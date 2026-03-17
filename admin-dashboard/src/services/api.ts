const API_URL = 'http://localhost:8080'

export const api = {
  get: async (path: string) => {
    const res = await fetch(`${API_URL}${path}`)
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    return res.json()
  },
  post: async (path: string, data: unknown) => {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    return res.json()
  }
}
