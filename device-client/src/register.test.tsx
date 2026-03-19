import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from './App'

// TDD RED: these tests define expected behavior before fixes

describe('Device registration', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('calls correct API URL on register', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        data: { deviceId: 'dev-123', token: 'tok-abc' }
      })
    })
    vi.stubGlobal('fetch', fetchMock)
    // stub WebSocket so it doesn't throw
    vi.stubGlobal('WebSocket', class {
      onopen: (() => void) | null = null
      onmessage: ((e: MessageEvent) => void) | null = null
      onerror: ((e: Event) => void) | null = null
      onclose: (() => void) | null = null
      constructor() { setTimeout(() => this.onopen?.(), 0) }
      send() {}
      close() {}
    })

    render(<App />)
    fireEvent.click(screen.getByText('Register & Connect'))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/api/auth/register',
        expect.objectContaining({ method: 'POST' })
      )
    })
  })

  it('shows error message on fetch failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    render(<App />)
    fireEvent.click(screen.getByText('Register & Connect'))

    await waitFor(() => {
      expect(screen.getByText(/Failed to register device/i)).toBeTruthy()
    })
  })

  it('shows device info after successful registration', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        data: { deviceId: 'dev-123', token: 'tok-abc' }
      })
    }))
    vi.stubGlobal('WebSocket', class {
      onopen: (() => void) | null = null
      onmessage: ((e: MessageEvent) => void) | null = null
      onerror: ((e: Event) => void) | null = null
      onclose: (() => void) | null = null
      constructor() { setTimeout(() => this.onopen?.(), 0) }
      send() {}
      close() {}
    })

    render(<App />)
    fireEvent.change(screen.getByPlaceholderText('My Device'), { target: { value: 'TestDevice' } })
    fireEvent.click(screen.getByText('Register & Connect'))

    await waitFor(() => {
      expect(screen.getByText(/dev-123/)).toBeTruthy()
    })
  })
})

describe('Layout', () => {
  it('renders registration panel and messages panel', () => {
    render(<App />)
    expect(screen.getByText('Device Registration')).toBeTruthy()
    expect(screen.getByText('Messages')).toBeTruthy()
  })

  it('renders header with title', () => {
    render(<App />)
    expect(screen.getByText('Guojiajia Device Client')).toBeTruthy()
  })
})
