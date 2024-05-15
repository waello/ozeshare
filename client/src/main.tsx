import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { SocketProvider } from './context/socket.tsx'
import {ToastContainer} from 'react-toastify'
import './leaflet-config'; // Import your Leaflet configuration

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SocketProvider>
      <>
        <App />
        <ToastContainer newestOnTop/>
      </>
    </SocketProvider>
  </React.StrictMode>,
)
