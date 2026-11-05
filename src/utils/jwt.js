// Decodifica el payload de un JWT (sin verificar la firma: eso lo hace el servidor).
export function decodeJwt(token) {
  try {
    const part = token.split('.')[1]
    if (!part) return null
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    )
    return JSON.parse(json)
  } catch {
    return null
  }
}

// Milisegundos de expiración, o null si el token no trae `exp`.
export function tokenExpiresAt(token) {
  const payload = decodeJwt(token)
  return payload && typeof payload.exp === 'number' ? payload.exp * 1000 : null
}

export function isTokenExpired(token) {
  if (!token) return true
  const exp = tokenExpiresAt(token)
  return exp !== null && exp <= Date.now()
}
