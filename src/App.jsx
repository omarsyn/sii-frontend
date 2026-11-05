import { Navigate, Route, Routes } from 'react-router-dom'
import RutaPrivada from './components/RutaPrivada'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Calificaciones from './pages/Calificaciones'
import Kardex from './pages/Kardex'
import Horario from './pages/Horario'
import Explorar from './pages/asesorias/Explorar'
import MisInscripciones from './pages/asesorias/MisInscripciones'
import MisPublicaciones from './pages/asesorias/MisPublicaciones'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RutaPrivada />}>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="calificaciones" element={<Calificaciones />} />
          <Route path="kardex" element={<Kardex />} />
          <Route path="horario" element={<Horario />} />
          <Route path="asesorias" element={<Explorar />} />
          <Route path="asesorias/mis-inscripciones" element={<MisInscripciones />} />
          <Route path="asesorias/mis-publicaciones" element={<MisPublicaciones />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
