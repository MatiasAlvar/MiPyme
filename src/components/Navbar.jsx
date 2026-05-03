import { NavLink, useNavigate } from 'react-router-dom'
import { Store, MapPin, Briefcase, LogIn, LogOut, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Navbar() {
  const [user, setUser]   = useState(null)
  const navigate          = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/cliente')
  }

  const linkClass = ({ isActive }) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors
     ${isActive
       ? 'bg-amber-100 text-amber-800'
       : 'text-gray-600 hover:bg-gray-100'}`

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 h-14">
      <div className="max-w-5xl mx-auto h-full px-4 flex items-center justify-between">

        {/* Logo */}
        <span className="font-bold text-base tracking-tight text-gray-900">
          Mi<span className="text-amber-500">Pyme</span>
          <span className="text-gray-400 font-normal"> Chile</span>
        </span>

        {/* Links */}
        <div className="flex items-center gap-1">
          <NavLink to="/cliente" className={linkClass}>
            <MapPin size={15} /> MiCliente
          </NavLink>
          <NavLink to="/pyme" className={linkClass}>
            <Store size={15} /> MiPyme
          </NavLink>
          <NavLink to="/empleo" className={linkClass}>
            <Briefcase size={15} /> MiEmpleo
          </NavLink>
        </div>

        {/* Auth */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="hidden sm:flex items-center gap-1 text-xs text-gray-500">
                <User size={13} /> {user.email?.split('@')[0]}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-500 transition-colors"
              >
                <LogOut size={15} />
              </button>
            </>
          ) : (
            <NavLink
              to="/login"
              className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-full bg-gray-900 text-white hover:bg-gray-700 transition-colors"
            >
              <LogIn size={14} /> Ingresar
            </NavLink>
          )}
        </div>
      </div>
    </nav>
  )
}
