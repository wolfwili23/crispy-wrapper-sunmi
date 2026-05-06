import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import '@/utils/sunmiPrint.js' // Registra window.stampaScontrino per Sunmi T3 Pro Max

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)