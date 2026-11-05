import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { BookOpenCheck, CalendarDays, ChevronDown, House, LogOut, Menu, ScrollText, User, Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { USE_MOCK } from '../config'
import { titleCase } from '../utils/format'

const NAV = [
  { to: '/', label: 'Inicio', icon: House, end: true },
  { to: '/calificaciones', label: 'Calificaciones', icon: BookOpenCheck },
  { to: '/kardex', label: 'Kardex', icon: ScrollText },
  { to: '/horario', label: 'Horario', icon: CalendarDays },
  { to: '/asesorias', label: 'Asesorías', icon: Users },
]

function UserMenu({ nombre, control, onLogout }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="dropdown" ref={ref}>
      <button type="button" className="user-btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <User size={17} aria-hidden="true" />
        <span className="user-name">{nombre}</span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      {open ? (
        <div className="dropdown-menu" role="menu">
          <div className="dropdown-head">
            <strong>{nombre}</strong>
            {control ? <><br /><small>No. control: {control}</small></> : null}
          </div>
          <button type="button" role="menuitem" onClick={onLogout}>
            <LogOut size={16} aria-hidden="true" /> Cerrar sesión
          </button>
        </div>
      ) : null}
    </div>
  )
}

export default function Layout() {
  const { profile, logout } = useAuth()
  const location = useLocation()
  const nombre = profile?.nombre ? titleCase(profile.nombre) : 'Estudiante'

  const mq = useRef(window.matchMedia('(min-width: 992px)'))
  const [wide, setWide] = useState(mq.current.matches)
  const [navOpen, setNavOpen] = useState(mq.current.matches)

  useEffect(() => {
    const m = mq.current
    const onChange = (e) => {
      setWide(e.matches)
      setNavOpen(e.matches)
    }
    m.addEventListener('change', onChange)
    return () => m.removeEventListener('change', onChange)
  }, [])

  // En pantallas chicas el menú se cierra al cambiar de sección.
  useEffect(() => {
    if (!mq.current.matches) setNavOpen(false)
  }, [location.pathname])

  return (
    <div className={`app ${navOpen ? 'nav-open' : 'nav-closed'}`}>
      <a className="skip-link" href="#contenido">Saltar al contenido</a>

      <header className="navbar">
        <div className="navbar-left">
          <button
            type="button"
            className="icon-btn"
            onClick={() => setNavOpen((o) => !o)}
            aria-label={navOpen ? 'Ocultar menú' : 'Mostrar menú'}
            aria-expanded={navOpen}
            aria-controls="menu-principal"
          >
            <Menu size={22} aria-hidden="true" />
          </button>
          <Link to="/" className="navbar-brand">
            <span className="brand-mark" aria-hidden="true">SII</span>
            Portal estudiantil de Celaya
          </Link>
        </div>
        <UserMenu nombre={nombre} control={profile?.numeroControl} onLogout={() => logout()} />
      </header>

      <div className="app-body">
        <nav className="sidenav" id="menu-principal" aria-label="Secciones">
          <ul>
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink to={to} end={end} className={({ isActive }) => (isActive ? 'active' : undefined)}>
                  <Icon size={18} aria-hidden="true" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        {!wide && navOpen ? <div className="scrim" onClick={() => setNavOpen(false)} aria-hidden="true" /> : null}

        <main className="content" id="contenido" tabIndex={-1}>
          {USE_MOCK ? (
            <div className="mock-banner" role="note">
              Modo demostración: estos datos son de ejemplo y no vienen del SII.
            </div>
          ) : null}
          <Outlet />
        </main>
      </div>
    </div>
  )
}
