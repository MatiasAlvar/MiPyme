import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import { useNavigate } from 'react-router-dom'
import { Plus, MapPin, Clock, ImagePlus, X as XIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'
import L from 'leaflet'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const DIAS = ['lunes','martes','miércoles','jueves','viernes','sábado','domingo']

const CATEGORIAS_LISTA = [
  'Alimentación','Ropa y accesorios','Belleza y cuidado','Tecnología',
  'Servicios del hogar','Verdulería / feria','Artesanía','Mascotas',
  'Deporte','Educación','Transporte','Otro',
]

const ubicacionVacia = () => ({
  nombre: '', lat: -33.4569, lng: -70.6483,
  horarios: DIAS.map(dia => ({ dia, apertura: '', cierre: '', activo: false })),
})

// Sub-componente para clickear el mapa y mover el marcador
function ClickMapa({ onClic }) {
  useMapEvents({ click: e => onClic(e.latlng) })
  return null
}

export default function RegistroPyme() {
  const navigate = useNavigate()
  const [nombre,      setNombre]      = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [redes,       setRedes]       = useState({ instagram:'', facebook:'', tiktok:'', whatsapp:'', website:'' })
  const [ubicaciones, setUbicaciones] = useState([ubicacionVacia()])
  const [tabActiva,   setTabActiva]   = useState(0)
  const [error,       setError]       = useState('')
  const [cargando,    setCargando]    = useState(false)
  const [imagenes,    setImagenes]    = useState([])   // archivos File[]
  const [previstas,   setPrevistas]   = useState([])   // URLs preview
  const [categorias,  setCategorias]  = useState([])

  useEffect(() => {
    supabase.from('categorias').select('id, nombre').then(({ data }) => {
      if (data) setCategorias(data)
    })
  }, [])

  const agregarUbicacion = () => {
    if (ubicaciones.length >= 3) return
    setUbicaciones(prev => [...prev, ubicacionVacia()])
    setTabActiva(ubicaciones.length)
  }

  const eliminarUbicacion = (i) => {
    setUbicaciones(prev => prev.filter((_, idx) => idx !== i))
    setTabActiva(Math.max(0, tabActiva - 1))
  }

  const updateUbicacion = (i, campo, valor) => {
    setUbicaciones(prev => {
      const copia = [...prev]
      copia[i] = { ...copia[i], [campo]: valor }
      return copia
    })
  }

  const updateHorario = (ubIdx, diaIdx, campo, valor) => {
    setUbicaciones(prev => {
      const copia = [...prev]
      const horarios = [...copia[ubIdx].horarios]
      horarios[diaIdx] = { ...horarios[diaIdx], [campo]: valor }
      copia[ubIdx] = { ...copia[ubIdx], horarios }
      return copia
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setCargando(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Debes iniciar sesión primero')

      // Insertar pyme
      const { data: pyme, error: errPyme } = await supabase
        .from('pymes')
        .insert({
          user_id:        user.id,
          nombre,
          descripcion,
          categoria_id:   categoriaId || null,
          redes_sociales: redes,
        })
        .select()
        .single()

      if (errPyme) throw errPyme

      // Insertar ubicaciones
      const ubInserts = ubicaciones.map(u => ({
        pyme_id:  pyme.id,
        nombre:   u.nombre || 'Principal',
        lat:      u.lat,
        lng:      u.lng,
        horarios: u.horarios.filter(h => h.activo).map(h => ({
          dia: h.dia, apertura: h.apertura, cierre: h.cierre,
        })),
      }))

      const { error: errUb } = await supabase
        .from('pyme_ubicaciones')
        .insert(ubInserts)

      if (errUb) throw errUb

      // Subir imágenes si hay
      for (const archivo of imagenes) {
        const ext  = archivo.name.split('.').pop()
        const path = `${pyme.id}/${Date.now()}.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('pyme-imagenes')
          .upload(path, archivo, { upsert: false })
        if (uploadErr) throw uploadErr

        await supabase.from('pyme_imagenes').insert({
          pyme_id:      pyme.id,
          storage_path: path,
          size_bytes:   archivo.size,
        })
      }

      navigate('/pyme')
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  const handleImagenes = (e) => {
    const nuevos = Array.from(e.target.files)
    // Calcular total actual + nuevas
    const totalBytes = [...imagenes, ...nuevos].reduce((s, f) => s + f.size, 0)
    if (totalBytes > 2 * 1024 * 1024) {
      setError('El total de imágenes no puede superar 2 MB')
      return
    }
    setImagenes(prev => [...prev, ...nuevos])
    const urls = nuevos.map(f => URL.createObjectURL(f))
    setPrevistas(prev => [...prev, ...urls])
    setError('')
  }

  const quitarImagen = (i) => {
    setImagenes(prev => prev.filter((_, idx) => idx !== i))
    setPrevistas(prev => prev.filter((_, idx) => idx !== i))
  }

  const totalMB = (imagenes.reduce((s, f) => s + f.size, 0) / (1024 * 1024)).toFixed(2)

  return (
    <div className="min-h-full bg-gray-50 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-6">

        <h1 className="font-bold text-xl text-gray-900 mb-1">Registrar mi pyme</h1>
        <p className="text-sm text-gray-500 mb-6">Completa los datos de tu negocio</p>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Datos básicos */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <h2 className="font-semibold text-gray-800 text-sm">Información general</h2>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Nombre del negocio *</label>
              <input required value={nombre} onChange={e => setNombre(e.target.value)}
                placeholder="Ej: Heladería Antonia"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Descripción</label>
              <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)}
                placeholder="¿Qué ofreces? ¿Qué te hace especial?"
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Categoría</label>
              <select value={categoriaId} onChange={e => setCategoriaId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white"
              >
                <option value="">Seleccionar categoría</option>
                {categorias.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Redes sociales */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
            <h2 className="font-semibold text-gray-800 text-sm">Redes sociales <span className="text-gray-400 font-normal">(opcional)</span></h2>
            {[
              { key: 'whatsapp',  placeholder: '+56912345678', label: 'WhatsApp' },
              { key: 'instagram', placeholder: '@minegocio',   label: 'Instagram' },
              { key: 'facebook',  placeholder: 'URL de página', label: 'Facebook' },
              { key: 'tiktok',    placeholder: '@minegocio',   label: 'TikTok' },
              { key: 'website',   placeholder: 'https://...',  label: 'Sitio web' },
            ].map(r => (
              <div key={r.key} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-20 flex-shrink-0">{r.label}</span>
                <input
                  value={redes[r.key]}
                  onChange={e => setRedes(prev => ({ ...prev, [r.key]: e.target.value }))}
                  placeholder={r.placeholder}
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
              </div>
            ))}
          </div>

          {/* Ubicaciones */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800 text-sm">Ubicaciones</h2>
              {ubicaciones.length < 3 && (
                <button type="button" onClick={agregarUbicacion}
                  className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium">
                  <Plus size={13} /> Agregar
                </button>
              )}
            </div>

            {/* Tabs de ubicaciones */}
            <div className="flex gap-1.5 mb-4">
              {ubicaciones.map((u, i) => (
                <button key={i} type="button"
                  onClick={() => setTabActiva(i)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                    ${tabActiva === i ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  <MapPin size={11} />
                  {u.nombre || `Ubicación ${i + 1}`}
                  {i > 0 && (
                    <span onClick={e => { e.stopPropagation(); eliminarUbicacion(i) }}
                      className="ml-1 text-gray-400 hover:text-red-400">×</span>
                  )}
                </button>
              ))}
            </div>

            {/* Nombre de ubicación */}
            <input
              value={ub.nombre}
              onChange={e => updateUbicacion(tabActiva, 'nombre', e.target.value)}
              placeholder='Ej: "Casa", "Feria dominical", "Local centro"'
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300 mb-3"
            />

            {/* Mapa para fijar ubicación */}
            <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
              <MapPin size={12} /> Haz clic en el mapa para fijar la ubicación
            </p>
            <div className="h-52 rounded-xl overflow-hidden border border-gray-200 mb-4">
              <MapContainer
                center={[ub.lat, ub.lng]}
                zoom={13}
                className="w-full h-full"
                key={tabActiva}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap'
                />
                <ClickMapa onClic={latlng => {
                  updateUbicacion(tabActiva, 'lat', latlng.lat)
                  updateUbicacion(tabActiva, 'lng', latlng.lng)
                }} />
                <Marker position={[ub.lat, ub.lng]} />
              </MapContainer>
            </div>

            {/* Horarios */}
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-1">
                <Clock size={12} /> Horarios para esta ubicación
              </p>
              <div className="space-y-1.5">
                {ub.horarios.map((h, dIdx) => (
                  <div key={h.dia} className="flex items-center gap-2">
                    <input type="checkbox"
                      checked={h.activo}
                      onChange={e => updateHorario(tabActiva, dIdx, 'activo', e.target.checked)}
                      className="accent-amber-500"
                    />
                    <span className="text-xs text-gray-600 w-20 capitalize">{h.dia}</span>
                    {h.activo ? (
                      <>
                        <input type="time" value={h.apertura}
                          onChange={e => updateHorario(tabActiva, dIdx, 'apertura', e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-300"
                        />
                        <span className="text-xs text-gray-400">–</span>
                        <input type="time" value={h.cierre}
                          onChange={e => updateHorario(tabActiva, dIdx, 'cierre', e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-300"
                        />
                      </>
                    ) : (
                      <span className="text-xs text-gray-300">Cerrado</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Imágenes */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-800 text-sm">Fotos de la pyme</h2>
              <span className="text-xs text-gray-400">{totalMB} / 2 MB</span>
            </div>

            {/* Previews */}
            {previstas.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {previstas.map((url, i) => (
                  <div key={i} className="relative">
                    <img src={url} alt={`foto-${i}`}
                      className="w-20 h-20 object-cover rounded-xl border border-gray-200"
                    />
                    <button type="button" onClick={() => quitarImagen(i)}
                      className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                      <XIcon size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Botón agregar foto */}
            <label className="flex items-center gap-2 cursor-pointer border border-dashed border-gray-300 rounded-xl px-4 py-3 hover:border-amber-400 transition-colors">
              <ImagePlus size={16} className="text-gray-400" />
              <span className="text-sm text-gray-500">Agregar fotos (máx 2 MB total)</span>
              <input type="file" accept="image/*" multiple className="hidden"
                onChange={handleImagenes}
              />
            </label>
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{error}</p>
          )}

          <button type="submit" disabled={cargando}
            className="w-full py-3 bg-gray-900 hover:bg-gray-700 text-white font-semibold text-sm rounded-xl transition-colors disabled:opacity-50"
          >
            {cargando ? 'Guardando...' : 'Registrar mi pyme'}
          </button>
        </form>
      </div>
    </div>
  )
}
