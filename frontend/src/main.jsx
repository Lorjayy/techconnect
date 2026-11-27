import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './index.css'
import App from './App.jsx'
import { disconnectSocket } from './socket'

axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

// A rejected login token (expired, or the account was deleted) sends you back to login
axios.interceptors.response.use(undefined, (err) => {
  if (err.response?.status === 401 && err.config?.headers?.Authorization) {
    localStorage.removeItem('token')
    localStorage.removeItem('userId')
    disconnectSocket()
    window.location.hash = '#/login'
  }
  return Promise.reject(err)
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
