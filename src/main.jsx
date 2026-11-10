import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

if ('serviceWorker' in navigator) {\n  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}); });\n}\n\ncreateRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
