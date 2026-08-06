import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ToasterProvider } from '@/components/shared/Toaster'
import ErrorBoundary from '@/components/shared/ErrorBoundary'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ToasterProvider>
        <App />
      </ToasterProvider>
    </ErrorBoundary>
  </StrictMode>,
)
