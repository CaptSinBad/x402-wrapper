# DB directory

This folder contains the SQL schema and migrations for the x402-wrapper project.

-- `schema.sql` - canonical schema for local development or snapshot.
-- `migrations_sql/001_init.sql` - initial migration to create required tables. (Note: `db/migrations` was occupied in this repo; using `migrations_sql` folder.)

Notes:
- `gen_random_uuid()` requires the `pgcrypto` extension. If your Postgres doesn't have it, enable it with `CREATE EXTENSION IF NOT EXISTS pgcrypto;` or use `uuid_generate_v4()` from `uuid-ossp`.
- Add migration runner (e.g., `node-pg-migrate`, `nestjs/migrations`, or Flyway) to your CI pipeline.
