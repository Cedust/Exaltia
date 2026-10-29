import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './ui/App.tsx'
import { fitPhone } from './fitPhone'
import { ErrorBoundary, ErrorOverlay } from './ui/ErrorOverlay'

fitPhone()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorOverlay />
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
