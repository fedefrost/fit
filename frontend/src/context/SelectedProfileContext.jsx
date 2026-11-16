import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { listProfiles } from '../api/profiles'

const STORAGE_KEY = 'fit.selectedProfileId'

function readStoredId() {
  try {
    const id = Number(sessionStorage.getItem(STORAGE_KEY))
    return Number.isInteger(id) && id > 0 ? id : null
  } catch {
    return null
  }
}

function writeStoredId(id) {
  try {
    if (id === null) sessionStorage.removeItem(STORAGE_KEY)
    else sessionStorage.setItem(STORAGE_KEY, String(id))
  } catch {
    // Sin almacenamiento la selección dura solo mientras la página esté abierta.
  }
}

const SelectedProfileContext = createContext(null)

/**
 * Perfil elegido en esta sesión del navegador. Se guarda solo el id en sessionStorage;
 * los datos (y su posición, que da el nombre "Perfil N") se piden a la API al recargar.
 */
export function SelectedProfileProvider({ children }) {
  const [selectedId, setSelectedId] = useState(readStoredId)
  const [selected, setSelected] = useState(null) // { profile, index }
  const [status, setStatus] = useState(selectedId ? 'loading' : 'idle') // idle | loading | ready | missing | error
  // Selección vigente, para descartar respuestas que llegan después de un clear() o select()
  // (p. ej. al recargar en /profiles: la carga del perfil guardado termina después de limpiarlo).
  const currentId = useRef(selectedId)

  const select = useCallback((profile, index) => {
    currentId.current = profile.id
    writeStoredId(profile.id)
    setSelectedId(profile.id)
    setSelected({ profile, index })
    setStatus('ready')
  }, [])

  const clear = useCallback(() => {
    currentId.current = null
    writeStoredId(null)
    setSelectedId(null)
    setSelected(null)
    setStatus('idle')
  }, [])

  const refresh = useCallback(async () => {
    if (!selectedId) return
    setStatus('loading')
    try {
      const profiles = await listProfiles()
      if (currentId.current !== selectedId) return
      const index = profiles.findIndex((item) => item.id === selectedId)
      if (index === -1) {
        writeStoredId(null)
        setSelected(null)
        setStatus('missing')
        return
      }
      setSelected({ profile: profiles[index], index })
      setStatus('ready')
    } catch {
      if (currentId.current === selectedId) setStatus('error')
    }
  }, [selectedId])

  // Al recargar la página hay id guardado pero no datos: se buscan una vez al montar.
  // (Después, select() trae los datos y "Reintentar" llama a refresh() a mano.)
  useEffect(() => {
    if (selectedId && !selected) refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const value = useMemo(
    () => ({ selectedId, selected, status, select, clear, refresh }),
    [selectedId, selected, status, select, clear, refresh],
  )

  return <SelectedProfileContext.Provider value={value}>{children}</SelectedProfileContext.Provider>
}

export function useSelectedProfile() {
  const context = useContext(SelectedProfileContext)
  if (!context) throw new Error('useSelectedProfile debe usarse dentro de <SelectedProfileProvider>')
  return context
}
