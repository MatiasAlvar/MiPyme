import { useState, useEffect, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet'
import { Search, SlidersHorizontal, MapPin, Clock, X, Navigation } from 'lucide-react'
import { supabase } from '../lib/supabase'
import L from 'leaflet'

// Fix iconos Leaflet + Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const iconoPyme = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
})

const iconoUsuario = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
})

// Calcula distancia en km entre 2 coordenadas (Haversine)
function distanciaKm(lat1, lng1, lat2, lng2) {
  return 111.045 * Math.sqrt(
    Math.pow(lat2 - lat1, 2) +
    Math.pow((lng2 - lng1) * Math.cos((lat1 * Math.PI) / 180), 2)
  )
}

// Centra el mapa cuando cambia userPos
function CentrarMapa({ pos }) {
  const map = useMap()
  useEffect(() => {
    if (pos) map.setView([pos.lat, pos.lng], 14)
  }, [pos, map])
  return null
}

const CATEGORIAS = [
  { id: null,                  nombre: 'Todas',     icono: '🗺️' },
  { id: 'Alimentación',        nombre: 'Comida',    icono: '🍽️' },
  { id: 'Ropa y accesorios',   nombre: 'Ropa',      icono: '👗' },
  { id: 'Belleza y cuidado',   nombre: 'Belleza',   icono: '✨' },
  { id: 'Verdulería / feria',  nombre: 'Feria',     icono: '🥬' },
  { id: 'Artesanía',           nombre: 'Artesanía', icono: '🎨' },
  { id: 'Tecnología',          nombre: 'Tech',      icono: '💻' },
  { id: 'Servicios del hogar', nombre: 'Hogar',     icono: '🔧' },
  { id: 'Otro',                nombre: 'Otro',      icono: '🏪' },
]

