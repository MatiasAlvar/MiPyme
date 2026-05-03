import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Mail, Lock, Store, Briefcase, Phone, KeyRound } from 'lucide-react'

// Valida formato teléfono chileno → +569XXXXXXXX
const formatPhone = (raw) => {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('569')) return `+${digits}`
  if (digits.startsWith('9') && digits.length === 9) return `+56${digits}`
  if (digits.startsWith('56')) return `+${digits}`
  return `+56${digits}`
}

export default function Login() {
  const [modo,       setModo]       = useState('login')      // 'login' | 'register'
  const [metodo,     setMetodo]     = useState('email')      // 'email' | 'phone'
  const [rol,        setRol]        = useState('pyme')
  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  const [telefono,   setTelefono]   = useState('')
  const [codigo,     setCodigo]     = useState('')
  const [paso,       setPaso]       = useState(1)            // 1: datos, 2: verificar SMS
  const [error,      setError]      = useState('')
  const [info,       setInfo]       = useState('')
  const [cargando,   setCargando]   = useState(false)
  const navigate = useNavigate()

  const resetear = () => {
    setError(''); setInfo(''); setCodigo(''); setPaso(1)
  }

  // ── EMAIL ──────────────────────────────────────────────
  const handleEmail = async (e) => {
    e.preventDefault()
    setError(''); setCargando(true)
    try {
      if (modo === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        navigate('/cliente')
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { role: rol } },
        })
        if (error) throw error
        setInfo('¡Cuenta creada! Revisa tu correo para confirmar y luego ingresa.')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  // ── TELÉFONO paso 1: enviar OTP ────────────────────────
  const handleEnviarSMS = async (e) => {
    e.preventDefault()
    setError(''); setCargando(true)
    try {
      const phone = formatPhone(telefono)
      const { error } = await supabase.auth.signInWithOtp({
        phone,
        options: {
          data: { role: rol },
          shouldCreateUser: true,
        },
      })
      if (error) throw error
      setInfo(`Código enviado al ${phone}`)
      setPaso(2)
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  // ── TELÉFONO paso 2: verificar OTP ────────────────────
  const handleVerificarSMS = async (e) => {
    e.preventDefault()
    setError(''); setCargando(true)
    try {
      const phone = formatPhone(telefono)
      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token: codigo,
        type: 'sms',
      })
      if (error) throw error

      // Si es registro nuevo, crear perfil con rol
      if (data.user) {
        await supabase.from('profiles').upsert({
          id:   data.user.id,
          role: rol,
        })
      }

      navigate(rol === 'pyme' ? '/pyme' : '/empleo')
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="min-h-full bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-sm p-8">

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="bg-gray-900 rounded-xl px-4 py-1.5">
            <span className="text-[#C9A84C] font-bold text-lg">Mi</span>
            <span className="text-white font-bold text-lg">Pyme</span>
          </div>
        </div>

        <h1 className="text-center font-semibold text-gray-900 text-lg mb-1">
          {modo === 'login' ? 'Bienvenido de vuelta' : 'Crear cuenta'}
        </h1>
        <p className="text-center text-sm text-gray-500 mb-5">
          {modo === 'login' ? 'Ingresa a tu cuenta' : 'Elige cómo quieres registrarte'}
        </p>

        {/* Selector de rol (solo en registro) */}
        {modo === 'register' && (
          <div className="flex rounded-xl border border-gray-200 overflow-hidden mb-4">
            <button type="button" onClick={() => setRol('pyme')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors
                ${rol === 'pyme' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
              <Store size={14} /> Soy pyme
            </button>
            <button type="button" onClick={() => setRol('empleo')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors
                ${rol === 'empleo' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
              <Briefcase size={14} /> Busco trabajo
            </button>
          </div>
        )}

        {/* Selector email / teléfono */}
        <div className="flex rounded-xl border border-gray-200 overflow-hidden mb-5">
          <button type="button" onClick={() => { setMetodo('email'); resetear() }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors
              ${metodo === 'email' ? 'bg-amber-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
            <Mail size={13} /> Correo
          </button>
          <button type="button" onClick={() => { setMetodo('phone'); resetear() }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors
              ${metodo === 'phone' ? 'bg-amber-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
            <Phone size={13} /> Teléfono
          </button>
        </div>

        {/* Mensajes */}
        {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>}
        {info  && <p className="text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2 mb-3">{info}</p>}

        {/* ── FORMULARIO EMAIL ── */}
        {metodo === 'email' && (
          <form onSubmit={handleEmail} className="space-y-3">
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="email" required placeholder="Correo electrónico"
                value={email} onChange={e => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
            </div>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="password" required placeholder="Contraseña" minLength={6}
                value={password} onChange={e => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
            </div>
            <button type="submit" disabled={cargando}
              className="w-full py-2.5 bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50">
              {cargando ? 'Cargando...' : modo === 'login' ? 'Ingresar' : 'Crear cuenta'}
            </button>
          </form>
        )}

        {/* ── FORMULARIO TELÉFONO paso 1 ── */}
        {metodo === 'phone' && paso === 1 && (
          <form onSubmit={handleEnviarSMS} className="space-y-3">
            <div className="relative">
              <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="tel" required placeholder="9 1234 5678"
                value={telefono} onChange={e => setTelefono(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
            </div>
            <p className="text-xs text-gray-400">Recibirás un código SMS para verificar tu número</p>
            <button type="submit" disabled={cargando}
              className="w-full py-2.5 bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50">
              {cargando ? 'Enviando...' : 'Enviar código SMS'}
            </button>
          </form>
        )}

        {/* ── FORMULARIO TELÉFONO paso 2: ingresar código ── */}
        {metodo === 'phone' && paso === 2 && (
          <form onSubmit={handleVerificarSMS} className="space-y-3">
            <div className="relative">
              <KeyRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" required placeholder="Código de 6 dígitos"
                maxLength={6} value={codigo} onChange={e => setCodigo(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300 tracking-widest text-center font-mono text-lg"
              />
            </div>
            <button type="submit" disabled={cargando}
              className="w-full py-2.5 bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50">
              {cargando ? 'Verificando...' : 'Verificar código'}
            </button>
            <button type="button" onClick={() => { setPaso(1); setInfo(''); setError('') }}
              className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors">
              ← Cambiar número
            </button>
          </form>
        )}

        {/* Toggle login/registro */}
        <p className="text-center text-sm text-gray-500 mt-4">
          {modo === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
          <button onClick={() => { setModo(modo === 'login' ? 'register' : 'login'); resetear() }}
            className="text-amber-600 font-medium hover:underline">
            {modo === 'login' ? 'Registrarse' : 'Ingresar'}
          </button>
        </p>
      </div>
    </div>
  )
}
