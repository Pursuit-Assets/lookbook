# ✅ Startup Checklist

Use this checklist to ensure smooth startup every time.

## Quick Reference

### Daily Startup (2 commands)
```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

**Done!** Open the URL shown in Terminal 2.

---

## First Time Setup Checklist

Only need to do this once:

- [ ] Run `./quick-start.sh segundo` from project root
- [ ] Verify you see "✅ Setup Complete!"
- [ ] Verify backend/.env file exists

---

## Troubleshooting Checklist

### ❌ Frontend shows no data

- [ ] Is backend running? (Check Terminal 1 for "Lookbook API Server Running")
- [ ] Is backend on port 4002? (Check the startup message)
- [ ] Did backend connect to database? (Look for "📊 Connected to PostgreSQL database")
- [ ] Try refreshing the browser (Cmd+R or Ctrl+R)
- [ ] Check browser console for errors (F12 → Console tab)

### ❌ Backend won't start

- [ ] Is port 4002 already in use? (Check with: `lsof -i :4002`)
- [ ] Does backend/.env exist? (Run: `ls backend/.env`)
- [ ] Is DATABASE_URL set? (Run: `cd backend && npm run db:check`)
- [ ] Are dependencies installed? (Run: `cd backend && npm install`)

### ❌ Database connection fails

- [ ] Is DATABASE_URL set correctly in backend/.env?
- [ ] Can you reach the database server? (Check network/VPN)
- [ ] Are credentials correct? (Check with team lead)
- [ ] Try re-running setup: `cd backend && npm run db:segundo`

### ❌ CORS errors in browser console

- [ ] Is NODE_ENV set to "development" in backend/.env?
- [ ] Is backend actually running on port 4002?
- [ ] Try restarting the backend (Ctrl+C then `npm run dev`)
- [ ] Check backend/server.js has the flexible CORS config (should allow all localhost ports)

---

## Connection Flow

Understanding how the pieces connect:

```
Browser (localhost:5175+)
    ↓
Frontend React App
    ↓ HTTP requests to localhost:4002/api
Backend Express Server
    ↓ SQL queries
PostgreSQL Database (segundo-db)
```

1. **Frontend** makes API calls to backend
2. **Backend** queries the database
3. **Database** returns data
4. **Backend** sends JSON to frontend
5. **Frontend** displays data to user

Each piece must be running for the app to work!

---

## Verification Steps

After starting both servers:

1. ✅ Backend shows "🚀 Lookbook API Server Running"
2. ✅ Backend shows "📊 Connected to PostgreSQL database"
3. ✅ Frontend shows "➜ Local: http://localhost:XXXX/"
4. ✅ Browser opens and loads the page
5. ✅ You see profiles and projects (may take 1-2 seconds to load)

---

## Environment Variables Reference

### Backend (.env)
```bash
PORT=4002                                    # Backend port
NODE_ENV=development                         # Enables flexible CORS
DATABASE_URL=postgresql://...                # Database connection
FRONTEND_URL=http://localhost:5175          # Frontend URL (any localhost port works in dev)
```

### Frontend (optional .env)
```bash
VITE_API_URL=http://localhost:4002/api      # Backend API URL (default)
```

The frontend uses sensible defaults, so usually no .env file is needed.

---

## Tips for Success

### Use Terminal Tabs/Windows
- Keep backend in one terminal
- Keep frontend in another terminal
- This makes it easy to see logs from both

### Watch the Logs
- Backend logs show API requests and database queries
- Frontend logs show build info and any errors
- Errors usually appear in red

### Port Conflicts Are Normal
- If 5175 is taken, Vite auto-selects 5176, 5177, etc.
- This is fine! CORS allows any localhost port in development
- Just use whatever URL the frontend terminal shows

### Don't Commit .env Files
- .env files contain secrets and local config
- They're in .gitignore for security
- Each developer has their own .env

---

## Getting Help

1. Check this checklist
2. Read START_HERE.md
3. Read DATABASE_CONFIG.md
4. Check with your team lead

---

**Last Updated:** December 17, 2024

