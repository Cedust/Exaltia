import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './ui/App.tsx'
import { ErrorBoundary, ErrorOverlay } from './ui/ErrorOverlay'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorOverlay />
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
