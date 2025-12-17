# Lookbook - Talent & Project Showcase

A full-stack application for showcasing team member profiles and projects, built with React, Express, and PostgreSQL.

## 🚀 Quick Start (New Team Members Start Here!)

**First time setup:**
```bash
./quick-start.sh segundo
```

**Daily startup (2 commands):**
```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

**That's it!** Open the URL shown in Terminal 2 (usually http://localhost:5175 or 5176).

📖 **See [START_HERE.md](START_HERE.md) for detailed setup instructions**  
✅ **See [STARTUP_CHECKLIST.md](STARTUP_CHECKLIST.md) for troubleshooting**

---

## Detailed Setup (if you need manual control)

### 1. Install Dependencies
```bash
npm run install:all
```

### 2. Configure Database

The quick-start script handles this automatically, but if you need to do it manually:

```bash
cd backend
npm run db:segundo    # Connect to segundo database
# OR
npm run db:local      # Connect to local database
```

See [DATABASE_CONFIG.md](DATABASE_CONFIG.md) for more details.

### 3. Start Development Servers

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 4. Access the Application

- **Frontend**: http://localhost:5175 (or next available port)
- **Admin Portal**: /admin route
- **Backend API**: http://localhost:4002/api

**Note:** The frontend auto-selects an available port (5175, 5176, etc.). In development mode, the backend accepts connections from any localhost port, so this works seamlessly.

## Documentation

Detailed documentation is available in the `private-docs/` folder (not tracked in git):
- Setup guides
- Database configuration
- Deployment instructions
- Feature documentation

## Project Structure

```
lookbook/
├── frontend/           # Vite React application
├── backend/            # Express API server
├── database/           # SQL schema files
└── private-docs/       # Documentation (gitignored)
```

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express, PostgreSQL
- **Database**: PostgreSQL

## Security

- Never commit `.env` files
- Store sensitive documentation in `private-docs/`
- Use environment variables for all credentials

## License

MIT
