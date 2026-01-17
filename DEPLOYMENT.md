# GrowMore Deployment Guide

## Overview
- **Frontend**: Firebase Hosting
- **Backend**: Railway or Render
- **Database**: Supabase (already hosted)

---

## Frontend Deployment (Firebase Hosting)

### Prerequisites
1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

### Deploy Steps

1. Navigate to frontend directory:
   ```bash
   cd growmore-frontend
   ```

2. Update `.env.production` with your backend URL:
   ```env
   NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app/api/v1
   NEXT_PUBLIC_WS_URL=wss://your-backend-url.railway.app/api/v1/ws
   ```

3. Build and deploy:
   ```bash
   npm run deploy
   ```

   Or manually:
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

### Firebase URLs
After deployment, your app will be available at:
- https://grow-more-ai.web.app
- https://grow-more-ai.firebaseapp.com

---

## Backend Deployment

### Option 1: Railway (Recommended)

1. Create account at [railway.app](https://railway.app)

2. Install Railway CLI:
   ```bash
   npm install -g @railway/cli
   railway login
   ```

3. Deploy from backend directory:
   ```bash
   cd growmore-backend
   railway init
   railway up
   ```

4. Set environment variables in Railway Dashboard:
   ```
   # Required
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_KEY=your_supabase_service_key
   FIREBASE_PROJECT_ID=grow-more-ai
   FIREBASE_CLIENT_EMAIL=your_firebase_client_email
   FIREBASE_PRIVATE_KEY="your_firebase_private_key"

   # AI Services
   GROQ_API_KEY=your_groq_api_key

   # Production Settings
   APP_ENV=production
   DEBUG=false
   CORS_ORIGINS=["https://grow-more-ai.web.app","https://grow-more-ai.firebaseapp.com"]
   ENABLE_SCHEDULER=true
   ```

5. Get your Railway URL from the dashboard (e.g., `https://growmore-api.railway.app`)

### Option 2: Render

1. Create account at [render.com](https://render.com)

2. Connect your GitHub repository

3. Create a new Web Service:
   - Environment: Python
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

4. Set environment variables in Render Dashboard (same as Railway)

5. Deploy from the Render dashboard

---

## Environment Variables Reference

### Frontend (.env.production)
```env
NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api/v1
NEXT_PUBLIC_WS_URL=wss://your-backend.railway.app/api/v1/ws
NEXT_PUBLIC_FIREBASE_API_KEY=your_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=grow-more-ai.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=grow-more-ai
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=grow-more-ai.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### Backend (Railway/Render)
```env
# App Config
APP_NAME=GrowMore
APP_ENV=production
DEBUG=false
API_V1_PREFIX=/api/v1

# Supabase
SUPABASE_URL=your_url
SUPABASE_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# Firebase Admin
FIREBASE_PROJECT_ID=grow-more-ai
FIREBASE_CLIENT_EMAIL=your_email
FIREBASE_PRIVATE_KEY="your_key"

# AI
GROQ_API_KEY=your_key
GROQ_MODEL=llama-3.1-70b-versatile

# CORS
CORS_ORIGINS=["https://grow-more-ai.web.app","https://grow-more-ai.firebaseapp.com"]

# Scheduler
ENABLE_SCHEDULER=true
SCRAPE_INTERVAL_MINUTES=30
NEWS_SCRAPE_INTERVAL_MINUTES=15

# Logging
LOG_LEVEL=INFO
```

---

## Post-Deployment Checklist

- [ ] Frontend loads at Firebase URL
- [ ] Backend health check passes: `https://your-backend/health`
- [ ] API docs available (if enabled): `https://your-backend/docs`
- [ ] User registration/login works
- [ ] Stock data loads on dashboard
- [ ] News articles display
- [ ] Admin panel accessible

---

## Troubleshooting

### CORS Errors
Ensure `CORS_ORIGINS` in backend includes your Firebase URLs.

### 502/503 Errors
Check Railway/Render logs for startup errors. Common issues:
- Missing environment variables
- Invalid Firebase private key format
- Supabase connection issues

### Build Failures
- Frontend: Check `next.config.js` settings
- Backend: Ensure all dependencies in `requirements.txt`

---

## Useful Commands

```bash
# Frontend
npm run dev          # Local development
npm run build        # Build for production
npm run deploy       # Build + deploy to Firebase

# Backend (local)
uvicorn app.main:app --reload

# Firebase
firebase deploy --only hosting
firebase hosting:channel:deploy preview  # Preview channel

# Railway
railway logs         # View logs
railway status       # Check status
```
