import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/brand-tokens.css'
import './index.css'
import './styles/brand-components.css'
import './styles/all-pages-brand.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
