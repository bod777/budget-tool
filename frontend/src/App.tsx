// src/App.tsx
import { useMutation, useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useEffect, useRef, useState } from 'react'

type AuthenticatedUser = {
  id: string
  email: string
  name?: string | null
  picture?: string | null
  email_verified?: boolean
}

type TokenResponse = {
  access_token: string
  token_type: string
  expires_in: number
  issued_at: string
  user: AuthenticatedUser
}

const API_URL = import.meta.env.VITE_API_URL
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const AUTH_TOKEN_KEY = 'budget::auth_token'
const AUTH_USER_KEY = 'budget::auth_user'

function App() {
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const googleButtonRef = useRef<HTMLDivElement | null>(null)

  const { data: health, isLoading: healthLoading, error: healthError } = useQuery({
    queryKey: ['health'],
    enabled: Boolean(API_URL),
    queryFn: async () => {
      const res = await axios.get<{ status: string }>(`${API_URL}/healthz`)
      return res.data
    },
  })

  useEffect(() => {
    const storedToken = localStorage.getItem(AUTH_TOKEN_KEY)
    const storedUser = localStorage.getItem(AUTH_USER_KEY)

    if (storedToken && storedUser) {
      try {
        setAuthToken(storedToken)
        setUser(JSON.parse(storedUser))
      } catch {
        localStorage.removeItem(AUTH_TOKEN_KEY)
        localStorage.removeItem(AUTH_USER_KEY)
      }
    }
  }, [])

  useEffect(() => {
    if (authToken) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`
      localStorage.setItem(AUTH_TOKEN_KEY, authToken)
    } else {
      delete axios.defaults.headers.common.Authorization
      localStorage.removeItem(AUTH_TOKEN_KEY)
    }
  }, [authToken])

  useEffect(() => {
    if (user) {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(AUTH_USER_KEY)
    }
  }, [user])

  const loginMutation = useMutation({
    mutationFn: async (credential: string) => {
      if (!API_URL) {
        throw new Error('API URL is not configured.')
      }

      const res = await axios.post<TokenResponse>(`${API_URL}/auth/google`, {
        credential,
      })

      return res.data
    },
    onSuccess: (data) => {
      setAuthToken(data.access_token)
      setUser(data.user)
      setAuthError(null)
    },
    onError: (err) => {
      if (axios.isAxiosError(err)) {
        setAuthError(
          (err.response?.data as { detail?: string })?.detail ??
            'Unable to authenticate with Google.',
        )
      } else {
        setAuthError('Unable to authenticate with Google.')
      }
    },
  })

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || authToken) {
      return
    }

    const mutateCredential = loginMutation.mutate

    const initialize = () => {
      if (!window.google || !googleButtonRef.current) {
        return
      }

      googleButtonRef.current.innerHTML = ''

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => {
          if (response.credential) {
            mutateCredential(response.credential)
          }
        },
      })

      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        width: '280',
      })

      window.google.accounts.id.prompt()
    }

    const scriptId = 'google-gsi-client'
    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null
    let loadListenerAttached = false

    if (existingScript) {
      if (window.google) {
        initialize()
      } else {
        existingScript.addEventListener('load', initialize)
        loadListenerAttached = true
      }

      return () => {
        if (loadListenerAttached) {
          existingScript.removeEventListener('load', initialize)
        }
      }
    }

    const script = document.createElement('script')
    script.id = scriptId
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = initialize
    document.body.appendChild(script)

    return () => {
      script.onload = null
    }
  }, [GOOGLE_CLIENT_ID, authToken, loginMutation.mutate])

  const handleSignOut = () => {
    setAuthToken(null)
    setUser(null)
    setAuthError(null)
    window.google?.accounts.id.disableAutoSelect?.()
  }

  return (
    <main style={{ fontFamily: 'sans-serif', padding: 20, maxWidth: 640, margin: '0 auto' }}>
      <h1>Budget App</h1>

      {!API_URL && <p style={{ color: '#c00' }}>API URL is not configured.</p>}

      {healthLoading && <p>Checking backend health...</p>}
      {healthError && <p style={{ color: '#c00' }}>Backend unreachable.</p>}
      {health && <p>Backend status: {health.status}</p>}

      <section style={{ marginTop: 32 }}>
        <h2>Sign In</h2>
        {!GOOGLE_CLIENT_ID && (
          <p style={{ color: '#c00' }}>Google OAuth client ID is not configured.</p>
        )}

        {authError && <p style={{ color: '#c00' }}>{authError}</p>}

        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {user.picture && (
              <img
                src={user.picture}
                alt={user.name ?? user.email}
                style={{ width: 48, height: 48, borderRadius: '50%' }}
              />
            )}
            <div>
              <p style={{ margin: 0 }}>
                Signed in as <strong>{user.name ?? user.email}</strong>
              </p>
              <p style={{ margin: 0, fontSize: 14, color: '#555' }}>{user.email}</p>
            </div>
            <button type="button" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        ) : (
          <div>
            <div ref={googleButtonRef} />
            {loginMutation.isPending && <p>Redirecting to Google...</p>}
          </div>
        )}
      </section>
    </main>
  )
}

export default App
