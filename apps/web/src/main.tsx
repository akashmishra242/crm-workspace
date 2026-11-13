import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { App } from './App'
import './styles/index.css'

const container = document.getElementById('root')
if (!container) throw new Error('Missing #root element in index.html')

// A new deploy activates the new service worker and reloads, so the page never mixes
// an old cached shell with code chunks that no longer exist.
registerSW({ immediate: true })

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
