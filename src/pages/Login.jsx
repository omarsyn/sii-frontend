import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AlertCircle, Eye, EyeOff, LogIn } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Spinner } from '../components/ui'
import { USE_MOCK } from '../config'

// Mensaje que manda el backend en el cuerpo de su respuesta ({ "error": "..." } o { "message": "..." }), si lo hay.
function backendMessage(err) {
  const d = err.data
  if (!d || typeof d !== 'object') return null
  for (const k of ['error', 'message', 'mensaje', 'msg']) {
    const v = typeof d[k] === 'string' ? d[k].trim() : ''
    if (v && v.length <= 200) return v
  }
  return null
}

function explain(err) {
  // Sin respuesta del servidor (caído, sin internet o demasiado lento): el mensaje lo arma el cliente.
  if (err.code === 'NETWORK' || err.code === 'TIMEOUT') return err.message
  // El servidor respondió: se muestra lo que dice (p. ej. "Credenciales inválidas o falla en el servicio institucional").
  const delServidor = backendMessage(err)
  if (delServidor) return delServidor
  // Respondió sin un mensaje útil (por ejemplo, una página de error en HTML).
  if (err.status >= 500) return 'El servidor no está disponible. Intenta de nuevo en unos minutos.'
  if (err.status === 400 || err.status === 401 || err.status === 403 || err.status === 404) {
    return 'Correo o contraseña incorrectos. Revisa tus datos e intenta de nuevo.'
  }
  return err.message || 'No se pudo iniciar sesión. Intenta de nuevo.'
}

export default function Login() {
  const { isAuthenticated, login, notice, clearNotice } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) return <Navigate to={location.state?.from || '/'} replace />

  async function onSubmit(e) {
    e.preventDefault()
    const errs = {}
    if (!email.trim()) errs.email = 'Escribe tu correo institucional.'
    if (!password) errs.password = 'Escribe tu contraseña.'
    setFieldErrors(errs)
    setFormError(null)
    if (Object.keys(errs).length) return

    setLoading(true)
    clearNotice()
    try {
      await login(email.trim(), password)
      navigate(location.state?.from || '/', { replace: true })
    } catch (err) {
      setFormError(explain(err))
      setLoading(false)
    }
  }

  const banner = formError || notice

  return (
    <div className="login-page">
      <header className="navbar">
        <div className="navbar-left">
          <span className="navbar-brand">
            <span className="brand-mark" aria-hidden="true">SII</span>
            Portal estudiantil de Celaya
          </span>
        </div>
      </header>

      <main className="login-wrap">
        <div className="login-box">
          <section className="panel panel-primary">
            <div className="panel-heading">
              <h1 className="panel-title" style={{ fontSize: 16 }}>
                <LogIn size={16} aria-hidden="true" /> Iniciar sesión
              </h1>
            </div>
            <div className="panel-body">
              <p className="login-lead">
                Consulta tus calificaciones, kardex y horario, y apúntate a asesorías con otros estudiantes. Usa la misma cuenta con la
                que entras al SII.
              </p>

              {banner ? (
                <div className="alert alert-danger" role="alert">
                  <AlertCircle size={18} aria-hidden="true" />
                  <span>{banner}</span>
                </div>
              ) : null}

              <form onSubmit={onSubmit} noValidate>
                <div className={`form-group ${fieldErrors.email ? 'has-error' : ''}`}>
                  <label htmlFor="email">Correo institucional</label>
                  <input
                    id="email"
                    className="form-control"
                    type="email"
                    inputMode="email"
                    autoComplete="username"
                    placeholder="L00000000@celaya.tecnm.mx"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby={fieldErrors.email ? 'email-err' : undefined}
                    disabled={loading}
                    autoFocus
                  />
                  {fieldErrors.email ? <span className="help-block" id="email-err">{fieldErrors.email}</span> : null}
                </div>

                <div className={`form-group ${fieldErrors.password ? 'has-error' : ''}`}>
                  <label htmlFor="password">Contraseña</label>
                  <div className="input-group pw">
                    <input
                      id="password"
                      className="form-control"
                      type={show ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      aria-invalid={Boolean(fieldErrors.password)}
                      aria-describedby={fieldErrors.password ? 'password-err' : undefined}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="btn btn-default"
                      onClick={() => setShow((s) => !s)}
                      aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      aria-pressed={show}
                    >
                      {show ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                    </button>
                  </div>
                  {fieldErrors.password ? <span className="help-block" id="password-err">{fieldErrors.password}</span> : null}
                </div>

                <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                  {loading ? (
                    <>
                      <Spinner size={16} /> Entrando…
                    </>
                  ) : (
                    'Iniciar sesión'
                  )}
                </button>
              </form>

              {USE_MOCK ? (
                <p className="hint">
                  Modo demostración: entra con cualquier correo y contraseña. Con la contraseña <code>error</code> verás el error de
                  credenciales y con <code>caido</code> el de servidor no disponible.
                </p>
              ) : null}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}