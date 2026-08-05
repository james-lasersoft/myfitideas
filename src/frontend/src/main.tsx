import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/brand-tokens.css'
import './index.css'
import './styles/brand-components.css'
import './styles/all-pages-brand.css'
import './styles/premium-polish.css'
import './styles/locale.css'
import './styles/hydration-compact-gauge.css'
import { LocaleProvider } from './i18n/LocaleContext'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LocaleProvider>
      <App />
    </LocaleProvider>
  </StrictMode>,
)
