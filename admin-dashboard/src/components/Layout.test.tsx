import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Layout from './Layout'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

describe('Layout logout', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'test-token')
    mockNavigate.mockClear()
  })

  it('renders a logout button', () => {
    render(<MemoryRouter><Layout>content</Layout></MemoryRouter>)
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument()
  })

  it('clears token from localStorage on logout', () => {
    render(<MemoryRouter><Layout>content</Layout></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: /logout/i }))
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('navigates to /login on logout', () => {
    render(<MemoryRouter><Layout>content</Layout></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: /logout/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })
})
