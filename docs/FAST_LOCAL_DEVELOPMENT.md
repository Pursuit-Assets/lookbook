# Fast Local Development Setup

## The Problem
The remote database (segundo-db on Google Cloud) has **60+ second network latency**, making development slow and frustrating.

## The Solution: Use Local Database

Switching to a local PostgreSQL database will reduce query times from **60 seconds to < 100ms** - that's **600x faster**!

## Quick Setup

### Option 1: Use Existing Local Database (If You Have One)

```bash
cd backend
npm run db:local
```

This switches your `.env` to use `postgresql://postgres:postgres@localhost:5432/lookbook`

### Option 2: Set Up Local PostgreSQL

1. **Install PostgreSQL** (if not already installed):
   ```bash
   # macOS
   brew install postgresql@14
   brew services start postgresql@14
   
   # Or use Postgres.app (easier): https://postgresapp.com/
   ```

2. **Create the database**:
   ```bash
   createdb lookbook
   ```

3. **Import the schema** (if you have access to the schema files):
   ```bash
   psql lookbook < database/schema.sql
   ```

4. **Switch to local database**:
   ```bash
   cd backend
   npm run db:local
   ```

5. **Test the connection**:
   ```bash
   npm run db:check
   ```

### Option 3: Sync Data from Remote to Local (Best of Both Worlds)

You can periodically sync data from the remote database to your local one:

```bash
# Export from remote
pg_dump "postgresql://lookbook_user_new:qc34bfs2efegboo1@34.57.101.141:5432/segundo-db" -t lookbook_projects -t lookbook_profiles > data_dump.sql

# Import to local
psql lookbook < data_dump.sql
```

## Performance Comparison

| Database | First Request | Cached Request |
|----------|--------------|----------------|
| **Remote (segundo)** | 60-90 seconds | 0.07 seconds |
| **Local** | < 100ms | < 10ms |

## Current Optimizations (Work Even with Remote DB)

Even with the remote database, we've implemented:

1. ✅ **Backend caching** (10 minute TTL)
2. ✅ **Cache pre-warming** on server startup
3. ✅ **Connection pooling** optimization
4. ✅ **Query optimization** (removed expensive window functions)
5. ✅ **Stale cache fallback** (serves old data if query times out)

## Switching Back to Remote

If you need to test against production data:

```bash
cd backend
npm run db:segundo
```

## Troubleshooting

### "Connection refused" (Local Database)
- Make sure PostgreSQL is running: `brew services list` or check Postgres.app
- Verify database exists: `psql -l | grep lookbook`

### "Database doesn't exist"
```bash
createdb lookbook
```

### "Permission denied"
Make sure your local PostgreSQL user has access:
```bash
psql postgres
CREATE DATABASE lookbook;
GRANT ALL PRIVILEGES ON DATABASE lookbook TO postgres;
```

## Recommendation

**For daily development**: Use local database (fast, no network issues)  
**For testing production data**: Use remote database (slower but real data)
