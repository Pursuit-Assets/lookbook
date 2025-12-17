# 🚀 Quick Start Guide

This guide gets your Lookbook app running in under 2 minutes.

## First Time Setup

Run this once to configure your database connection:

```bash
./quick-start.sh segundo
```

This will:
- ✅ Check dependencies
- ✅ Install packages (if needed)
- ✅ Test database connection
- ✅ Configure environment

## Starting the App (Every Time)

Open **two terminal windows** and run:

### Terminal 1 - Backend
```bash
cd backend
npm run dev
```

### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
```

**That's it!** The app will open at the URL shown in Terminal 2 (usually `http://localhost:5175` or `http://localhost:5176`).

---

## Troubleshooting

### "No profiles or projects showing up"

1. Check that **both** backend and frontend are running
2. Look for errors in the backend terminal
3. Test the database connection:
   ```bash
   cd backend
   npm run db:check
   ```

### "Port already in use"

The frontend will automatically find the next available port (5175, 5176, etc.). This is normal and will work fine.

### "CORS error" or "Network error"

The backend is configured to accept connections from any localhost port in development. If you see CORS errors:

1. Make sure the backend is running on port 4002
2. Check that `NODE_ENV=development` is set in `backend/.env`
3. Restart the backend: Stop it (Ctrl+C) and run `npm run dev` again

### "Database connection failed"

Run the database setup again:
```bash
cd backend
npm run db:segundo
```

If still failing, check with your team lead for updated database credentials.

---

## Useful Commands

All commands should be run from the `backend/` directory:

```bash
# Test database connection
npm run db:check

# Switch to segundo database (production)
npm run db:segundo

# Switch to local database
npm run db:local

# View available npm scripts
npm run
```

---

## What Each Server Does

- **Backend** (port 4002): API server that talks to the PostgreSQL database
- **Frontend** (port 5175+): React app that users interact with

The frontend makes API calls to the backend, which queries the database and returns data.

---

## Need More Help?

- 📖 See `DATABASE_CONFIG.md` for database setup details
- 🔧 See `README.md` for full documentation
- 👥 Ask your team lead for support

---

**Last Updated:** December 17, 2024

