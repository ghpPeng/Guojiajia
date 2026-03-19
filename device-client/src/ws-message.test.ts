import { describe, it, expect } from 'vitest'

// Extracted parsing logic matching App.tsx ws.onmessage
function parseWsMessage(raw: string): { skip: boolean; content: string } {
  try {
    const data = JSON.parse(raw)
    if (data.type === 'connected') return { skip: true, content: '' }
    const content =
      data.payload?.message ||
      data.payload?.echo?.content ||
      JSON.stringify(data.payload)
    return { skip: false, content }
  } catch {
    return { skip: false, content: raw }
  }
}

describe('WebSocket message parsing', () => {
  it('skips connected welcome message', () => {
    const raw = JSON.stringify({ type: 'connected', payload: { deviceId: 'x', message: 'Connected' }, timestamp: 1 })
    expect(parseWsMessage(raw).skip).toBe(true)
  })

  it('extracts payload.message from response', () => {
    const raw = JSON.stringify({
      type: 'response',
      payload: { echo: { type: 'user', content: 'hello' }, message: 'Gateway forwarding not yet implemented' },
      timestamp: 1
    })
    const result = parseWsMessage(raw)
    expect(result.skip).toBe(false)
    expect(result.content).toBe('Gateway forwarding not yet implemented')
  })

  it('falls back to payload.echo.content when no payload.message', () => {
    const raw = JSON.stringify({
      type: 'response',
      payload: { echo: { type: 'user', content: 'hello' } },
      timestamp: 1
    })
    const result = parseWsMessage(raw)
    expect(result.skip).toBe(false)
    expect(result.content).toBe('hello')
  })

  it('falls back to JSON.stringify(payload) when no message or echo.content', () => {
    const raw = JSON.stringify({ type: 'custom', payload: { foo: 'bar' } })
    const result = parseWsMessage(raw)
    expect(result.skip).toBe(false)
    expect(result.content).toBe('{"foo":"bar"}')
  })

  it('handles non-JSON raw data', () => {
    const result = parseWsMessage('plain text')
    expect(result.skip).toBe(false)
    expect(result.content).toBe('plain text')
  })
})
