# 🚨 URGENT: Database Migration Required

## ⚠️ Current Status

Your HSE Management System has **TypeScript compilation errors** because the database tables don't exist yet.

**Error Summary:**
- ❌ `activity_groups` table not found
- ❌ `measures` table not found
- ❌ `incidents` table not found
- ❌ `employee_activity_assignments` table not found
- ❌ `activity_risk_links` table not found
- ❌ `activity_training_requirements` table not found

**Why?** The migration SQL file was created but **not yet run** in your Supabase database.

---

## ✅ Solution: Apply Migration in 3 Steps

### Step 1: Open Supabase SQL Editor

1. Go to https://supabase.com/dashboard
2. Log in to your account
3. Select your HSE project
4. Click **SQL Editor** in the left sidebar

### Step 2: Copy Migration SQL

1. Open this file in your code editor:
   ```
   supabase/migrations/20251115000002_complete_hse_setup.sql
   ```

2. Copy **ALL contents** (entire file, 600+ lines)

### Step 3: Run Migration

1. Paste the SQL into Supabase SQL Editor
2. Click the **RUN** button (or press `Ctrl+Enter`)
3. Wait for completion (should take 5-10 seconds)
4. Look for success message:
   ```
   ✅ HSE Management System database setup completed successfully!
   ```

---

## 🔍 Verify Migration Success

Run this query in SQL Editor to verify tables were created:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'activity_groups', 
    'employee_activity_assignments', 
    'measures', 
    'incidents', 
    'activity_risk_links', 
    'activity_training_requirements'
);
```

**Expected result**: 6 rows showing all table names

---

## 🔄 After Migration: Regenerate Types

Once migration is successful, regenerate TypeScript types:

### Option A: Using npx
```bash
cd "d:\Fiver clients\hse new client\hse-hub-main\hse-hub-main"
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/integrations/supabase/types.ts
```

### Option B: Using Supabase CLI
```bash
cd "d:\Fiver clients\hse new client\hse-hub-main\hse-hub-main"
supabase login
supabase link --project-ref YOUR_PROJECT_REF
npx supabase gen types typescript --local > src/integrations/supabase/types.ts
```

### Find Your Project ID
1. Supabase Dashboard → Project Settings → General
2. Look for **Reference ID** (format: `abcdefghijklmnop`)

---

## ✨ What Will Happen After Migration

### Immediate Effects
1. ✅ All TypeScript errors will disappear
2. ✅ Type definitions for new tables will be available
3. ✅ All pages will work without errors

### New Capabilities Unlocked
1. ✅ Activity Groups module fully functional
2. ✅ Measures tracking operational
3. ✅ Incident reporting with auto-generated numbers
4. ✅ Automation workflows enabled
5. ✅ Training auto-assignment from risks
6. ✅ Task auto-creation from audits

---

## 📊 What the Migration Creates

### 6 New Tables
```sql
activity_groups              -- Work activities with hazards and PPE
employee_activity_assignments -- Employee → Activity mappings
measures                     -- Corrective/preventive actions
incidents                    -- Workplace incidents with investigation
activity_risk_links         -- Activity → Risk automation
activity_training_requirements -- Activity → Training automation
```

### 4 New Enums
```sql
measure_type        -- preventive, corrective, improvement
measure_status      -- planned, in_progress, completed, cancelled
incident_type       -- injury, near_miss, property_damage, environmental, other
incident_severity   -- minor, moderate, serious, critical, fatal
```

### 20+ RLS Policies
All tables have Row Level Security enabled with policies for:
- SELECT (view own company data)
- INSERT (create records)
- UPDATE (modify records)
- DELETE (remove records)

### 1 Automation Trigger
```sql
generate_incident_number()  -- Auto-generates: 2025-0001, 2025-0002, etc.
```

---

## 🚨 Troubleshooting

### Error: "relation 'public.companies' does not exist"
**Problem**: Base schema not created yet

**Solution**: Run the initial migration first:
```bash
supabase/migrations/20251114160236_5da6f4a0-a62c-4638-b356-df4d183aeff4.sql
```

Then run the HSE migration.

### Error: "type already exists"
**Problem**: Migration was partially run before

**Solution**: Use the clean migration file:
```bash
supabase/migrations/20251115000002_complete_hse_setup.sql
```

This file has `DROP ... IF EXISTS` statements to handle re-runs.

### Error: Permission denied
**Problem**: Not logged into Supabase

**Solution**: 
1. Run `supabase login` first
2. Then run migration

### Error: Project not linked
**Problem**: Supabase CLI doesn't know which project to use

**Solution**:
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

---

## 📝 Checklist

Before proceeding:
- [ ] I have a Supabase account
- [ ] I have created a Supabase project
- [ ] I can access the SQL Editor
- [ ] I have copied the migration SQL
- [ ] I have run the migration
- [ ] I see the success message
- [ ] I have verified tables exist
- [ ] I have regenerated TypeScript types
- [ ] I have restarted the dev server

After completing checklist:
- [ ] All TypeScript errors are gone
- [ ] I can navigate to Activity Groups page
- [ ] I can navigate to Measures page
- [ ] I can navigate to Incidents page
- [ ] I can create test records

---

## 🎯 Next Steps After Migration

1. **Restart Development Server**
   ```bash
   npm run dev
   ```

2. **Test New Modules**
   - Navigate to Activity Groups
   - Create a test activity
   - Navigate to Measures
   - Create a test measure
   - Navigate to Incidents
   - Report a test incident

3. **Configure Automation**
   - Link activities to risks
   - Define training requirements
   - Assign employees to activities

4. **Deploy to Production**
   - Follow PRODUCTION_DEPLOYMENT_GUIDE.md
   - Run migration on production database
   - Regenerate types for production

---

## 💡 Tips

- **Backup First**: Before running migration, backup your database
- **Test Environment**: Run migration in development first
- **Version Control**: Commit migration file to git
- **Document Changes**: Keep track of what was created
- **Monitor Logs**: Check Supabase logs after migration

---

## 📞 Still Having Issues?

1. Check Supabase logs: Dashboard → Logs
2. Review migration file line by line
3. Test individual table creation
4. Check RLS policies with test queries
5. Verify foreign key relationships

---

**Created**: November 15, 2025  
**Priority**: CRITICAL - Blocks all new features  
**Estimated Time**: 10 minutes  
**Difficulty**: Easy  
**Status**: ⏳ **AWAITING ACTION**
