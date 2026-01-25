import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

console.log('Vite Env Debug:', {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    VITE_USE_SUPABASE_BOOKINGS: import.meta.env.VITE_USE_SUPABASE_BOOKINGS,
    VITE_USE_SUPABASE_VEHICLES: import.meta.env.VITE_USE_SUPABASE_VEHICLES,
    VITE_USE_SUPABASE_REFERENCE_DATA: import.meta.env.VITE_USE_SUPABASE_REFERENCE_DATA,
    MODE: import.meta.env.MODE
});

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
