import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { User, Phone, Mail, FileText } from 'lucide-react'

export default function RegistroEmpleo() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    nombre_completo: '', rut: '', telefono: '', email: '',
  })
  const [cv,       setCv]       = useState(null)
  const [error,    setError]    = useState('')
  const [cargando, setCargando] = useState(false)

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setCargando(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Debes iniciar sesión primero')

      let cv_path = null

      if (cv) {
        if (cv.size > 1024 * 1024) throw new Error('El CV no puede superar 1 MB')
        const ext = cv.name.split('.').pop()
        const path = `${user.id}/cv.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('cvs')
          .upload(path, cv, { upsert: true })
        if (uploadErr) throw uploadErr
        cv_path = path
      }

      const { error: dbErr } = await supabase
        .from('buscadores_empleo')
        .upsert({ ...form, user_id: user.id, cv_path })

      if (dbErr) throw dbErr
      navigate('/empleo')
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="min-h-full bg-gray-50 overflow-y-auto">
      <div className="max-w-md mx-auto px-4 py-6">
        <h1 className="font-bold text-xl text-gray-900 mb-1">Crear perfil MiEmpleo</h1>
        <p className="text-sm text-gray-500 mb-6">Tus datos para postular a empleos</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">

          {[
            { key: 'nombre_completo', label: 'Nombre completo', icon: User,  placeholder: 'Juan Pérez González', type: 'text' },
            { key: 'rut',            label: 'RUT',              icon: User,  placeholder: '12345678-9',          type: 'text' },
            { key: 'telefono',       label: 'Teléfono',         icon: Phone, placeholder: '+56912345678',        type: 'tel'  },
            { key: 'email',          label: 'Correo',           icon: Mail,  placeholder: 'tu@correo.com',       type: 'email'},
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs font-medium text-gray-600 mb-1 block">{f.label} *</label>
              <div className="relative">
                <f.icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  required type={f.type}
                  value={form[f.key]}
                  onChange={e => set(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
              </div>
            </div>
          ))}

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">
              CV <span className="text-gray-400 font-normal">(PDF o Word, máx 1 MB)</span>
            </label>
            <div className="flex items-center gap-2 border border-dashed border-gray-300 rounded-xl px-3 py-3 hover:border-amber-300 transition-colors cursor-pointer">
              <FileText size={16} className="text-gray-400" />
              <label className="flex-1 cursor-pointer">
                <span className="text-sm text-gray-500">
                  {cv ? cv.name : 'Adjuntar archivo...'}
                </span>
                <input type="file" accept=".pdf,.doc,.docx" className="hidden"
                  onChange={e => setCv(e.target.files?.[0] ?? null)} />
              </label>
              {cv && (
                <button type="button" onClick={() => setCv(null)}
                  className="text-xs text-red-400 hover:text-red-600">Quitar</button>
              )}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{error}</p>
          )}

          <button type="submit" disabled={cargando}
            className="w-full py-3 bg-gray-900 hover:bg-gray-700 text-white font-semibold text-sm rounded-xl transition-colors disabled:opacity-50">
            {cargando ? 'Guardando...' : 'Guardar perfil'}
          </button>
        </form>
      </div>
    </div>
  )
}
