import { createContext, useContext, useState, useEffect } from 'react'
import { mockUser, checkApiAvailable } from '../mock/api'

const API_BASE = 'https://api.proseup.cn'
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isMockMode, setIsMockMode] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const apiAvailable = await checkApiAvailable()
      if (apiAvailable) {
        const res = await fetch(`${API_BASE}/auth/me`, {
          credentials: 'include'
        })
        if (res.ok) {
          const data = await res.json()
          setUser(data.user)
        } else {
          setUser(null)
        }
        setIsMockMode(false)
      } else {
        // API unavailable, use mock data
        setUser(mockUser)
        setIsMockMode(true)
      }
    } catch (err) {
      setUser(mockUser)
      setIsMockMode(true)
    } finally {
      setLoading(false)
    }
  }

  const login = () => {
    window.location.href = `${API_BASE}/auth/github`
  }

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      })
    } finally {
      setUser(null)
      window.location.href = '/login'
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isMockMode }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
