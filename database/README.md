# Database Architecture: QueueFlow

This directory houses the schema definitions, relational migrations, and database connection logic for QueueFlow.

## Tables Overview

1. **`users`**: Customer identities with phone authentication identifiers.
2. **`tenant_configs`**: Multi-tenant business definitions (Apex Clinic, Metro Bank, Civic Hub, Apple Genius).
3. **`queue_entries`**: Active tickets with 5-tier priority scores (`priority_score: 1-5`), dynamic ML wait times, and explainable AI triage justifications.
4. **`consent_upgrades`**: Autonomous slot recapture records tracking 5-minute decision windows and recovered service minutes.
5. **`audit_logs`**: Tamper-evident ledger of every automated triage scoring, prompt input, and operator manual override.

## Running with Supabase / PostgreSQL

1. Copy the contents of `schema.sql` into the Supabase SQL Editor.
2. Set your environment variables in `.env`:
   ```bash
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your-anon-or-service-key
   ```
3. Run the seed script:
   ```bash
   python -m database.seed
   ```
