import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import RequireProfile from './components/RequireProfile'
import { DietProvider } from './context/DietContext'
import { WorkoutProvider } from './context/WorkoutContext'
import { SelectedProfileProvider, useSelectedProfile } from './context/SelectedProfileContext'
import { SECTIONS } from './lib/sections'
import DietPage from './pages/DietPage'
import HistoryPage from './pages/HistoryPage'
import MenuPage from './pages/MenuPage'
import ProfilesPage from './pages/ProfilesPage'
import RoutinePage from './pages/RoutinePage'
import ShoppingPage from './pages/ShoppingPage'
import SectionPage from './pages/SectionPage'

/** "/" y rutas desconocidas: al menú si hay perfil elegido, si no a /profiles. */
function HomeRedirect() {
  const { selectedId } = useSelectedProfile()
  return <Navigate to={selectedId ? '/menu' : '/profiles'} replace />
}

// Secciones con página propia; el resto mostraría "Próximamente".
const SECTION_PAGES = { diet: <DietPage />, routine: <RoutinePage />, history: <HistoryPage />, shopping: <ShoppingPage /> }

export default function App() {
  return (
    <SelectedProfileProvider>
      <DietProvider>
        <WorkoutProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/profiles" element={<ProfilesPage />} />
              <Route element={<RequireProfile />}>
                <Route path="/menu" element={<MenuPage />} />
                {SECTIONS.map(({ key, path }) => (
                  <Route key={key} path={path} element={SECTION_PAGES[key] ?? <SectionPage sectionKey={key} />} />
                ))}
              </Route>
            </Route>
            <Route path="*" element={<HomeRedirect />} />
          </Routes>
        </BrowserRouter>
        </WorkoutProvider>
      </DietProvider>
    </SelectedProfileProvider>
  )
}
