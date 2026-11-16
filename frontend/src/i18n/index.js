import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en'
import es from './es'

export const LANGUAGES = ['es', 'en']
const STORAGE_KEY = 'fit.language'

// Idioma guardado por el usuario; si no hay, el del navegador (inglés si empieza por "en", si no español).
function initialLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (LANGUAGES.includes(saved)) return saved
  } catch {
    // Almacenamiento bloqueado: se usa el idioma del navegador.
  }
  return navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'es'
}

i18n.use(initReactI18next).init({
  resources: { es: { translation: es }, en: { translation: en } },
  lng: initialLanguage(),
  fallbackLng: 'es',
  supportedLngs: LANGUAGES,
  interpolation: { escapeValue: false },
})

document.documentElement.lang = i18n.language

i18n.on('languageChanged', (language) => {
  document.documentElement.lang = language
  try {
    localStorage.setItem(STORAGE_KEY, language)
  } catch {
    // Sin almacenamiento el cambio dura solo esta visita.
  }
})

export default i18n
