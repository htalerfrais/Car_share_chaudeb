import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { auth, firebaseConfigured } from '../lib/firebase'

const STORAGE_KEY = 'car-share-profile'
const AuthContext = createContext(null)

function readMockUser() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const configuredMode = import.meta.env.VITE_AUTH_MODE || 'mock'
  const [mode, setMode] = useState(configuredMode)
  const [user, setUser] = useState(() => (mode === 'mock' ? readMockUser() : null))
  const [loading, setLoading] = useState(mode === 'google' && firebaseConfigured)

  useEffect(() => {
    if (mode !== 'google' || !firebaseConfigured) {
      setLoading(false)
      return undefined
    }
    return onAuthStateChanged(auth, (firebaseUser) => {
      setUser(
        firebaseUser
          ? {
              uid: firebaseUser.uid,
              firstName: firebaseUser.displayName?.split(' ')[0] || 'Utilisateur',
              displayName: firebaseUser.displayName || 'Utilisateur',
              photoURL: firebaseUser.photoURL,
            }
          : null,
      )
      setLoading(false)
    })
  }, [mode])

  const value = useMemo(
    () => ({
      user,
      loading,
      mode,
      enableDemoAuth() {
        setMode('mock')
        setUser(readMockUser())
      },
      async signIn(firstName) {
        if (mode === 'google') {
          if (!firebaseConfigured) throw new Error('Firebase doit être configuré pour Google.')
          await signInWithPopup(auth, new GoogleAuthProvider())
          return
        }
        const cleanName = firstName.trim().slice(0, 40)
        if (!cleanName) throw new Error('Indiquez votre prénom.')
        const existing = readMockUser()
        const profile = {
          uid: existing?.uid || `mock-${crypto.randomUUID()}`,
          firstName: cleanName,
          displayName: cleanName,
          photoURL: null,
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
        setUser(profile)
      },
      async signOut() {
        if (mode === 'google' && firebaseConfigured) await firebaseSignOut(auth)
        else {
          localStorage.removeItem(STORAGE_KEY)
          setUser(null)
        }
      },
    }),
    [loading, mode, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth doit être utilisé dans AuthProvider.')
  return context
}
