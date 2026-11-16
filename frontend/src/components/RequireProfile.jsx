import { Navigate, Outlet } from 'react-router-dom'
import { useSelectedProfile } from '../context/SelectedProfileContext'

/** Rutas que necesitan un perfil elegido; sin selección se vuelve a /profiles. */
export default function RequireProfile() {
  const { selectedId } = useSelectedProfile()
  return selectedId ? <Outlet /> : <Navigate to="/profiles" replace />
}
