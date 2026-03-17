import { create } from 'zustand'

interface AppState {
  apiUrl: string
}

export const useStore = create<AppState>(() => ({
  apiUrl: 'http://localhost:8080'
}))
