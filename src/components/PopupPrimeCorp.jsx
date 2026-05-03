import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

export default function PopupPrimeCorp() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Mostrar solo 1 vez por sesión
    if (!sessionStorage.getItem('pc_shown')) {
      const timer = setTimeout(() => setVisible(true), 800)
      return () => clearTimeout(timer)
    }
  }, [])

  const cerrar = () => {
    setVisible(false)
    sessionStorage.setItem('pc_shown', '1')
  }

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4"
      onClick={cerrar}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Botón cerrar */}
        <button
          onClick={cerrar}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Logo PrimeCorp */}
        <div className="flex justify-center mb-4">
          <div className="bg-gray-900 rounded-xl px-5 py-2">
            <span className="text-[#C9A84C] font-bold text-xl tracking-wide">Prime</span>
            <span className="text-white font-bold text-xl tracking-wide">Corp</span>
          </div>
        </div>

        <h2 className="text-center font-semibold text-gray-900 text-base mb-1">
          Consultoría IT y Telecomunicaciones
        </h2>
        <p className="text-center text-sm text-gray-500 mb-5">
          Infraestructura, automatización de procesos y soporte tecnológico para tu empresa.
        </p>

        <a
          href="https://www.primecorp.cl"
          target="_blank"
          rel="noreferrer"
          onClick={cerrar}
          className="block w-full text-center bg-[#C9A84C] hover:bg-[#b8973e] text-gray-900 font-semibold text-sm py-2.5 rounded-xl transition-colors"
        >
          Conocer más
        </a>

        <button
          onClick={cerrar}
          className="block w-full text-center text-xs text-gray-400 hover:text-gray-600 mt-3 transition-colors"
        >
          Continuar a la app
        </button>
      </div>
    </div>
  )
}
