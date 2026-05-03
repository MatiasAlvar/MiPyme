import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import PopupPrimeCorp from './components/PopupPrimeCorp'
import MiCliente from './pages/MiCliente'
import MiPyme from './pages/MiPyme'
import MiEmpleo from './pages/MiEmpleo'
import RegistroPyme from './pages/RegistroPyme'
import RegistroEmpleo from './pages/RegistroEmpleo'
import Login from './pages/Login'

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      {/* Pop-up PrimeCorp — aparece 1 vez por sesión */}
      <PopupPrimeCorp />

      {/* Navbar fijo arriba */}
      <Navbar />

      {/* Contenido con espacio para el navbar */}
      <div className="pt-14 h-screen">
        <Routes>
          <Route path="/"            element={<Navigate to="/cliente" replace />} />
          <Route path="/cliente"     element={<MiCliente />} />
          <Route path="/pyme"        element={<MiPyme />} />
          <Route path="/pyme/nuevo"  element={<RegistroPyme />} />
          <Route path="/empleo"      element={<MiEmpleo />} />
          <Route path="/empleo/nuevo" element={<RegistroEmpleo />} />
          <Route path="/login"       element={<Login />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
