# Madeira Green & Blue - Booking Manager

## System Overview
This application now uses a **Client-Server Architecture**:
*   **Frontend**: React (Vite) running on Port **5174**.
*   **Backend**: Node.js (Express) running on Port **3001**.
*   **Database**: JSON file located at `server/db.json`.

---

## 🚀 How to Start the App

You need to run **two separate terminals** to start the application (one for the server, one for the interface).

### Step 1: Start the Backend Server (Terminal 1)
This manages the data. It must be running for the app to work.
```bash
node server/index.js
```
*You should see: `API Server running on port 3001`*

### Step 2: Start the Frontend Interface (Terminal 2)
This launches the website you interact with.
```bash
npm run dev
```
*You should see: `Network: http://192.168.1.17:5174/`*

---

## 📱 Accessing the App

*   **On this PC**: [http://localhost:5174](http://localhost:5174)
*   **On Mobile/Other Devices**: Use the **Network URL** shown in the Frontend terminal (e.g., `http://192.168.1.17:5174`).

> **Note**: Since data is now stored on the server (`server/db.json`), all devices will see the **same data** instantly!

---


---

## 🔒 One-Time Setup for Network Access
If other devices cannot create bookings, your Windows Firewall is likely blocking the API.

Run this **once** in **PowerShell as Administrator**:
```powershell
New-NetFirewallRule -DisplayName "Booking App API" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
```

---

## ⚠️ Troubleshooting

**"Failed to fetch data"**
*   Ensure the **Backend Server** (Step 1) is running.
*   Check if the terminal shows any errors.

**"Port already in use"**
*   If Port 3001 or 5174 is busy, you may need to stop old processes:
    *   Press `Ctrl + C` in the terminals.
    *   Or run `taskkill /F /IM node.exe` (Windows) to force stop everything.

## 🔑 Environment Configuration (Supabase)

This project uses **Supabase** for the database. You must configure environment variables to connect.

### 1. Root `.env.example`
A template is provided in the root directory. Copy this to create your real `.env` files.

### 2. Backend (`server/.env`)
Create this file in the `server` folder. It requires the **Service Role Key** (admin access) for backend operations.
```
SUPABASE_URL=your_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```
> ⚠️ **SECURITY WARNING**: Never expose the Service Role Key to the frontend.

### 3. Frontend (`.env`)
Create this file in the root folder. It uses the **Anon Key** (public access).
```
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

> **Note**: These files are ignored by Git to protect your secrets.
