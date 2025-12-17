# Database Configuration Guide

This guide helps you quickly set up and manage database connections for the Lookbook application.

## Quick Start

The easiest way to get started is to use the quick-start script:

```bash
# From the project root
./quick-start.sh segundo    # Use segundo production database (default)
./quick-start.sh local      # Use local PostgreSQL database
```

This script will:
1. ✅ Check that Node.js and npm are installed
2. 📦 Install dependencies (if needed)
3. 🗄️ Set up the database connection
4. 🧪 Test the connection
5. ✅ Create the `.env` file with proper configuration

## Database Profiles

### Segundo (Production Database)

The segundo database is hosted on Google Cloud Platform and contains production data.

**Connection Details:**
- Host: `34.57.101.141:5432`
- Database: `segundo-db`
- User: `lookbook_user_new`

**To set up:**
```bash
cd backend
npm run db:segundo
```

### Local Database

For local development with your own PostgreSQL instance.

**Default Connection:**
- Host: `localhost:5432`
- Database: `lookbook`
- User: `postgres`

**To set up:**
```bash
cd backend
npm run db:local
```

## Useful Commands

All commands should be run from the `backend/` directory:

```bash
# Test current database connection
npm run db:check

# Set up segundo database
npm run db:segundo

# Set up local database
npm run db:local

# Run the setup wizard
npm run db:setup
```

## Manual Setup

If you prefer to manually configure the database connection:

1. Copy the example environment file:
   ```bash
   cd backend
   cp env.example .env
   ```

2. Edit `.env` and set your `DATABASE_URL`:
   ```env
   DATABASE_URL=postgresql://user:password@host:5432/database
   ```

3. Test the connection:
   ```bash
   npm run db:check
   ```

## Troubleshooting

### Connection Timeout

If you see connection timeout errors:
- Check that the database server is running
- Verify your network connection
- Check firewall rules (especially for cloud databases)

### Authentication Failed

If you see authentication errors:
- Verify your username and password
- Check that the user has proper permissions
- Ensure you're using the correct database name

### Tables Not Found

If you see "table does not exist" errors:
- The database may need to be initialized
- Run the schema migration scripts from `database/` directory
- Contact the team lead for help with database setup

### Connection Refused (Local Database)

If connecting to `localhost` fails:
- Ensure PostgreSQL is installed and running
- Check that PostgreSQL is listening on port 5432
- Verify the local database exists

## Environment Variables

The backend uses these environment variables (configured in `.env`):

```env
# Server Configuration
PORT=4002                                    # Backend server port
NODE_ENV=development                         # Environment mode
FRONTEND_URL=http://localhost:5175          # Frontend URL for CORS

# Database Connection
DATABASE_URL=postgresql://user:pass@host:5432/db

# Admin Authentication (Optional)
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=
JWT_SECRET=your-secret-key
JWT_EXPIRY=7d

# AI Features (Optional)
OPENAI_API_KEY=

# CRM Integration (Optional)
CRM_WEBHOOK_URL=
CRM_WEBHOOK_AUTH=
```

## Multiple Environments

You can maintain multiple environment configurations:

```bash
# Create profiles
cp .env .env.segundo
cp .env .env.local

# Switch between them
cp .env.segundo .env     # Use segundo
cp .env.local .env       # Use local
```

Or use the npm scripts to switch automatically:
```bash
npm run db:segundo    # Switches to segundo
npm run db:local      # Switches to local
```

## Security Notes

⚠️ **Important Security Practices:**

1. Never commit `.env` files to version control
2. Use strong passwords for production databases
3. Rotate credentials regularly
4. Use read-only database users for reporting/analytics
5. Enable SSL for production database connections

## Getting Help

If you continue to have connection issues:

1. Run the diagnostic: `npm run db:check`
2. Check this guide's troubleshooting section
3. Verify credentials with the team lead
4. Check the backend logs for detailed error messages

---

**Last Updated:** December 17, 2024