export default function MiCliente() {
  const [pymes,          setPymes]          = useState([])
  const [filtradas,      setFiltradas]      = useState([])
  const [busqueda,       setBusqueda]       = useState('')
  const [categoria,      setCategoria]      = useState(null)
  const [radio,          setRadio]          = useState(10)
  const [userPos,        setUserPos]        = useState(null)
  const [geoEstado,      setGeoEstado]      = useState('idle') // idle | buscando | ok | error
  const [cargando,       setCargando]       = useState(true)
  const [seleccionada,   setSeleccionada]   = useState(null)
  const [mostrarFiltro,  setMostrarFiltro]  = useState(false)

  // Solicitar geolocalización al montar
  useEffect(() => {
    pedirUbicacion()
    cargarPymes()
  }, [])

  // Filtrar cuando cambia búsqueda, categoría, radio o userPos
  useEffect(() => {
    let resultado = pymes

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      resultado = resultado.filter(p =>
        p.nombre.toLowerCase().includes(q) ||
        p.descripcion?.toLowerCase().includes(q)
      )
    }

    if (categoria) {
      resultado = resultado.filter(p => p.categoria === categoria)
    }

    // Si tenemos posición del usuario, filtrar por radio y agregar distancia
    if (userPos) {
      resultado = resultado
        .map(p => ({
          ...p,
          distancia: distanciaKm(userPos.lat, userPos.lng, p.lat, p.lng)
        }))
        .filter(p => p.distancia <= radio)
        .sort((a, b) => a.distancia - b.distancia)
    }

    setFiltradas(resultado)
  }, [busqueda, categoria, radio, pymes, userPos])

  const pedirUbicacion = () => {
    if (!navigator.geolocation) {
      setGeoEstado('error')
      return
    }
    setGeoEstado('buscando')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGeoEstado('ok')
      },
      () => {
        setGeoEstado('error')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const cargarPymes = async () => {
    setCargando(true)
    try {
      const { data, error } = await supabase
        .from('pymes')
        .select(`
          id, nombre, descripcion, redes_sociales,
          categorias ( nombre, icono ),
          pyme_ubicaciones ( id, nombre, lat, lng, horarios ),
          pyme_imagenes ( storage_path )
        `)
        .eq('is_active', true)

      if (error) throw error

      const aplanadas = []
      data?.forEach(p => {
        p.pyme_ubicaciones?.forEach(u => {
          aplanadas.push({
            pyme_id:     p.id,
            nombre:      p.nombre,
            descripcion: p.descripcion,
            redes:       p.redes_sociales,
            categoria:   p.categorias?.nombre,
            icono:       p.categorias?.icono,
            imagenes:    p.pyme_imagenes ?? [],
            ub_id:       u.id,
            ub_nombre:   u.nombre,
            lat:         u.lat,
            lng:         u.lng,
            horarios:    u.horarios,
          })
        })
      })

      setPymes(aplanadas)
      setFiltradas(aplanadas)
    } catch (err) {
      console.error('Error cargando pymes:', err)
    } finally {
      setCargando(false)
    }
  }

  const getImagenUrl = (path) => {
    const { data } = supabase.storage.from('pyme-imagenes').getPublicUrl(path)
    return data.publicUrl
  }

  const formatHorario = (horarios) => {
    if (!horarios?.length) return 'Sin horario registrado'
    return horarios.map(h => `${h.dia}: ${h.apertura}–${h.cierre}`).join(' · ')
  }

  const centroInicial = userPos
    ? [userPos.lat, userPos.lng]
    : [-33.4569, -70.6483]

  return (
    <div className="flex h-full">

      {/* Panel lateral */}
      <div className="w-full sm:w-80 flex-shrink-0 flex flex-col border-r border-gray-200 bg-white overflow-hidden">

        {/* Banner geolocalización */}
        {geoEstado === 'idle' || geoEstado === 'buscando' ? (
          <div className="px-3 py-2 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
            <Navigation size={13} className="text-blue-500 animate-pulse" />
            <span className="text-xs text-blue-600">Obteniendo tu ubicación...</span>
          </div>
        ) : geoEstado === 'ok' ? (
          <div className="px-3 py-2 bg-green-50 border-b border-green-100 flex items-center gap-2">
            <Navigation size={13} className="text-green-500" />
            <span className="text-xs text-green-600">Mostrando pymes cerca de ti</span>
          </div>
        ) : (
          <div className="px-3 py-2 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
            <span className="text-xs text-amber-600">No pudimos obtener tu ubicación</span>
            <button onClick={pedirUbicacion} className="text-xs text-amber-700 font-medium underline">
              Reintentar
            </button>
          </div>
        )}

        {/* Buscador */}
        <div className="p-3 border-b border-gray-100">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text" placeholder="Buscar pyme..."
                value={busqueda} onChange={e => setBusqueda(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
              {busqueda && (
                <button onClick={() => setBusqueda('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              )}
            </div>
            <button onClick={() => setMostrarFiltro(v => !v)}
              className={`p-2 rounded-xl border transition-colors ${mostrarFiltro
                ? 'bg-amber-100 border-amber-300 text-amber-700'
                : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
              <SlidersHorizontal size={16} />
            </button>
          </div>

          {mostrarFiltro && (
            <div className="mt-2 space-y-1">
              <p className="text-xs font-medium text-gray-500">Radio: {radio} km</p>
              <input type="range" min="1" max="50" value={radio}
                onChange={e => setRadio(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
              {!userPos && (
                <p className="text-xs text-amber-500">Activa la ubicación para filtrar por radio</p>
              )}
            </div>
          )}
        </div>

        {/* Filtro categorías */}
        <div className="px-3 py-2 border-b border-gray-100 overflow-x-auto">
          <div className="flex gap-1.5 min-w-max">
            {CATEGORIAS.map(c => (
              <button key={c.id ?? 'todas'} onClick={() => setCategoria(c.id)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap
                  ${categoria === c.id ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {c.icono} {c.nombre}
              </button>
            ))}
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {cargando ? (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
              Cargando pymes...
            </div>
          ) : filtradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400 text-sm gap-1">
              <MapPin size={24} className="opacity-40" />
              <span>No hay pymes en esta zona</span>
            </div>
          ) : (
            filtradas.map(p => (
              <button key={`${p.pyme_id}-${p.ub_id}`} onClick={() => setSeleccionada(p)}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-amber-50 transition-colors
                  ${seleccionada?.ub_id === p.ub_id ? 'bg-amber-50 border-l-2 border-l-amber-400' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">{p.nombre}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{p.ub_nombre}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {p.categoria && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {p.categoria}
                        </span>
                      )}
                      {p.distancia !== undefined && (
                        <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-medium">
                          {p.distancia < 1
                            ? `${Math.round(p.distancia * 1000)} m`
                            : `${p.distancia.toFixed(1)} km`}
                        </span>
                      )}
                    </div>
                  </div>
                  <MapPin size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
                </div>
              </button>
            ))
          )}
        </div>

        {/* Contador */}
        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-400">
            {filtradas.length} pyme{filtradas.length !== 1 ? 's' : ''} encontrada{filtradas.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Mapa */}
      <div className="flex-1 relative hidden sm:block">
        <MapContainer
          center={centroInicial}
          zoom={13}
          className="w-full h-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Centrar mapa cuando llega la ubicación */}
          {userPos && <CentrarMapa pos={userPos} />}

          {/* Marcador del usuario */}
          {userPos && (
            <>
              <Marker position={[userPos.lat, userPos.lng]} icon={iconoUsuario}>
                <Popup>
                  <p className="text-sm font-medium text-blue-700">📍 Tú estás aquí</p>
                </Popup>
              </Marker>
              {/* Círculo de radio */}
              <Circle
                center={[userPos.lat, userPos.lng]}
                radius={radio * 1000}
                pathOptions={{ color: '#f59e0b', fillColor: '#fef3c7', fillOpacity: 0.15, weight: 1.5, dashArray: '6' }}
              />
            </>
          )}

          {/* Marcadores pymes */}
          {filtradas.map(p => (
            <Marker
              key={`${p.pyme_id}-${p.ub_id}`}
              position={[p.lat, p.lng]}
              icon={iconoPyme}
              eventHandlers={{ click: () => setSeleccionada(p) }}
            >
              <Popup>
                <div className="min-w-[200px]">
                  {/* Imagen si tiene */}
                  {p.imagenes?.[0]?.storage_path && (
                    <img
                      src={getImagenUrl(p.imagenes[0].storage_path)}
                      alt={p.nombre}
                      className="w-full h-24 object-cover rounded-lg mb-2"
                    />
                  )}
                  <p className="font-semibold text-sm text-gray-900">{p.nombre}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{p.ub_nombre}</p>
                  {p.categoria && (
                    <span className="inline-block mt-1 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                      {p.categoria}
                    </span>
                  )}
                  {p.distancia !== undefined && (
                    <span className="inline-block ml-1 mt-1 text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">
                      {p.distancia < 1 ? `${Math.round(p.distancia * 1000)} m` : `${p.distancia.toFixed(1)} km`}
                    </span>
                  )}
                  {p.descripcion && (
                    <p className="text-xs text-gray-600 mt-1.5">{p.descripcion}</p>
                  )}
                  <div className="mt-2 flex items-start gap-1">
                    <Clock size={11} className="text-gray-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-gray-400">{formatHorario(p.horarios)}</p>
                  </div>
                  {p.redes && Object.keys(p.redes).some(k => p.redes[k]) && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {p.redes.whatsapp && (
                        <a href={`https://wa.me/${p.redes.whatsapp.replace(/\D/g,'')}`}
                          target="_blank" rel="noreferrer"
                          className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                          WhatsApp
                        </a>
                      )}
                      {p.redes.instagram && (
                        <a href={`https://instagram.com/${p.redes.instagram.replace('@','')}`}
                          target="_blank" rel="noreferrer"
                          className="text-xs bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded-full">
                          Instagram
                        </a>
                      )}
                      {p.redes.website && (
                        <a href={p.redes.website} target="_blank" rel="noreferrer"
                          className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                          Web
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  )
}
