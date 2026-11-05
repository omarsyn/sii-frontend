import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { setUnauthorizedHandler } from '../api/client'
import { session } from '../utils/session'
import { isTokenExpired, tokenExpiresAt } from '../utils/jwt'
import { normalizePerfil } from '../utils/normalize'
import { failIdentity, resetIdentity, setIdentity } from '../api/identity'

const AuthContext = createContext(null)
const EXPIRED_MSG = 'Tu sesión expiró. Inicia sesión de nuevo.'

export function AuthProvider({ children }) {
  // `activa` solo indica que ya iniciaste sesión; la cookie httpOnly la maneja el navegador y la valida el servidor.
  const [activa, setActiva] = useState(() => {
    const t = session.getToken()
    if (t && isTokenExpired(t)) session.clear()
    return session.isActive()
  })
  const [notice, setNotice] = useState(null)
  const [profile, setProfile] = useState(null)
  const [profileStatus, setProfileStatus] = useState('idle')
  const [profileError, setProfileError] = useState(null)

  const logout = useCallback((message = null) => {
    // Cierre voluntario: pide al servidor borrar la cookie (JavaScript no puede). Si falla, igual se cierra aquí.
    if (!message && api.logout) api.logout().catch(() => {})
    session.clear()
    resetIdentity()
    setActiva(false)
    setProfile(null)
    setProfileStatus('idle')
    setProfileError(null)
    setNotice(typeof message === 'string' ? message : null)
  }, [])

  // Si el servidor responde 401 en cualquier ruta privada, se cierra la sesión.
  useEffect(() => {
    setUnauthorizedHandler(() => logout(EXPIRED_MSG))
    return () => setUnauthorizedHandler(null)
  }, [logout])

  // Si el login devolvió un JWT en el cuerpo, cierra la sesión cuando expire (con cookie, lo decide el servidor con un 401).
  useEffect(() => {
    const token = activa ? session.getToken() : null
    if (!token) return undefined
    const exp = tokenExpiresAt(token)
    if (exp === null) return undefined
    const ms = exp - Date.now()
    if (ms <= 0) {
      logout(EXPIRED_MSG)
      return undefined
    }
    const id = setTimeout(() => logout(EXPIRED_MSG), Math.min(ms, 2 ** 31 - 1))
    return () => clearTimeout(id)
  }, [activa, logout])

  const loadProfile = useCallback(async () => {
    setProfileStatus('loading')
    setProfileError(null)
    resetIdentity()
    try {
      const payload = await api.getPerfil()
      const perfil = normalizePerfil(payload)
      setProfile(perfil)
      setProfileStatus('ready')
      if (perfil.numeroControl && perfil.nombre) setIdentity({ numeroControl: String(perfil.numeroControl), nombre: perfil.nombre })
      else failIdentity(new Error('El perfil no trae número de control o nombre.'))
    } catch (err) {
      if (err.code === 'UNAUTHORIZED') return
      setProfileError(err)
      setProfileStatus('error')
      failIdentity(err)
    }
  }, [])

  // Al entrar (o recargar con sesión) se pide el perfil: si la cookie ya venció, el 401 cierra la sesión.
  useEffect(() => {
    if (activa) loadProfile()
  }, [activa, loadProfile])

  const login = useCallback(async (email, password) => {
    const token = await api.login(email, password)
    session.start(token)
    setNotice(null)
    setActiva(true)
  }, [])

  const value = useMemo(
    () => ({
      isAuthenticated: activa,
      notice,
      clearNotice: () => setNotice(null),
      profile,
      profileStatus,
      profileError,
      loadProfile,
      login,
      logout,
    }),
    [activa, notice, profile, profileStatus, profileError, loadProfile, login, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
