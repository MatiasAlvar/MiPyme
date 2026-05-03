import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Store, MapPin, Briefcase, Edit, ToggleLeft, ToggleRight } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function MiPyme() {
  const [pyme,     setPyme]     = useState(null)
  const [empleos,  setEmpleos]  = useState([])
  const [cargando, setCargando] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    setCargando(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate('/login'); return }

    const { data: pymeData } = await supabase
      .from('pymes')
      .select('*, pyme_ubicaciones(*), categorias(nombre)')
      .eq('user_id', user.id)
      .maybeSingle()

    const { data: empleosData } = await supabase
      .from('empleos')
      .select('*')
      .eq('pyme_id', pymeData?.id ?? '')
      .order('created_at', { ascending: false })

    setPyme(pymeData)
    setEmpleos(empleosData ?? [])
    setCargando(false)
  }

  const toggleEmpleo = async (empleo) => {
    await supabase.from('empleos').update({ is_active: !empleo.is_active }).eq('id', empleo.id)
    setEmpleos(prev => prev.map(e => e.id === empleo.id ? { ...e, is_active: !e.is_active } : e))
  }

  if (cargando) {
    return <div className="flex items-center justify-center h-full text-gray-400 text-sm">Cargando...</div>
  }

  if (!pyme) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-4">
        <Store size={48} className="text-gray-300" />
        <div className="text-center">
          <p className="font-semibold text-gray-800 text-lg">Aún no tienes una pyme registrada</p>
          <p className="text-sm text-gray-500 mt-1">Registra tu negocio y llega a más clientes</p>
        </div>
        <Link to="/pyme/nuevo"
          className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors">
          <Plus size={16} /> Registrar mi pyme
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 overflow-y-auto h-full">

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-bold text-lg text-gray-900">{pyme.nombre}</h1>
            {pyme.categorias && (
              <span className="inline-block mt-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                {pyme.categorias.nombre}
              </span>
            )}
            {pyme.descripcion && (
              <p className="text-sm text-gray-500 mt-2">{pyme.descripcion}</p>
            )}
          </div>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${pyme.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {pyme.is_active ? 'Activa' : 'Inactiva'}
          </span>
        </div>
      </div>

      {/* Ubicaciones */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <MapPin size={15} className="text-amber-500" />
          <h2 className="font-semibold text-sm text-gray-800">
            Ubicaciones ({pyme.pyme_ubicaciones?.length ?? 0}/3)
          </h2>
        </div>
        {pyme.pyme_ubicaciones?.length > 0 ? (
          <div className="space-y-2">
            {pyme.pyme_ubicaciones.map(u => (
              <div key={u.id} className="flex items-start gap-2 text-sm bg-gray-50 rounded-xl px-3 py-2">
                <MapPin size={13} className="text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-800">{u.nombre}</p>
                  <p className="text-xs text-gray-400">{u.lat.toFixed(5)}, {u.lng.toFixed(5)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">Sin ubicaciones registradas</p>
        )}
      </div>

      {/* Empleos */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Briefcase size={15} className="text-amber-500" />
            <h2 className="font-semibold text-sm text-gray-800">Empleos publicados</h2>
          </div>
          <Link to="/empleo/publicar"
            className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium">
            <Plus size={13} /> Publicar
          </Link>
        </div>

        {empleos.length === 0 ? (
          <p className="text-sm text-gray-400">Aún no has publicado empleos</p>
        ) : (
          <div className="space-y-2">
            {empleos.map(e => (
              <div key={e.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium text-gray-800">{e.nombre}</p>
                  <p className="text-xs text-gray-500">
                    ${e.sueldo?.toLocaleString('es-CL')} CLP ·{' '}
                    {e.tipo === 'mensual' ? 'Mensual' : `${e.fecha_inicio} → ${e.fecha_fin}`}
                  </p>
                </div>
                <button onClick={() => toggleEmpleo(e)} className="text-gray-400 hover:text-gray-600">
                  {e.is_active
                    ? <ToggleRight size={22} className="text-green-500" />
                    : <ToggleLeft size={22} />
                  }
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
