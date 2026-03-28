# Polyglot Vocab

Traductor con IA (Gemini) + tarjetas de vocabulario.

## Arquitectura

```
frontend/  → React + Vite + Tailwind (Vercel)
backend/   → Express proxy a Gemini (Railway)
```

## Setup local

### Backend
```bash
cd backend
cp .env.example .env        # Pega tu GEMINI_API_KEY
npm install
npm run dev                  # → http://localhost:3001
```

### Frontend
```bash
cd frontend
cp .env.example .env.local   # Apunta a localhost:3001
npm install
npm run dev                   # → http://localhost:5173
```

## Deploy

### Railway (backend)
1. Conecta el repo → selecciona `backend/` como root directory
2. Agrega variable: `GEMINI_API_KEY`
3. Agrega variable: `FRONTEND_URL=https://tu-app.vercel.app`

### Vercel (frontend)
1. Conecta el repo → selecciona `frontend/` como root directory
2. Agrega variable: `VITE_API_URL=https://tu-backend.railway.app`
