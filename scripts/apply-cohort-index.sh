#!/bin/bash
# Script to apply the cohort filtering performance index
# This optimizes queries when filtering by initiatives (e.g., "SMB Winter 2025")

set -e

echo "🚀 Applying cohort filtering performance index..."
echo ""

# Check if we're in the right directory
if [ ! -f "backend/db/dbConfig.js" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Get database connection details from environment or config
# You may need to adjust this based on your setup
if [ -f "backend/.env" ]; then
    source backend/.env
fi

# Default to using psql with connection string
if [ -z "$DATABASE_URL" ] && [ -z "$DB_HOST" ]; then
    echo "⚠️  Warning: No database connection found in environment"
    echo "   Please set DATABASE_URL or DB_* environment variables"
    echo ""
    echo "   Example:"
    echo "   export DATABASE_URL='postgresql://user:pass@host:5432/dbname'"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Apply the migration
MIGRATION_FILE="database/migrations/add_cohort_filtering_index.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Error: Migration file not found: $MIGRATION_FILE"
    exit 1
fi

echo "📄 Reading migration file: $MIGRATION_FILE"
echo ""

# Try to apply using psql
if command -v psql &> /dev/null; then
    if [ -n "$DATABASE_URL" ]; then
        echo "🔌 Connecting to database using DATABASE_URL..."
        psql "$DATABASE_URL" -f "$MIGRATION_FILE"
    elif [ -n "$DB_HOST" ]; then
        echo "🔌 Connecting to database: $DB_HOST:$DB_PORT/$DB_NAME"
        export PGPASSWORD="$DB_PASSWORD"
        psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_FILE"
    else
        echo "⚠️  psql found but no connection details. Please run manually:"
        echo "   psql <connection-string> -f $MIGRATION_FILE"
        exit 1
    fi
else
    echo "⚠️  psql not found. Please apply the migration manually:"
    echo ""
    echo "   psql <your-connection-string> -f $MIGRATION_FILE"
    echo ""
    echo "   Or use your database management tool to run the SQL in:"
    echo "   $MIGRATION_FILE"
    exit 1
fi

echo ""
echo "✅ Migration applied successfully!"
echo ""
echo "📊 To verify the indexes were created, run:"
echo "   psql <connection-string> -c \"\\d+ lookbook_projects\" | grep cohort"
echo ""
echo "🎯 Expected indexes:"
echo "   - idx_lookbook_projects_status_cohort_created"
echo "   - idx_lookbook_projects_active_cohort_created"
echo ""
