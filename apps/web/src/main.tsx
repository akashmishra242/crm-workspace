import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { startUpdateChecks } from './lib/appUpdate'
import './styles/index.css'

const container = document.getElementById('root')
if (!container) throw new Error('Missing #root element in index.html')

// Finds new deploys and switches to them at a moment that can't lose anyone's work.
startUpdateChecks()

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
