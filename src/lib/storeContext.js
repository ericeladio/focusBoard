import { createContext, useContext } from 'react'

export const StoreContext = createContext(null)

export function useStore() {
  const context = useContext(StoreContext)
  if (!context) throw new Error('useStore fuera de StoreProvider')
  return context
}
