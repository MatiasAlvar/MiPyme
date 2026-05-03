import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Briefcase, MapPin, Calendar, DollarSign, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function MiEmpleo() {
  const [empleos,   setEmpleos]   = useState([])
  const [busqueda,  setBusqueda]  = useState('')
  const [cargando,  setCargando]  = useState(true)
  const [seleccionado, setSeleccionado] = useState(null)

  useEffect(() => {
    cargarEmpleos()
  }, [])

  const cargarEmpleos = async () => {
    setCargando(true)
    const { data } = await supabase
      .from('empleos')
      .select(`
        *,
        pymes ( nombre, redes_sociales,
          pyme_ubicaciones ( nombre, lat, lng )
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    setEmpleos(data ?? [])
    setCargando(false)
  }

  const filtrados = empleos.filter(e => {
    const q = busqueda.toLowerCase()
    return !q || e.nombre.toLowerCase().includes(q) || e.pymes?.nombre.toLowerCase().includes(q)
  })

  return (
    <div className="flex h-full">

      {/* Lista */}
      <div className="w-full sm:w-96 flex flex-col border-r border-gray-200 bg-white overflow-hidden">

        <div className="p-3 border-b border-gray-100">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" placeholder="Buscar empleo o empresa..."
              value={busqueda} onChange={e => setBusqueda(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
          </div>
        </div>

        <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-400">{filtrados.length} oferta{filtrados.length !== 1 ? 's' : ''}</p>
          <Link to="/login"
            className="text-xs bg-gray-900 text-white px-3 py-1 rounded-full hover:bg-gray-700 transition-colors">
            Postular con CV
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto">
          {cargando ? (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Cargando...</div>
          ) : filtrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400 text-sm gap-1">
              <Briefcase size={24} className="opacity-40" />
              <span>Sin ofertas disponibles</span>
            </div>
          ) : (
            filtrados.map(e => (
              <button key={e.id} onClick={() => setSeleccionado(e)}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-amber-50 transition-colors
                  ${seleccionado?.id === e.id ? 'bg-amber-50 border-l-2 border-l-amber-400' : ''}`}
              >
                <p className="font-medium text-sm text-gray-900">{e.nombre}</p>
                <p className="text-xs text-gray-500 mt-0.5">{e.pymes?.nombre}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                    <DollarSign size={11} /> ${e.sueldo?.toLocaleString('es-CL')} CLP
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium
                    ${e.tipo === 'mensual' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                    {e.tipo === 'mensual' ? 'Mensual' : 'Puntual'}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Detalle */}
      <div className="flex-1 hidden sm:flex items-center justify-center bg-gray-50">
        {seleccionado ? (
          <div className="max-w-md w-full mx-auto p-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="font-bold text-lg text-gray-900">{seleccionado.nombre}</h2>
              <p className="text-sm text-amber-600 font-medium mt-0.5">{seleccionado.pymes?.nombre}</p>

              <div className="flex flex-wrap gap-2 mt-3">
                <span className="flex items-center gap-1 text-sm bg-green-50 text-green-700 px-3 py-1 rounded-full font-medium">
                  <DollarSign size={13} /> ${seleccionado.sueldo?.toLocaleString('es-CL')} CLP
                </span>
                <span className={`text-sm px-3 py-1 rounded-full font-medium
                  ${seleccionado.tipo === 'mensual' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>
                  {seleccionado.tipo === 'mensual' ? 'Empleo mensual' : 'Trabajo puntual'}
                </span>
              </div>

              {seleccionado.tipo === 'puntual' && (
                <div className="flex items-center gap-2 mt-3 text-sm text-gray-500">
                  <Calendar size={14} className="text-gray-400" />
                  {seleccionado.fecha_inicio} → {seleccionado.fecha_fin}
                </div>
              )}

              {seleccionado.descripcion && (
                <p className="text-sm text-gray-600 mt-4 leading-relaxed">{seleccionado.descripcion}</p>
              )}

              {seleccionado.pymes?.pyme_ubicaciones?.[0] && (
                <div className="flex items-center gap-2 mt-4 text-sm text-gray-500">
                  <MapPin size={14} className="text-gray-400" />
                  {seleccionado.pymes.pyme_ubicaciones[0].nombre}
                </div>
              )}

              {/* Contacto por redes */}
              {seleccionado.pymes?.redes_sociales?.whatsapp && (
                <a
                  href={`https://wa.me/${seleccionado.pymes.redes_sociales.whatsapp.replace(/\D/g,'')}`}
                  target="_blank" rel="noreferrer"
                  className="mt-5 w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
                >
                  Contactar por WhatsApp
                </a>
              )}

              <Link to="/login"
                className="mt-2 w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium py-2.5 rounded-xl transition-colors">
                Postular con mi CV
              </Link>
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-400">
            <Briefcase size={40} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Selecciona una oferta para ver el detalle</p>
          </div>
        )}
      </div>
    </div>
  )
}
