// Estado de sesión en el navegador.
//
// El backend guarda el JWT en una cookie httpOnly (`sii_token`): JavaScript NO puede leerla ni borrarla,
// y el navegador la envía sola con `credentials: 'include'`. Aquí solo se guarda una MARCA ("hay sesión")
// para decidir si mostrar el login o la app; la validez real la decide el servidor (401 = sesión vencida).
//
// Si algún día el login devuelve además `{ token }` en el cuerpo, se guarda en sessionStorage
// y se manda también como Authorization: Bearer.
const MARK_KEY = 'sii.sesion'
const TOKEN_KEY = 'sii.token'

function safe(fn, fallback = null) {
  try {
    return fn()
  } catch {
    return fallback // almacenamiento no disponible
  }
}

export const session = {
  isActive: () => safe(() => window.localStorage.getItem(MARK_KEY) === '1', false),
  start(token = null) {
    safe(() => window.localStorage.setItem(MARK_KEY, '1'))
    if (token) safe(() => window.sessionStorage.setItem(TOKEN_KEY, token))
  },
  getToken: () => safe(() => window.sessionStorage.getItem(TOKEN_KEY)),
  clear() {
    safe(() => window.localStorage.removeItem(MARK_KEY))
    safe(() => window.sessionStorage.removeItem(TOKEN_KEY))
  },
}
