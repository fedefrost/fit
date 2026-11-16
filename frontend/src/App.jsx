import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import RequireProfile from './components/RequireProfile'
import { SelectedProfileProvider, useSelectedProfile } from './context/SelectedProfileContext'
import { SECTIONS } from './lib/sections'
import MenuPage from './pages/MenuPage'
import ProfilesPage from './pages/ProfilesPage'
import SectionPage from './pages/SectionPage'

/** "/" y rutas desconocidas: al menú si hay perfil elegido, si no a /profiles. */
function HomeRedirect() {
  const { selectedId } = useSelectedProfile()
  return <Navigate to={selectedId ? '/menu' : '/profiles'} replace />
}

export default function App() {
  return (
    <SelectedProfileProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/profiles" element={<ProfilesPage />} />
            <Route element={<RequireProfile />}>
              <Route path="/menu" element={<MenuPage />} />
              {SECTIONS.map(({ key, path }) => (
                <Route key={key} path={path} element={<SectionPage sectionKey={key} />} />
              ))}
            </Route>
          </Route>
          <Route path="*" element={<HomeRedirect />} />
        </Routes>
      </BrowserRouter>
    </SelectedProfileProvider>
  )
}
