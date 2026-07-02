import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ToasterProvider } from '@/components/shared/Toaster'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToasterProvider>
      <App />
    </ToasterProvider>
  </StrictMode>,
)
