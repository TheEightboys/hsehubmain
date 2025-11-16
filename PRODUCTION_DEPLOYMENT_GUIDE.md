# HSE Management System - Production Deployment Guide

## 🎯 System Overview

This is a **complete, enterprise-grade HSE (Health, Safety & Environment) Management System** built with:
- **Frontend**: React 18 + TypeScript + Vite + ShadCN UI
- **Backend**: Supabase (PostgreSQL + Row Level Security + Edge Functions)
- **Authentication**: Supabase Auth with RBAC
- **State Management**: TanStack Query
- **Styling**: Tailwind CSS

## 📋 Current Implementation Status

### ✅ Completed Modules
1. **Landing Page** (`Index.tsx`) - Modern marketing page with features and pricing
2. **Authentication** (`Auth.tsx`) - Login/Signup with Supabase Auth
3. **Dashboard** (`Dashboard.tsx`) - Main overview with statistics and module cards
4. **Employees** (`Employees.tsx`) - Full CRUD for employee management
5. **Activity & Exposure Groups** (`ActivityGroups.tsx`) - Work activity definitions
6. **Risk Assessments** (`RiskAssessments.tsx`) - GBU risk assessment system
7. **Measures & Controls** (`Measures.tsx`) - Corrective/preventive action tracking
8. **Training** (`Training.tsx`) - Training records management
9. **Audits** (`Audits.tsx`) - Safety audit system
10. **Tasks** (`Tasks.tsx`) - Task tracking and assignments
11. **Incidents** (`Incidents.tsx`) - Incident reporting and investigation
12. **Reports** (`Reports.tsx`) - Analytics and compliance dashboards
13. **Settings** (`Settings.tsx`) - System configuration
14. **Messages** (`Messages.tsx`) - Internal messaging
15. **Documents** (`Documents.tsx`) - Document management

### 🔧 Database Schema Created
- ✅ `activity_groups` - Work activities with hazards and PPE requirements
- ✅ `employee_activity_assignments` - Employee to activity mappings
- ✅ `measures` - Corrective and preventive measures
- ✅ `incidents` - Incident tracking with auto-generated numbers
- ✅ `activity_risk_links` - Activity to risk assessment links for automation
- ✅ `activity_training_requirements` - Required training per activity

### ⚙️ Automation Functions Created
- ✅ `autoAssignTrainingFromRisk()` - Auto-assign training when risks are created
- ✅ `autoCreateTaskFromAuditFinding()` - Create tasks from audit findings
- ✅ `autoAssignMeasuresToEmployees()` - Assign measures based on activities
- ✅ `checkEmployeeTrainingCompliance()` - Check training compliance status

## 🚀 Deployment Steps

### Step 1: Apply Database Migration

You need to run the SQL migration to create the new tables in your Supabase database.

**Option A: Using Supabase Dashboard (Recommended)**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor**
4. Copy the entire contents of `supabase/migrations/20251115000001_add_missing_hse_tables.sql`
5. Paste into the SQL Editor
6. Click **Run** (or press Ctrl+Enter)
7. Verify all tables were created successfully

**Option B: Using Supabase CLI**
```powershell
cd "d:\Fiver clients\hse new client\hse-hub-main\hse-hub-main"

# Login to Supabase (if not already logged in)
supabase login

# Link your project (replace with your project ref)
supabase link --project-ref YOUR_PROJECT_REF

# Push migrations to database
supabase db push
```

### Step 2: Regenerate TypeScript Types

After the migration is applied, regenerate the TypeScript types:

```powershell
# Using Supabase CLI
supabase gen types typescript --project-id YOUR_PROJECT_ID > src/integrations/supabase/types.ts

# OR using npx
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/integrations/supabase/types.ts
```

### Step 3: Install Dependencies

Ensure all dependencies are installed:

```powershell
npm install
# OR
bun install
```

### Step 4: Configure Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Step 5: Build and Test

```powershell
# Development mode
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

## 🔒 Security Configuration

### Row Level Security (RLS) Policies

All new tables have RLS enabled with these policies:

1. **SELECT**: Users can view records from their company
2. **INSERT**: Company admins can create records
3. **UPDATE**: Company admins and assigned employees can update
4. **DELETE**: Only company admins can delete

### Role-Based Access Control (RBAC)

Three roles are implemented:
- **super_admin**: Full system access
- **company_admin**: Full access to company data
- **employee**: Limited access to assigned records

## 📊 Database Tables Reference

### activity_groups
```sql
- id: UUID
- company_id: UUID (FK to companies)
- name: VARCHAR(255)
- description: TEXT
- hazards: TEXT[] (array)
- required_ppe: TEXT[] (array)
- created_at, updated_at: TIMESTAMP
```

### employee_activity_assignments
```sql
- id: UUID
- employee_id: UUID (FK to employees)
- activity_group_id: UUID (FK to activity_groups)
- assigned_date: TIMESTAMP
- UNIQUE(employee_id, activity_group_id)
```

### measures
```sql
- id: UUID
- company_id: UUID
- title: VARCHAR(255)
- description: TEXT
- measure_type: ENUM (preventive, corrective, improvement)
- status: ENUM (planned, in_progress, completed, cancelled)
- risk_assessment_id: UUID (nullable FK)
- audit_id: UUID (nullable FK)
- incident_id: UUID (nullable FK)
- responsible_person_id: UUID (FK to employees)
- due_date: DATE
- completion_date: DATE
- verification_method: TEXT
- attachments: JSONB
```

### incidents
```sql
- id: UUID
- company_id: UUID
- incident_number: VARCHAR(50) UNIQUE (auto-generated: YYYY-0001)
- title: VARCHAR(255)
- description: TEXT
- incident_type: ENUM (injury, near_miss, property_damage, environmental, other)
- severity: ENUM (minor, moderate, serious, critical, fatal)
- incident_date: TIMESTAMP
- location: VARCHAR(255)
- department_id: UUID (FK)
- affected_employee_id: UUID (FK)
- witness_ids: UUID[] (array)
- reported_by_id: UUID (FK)
- root_cause: TEXT
- contributing_factors: TEXT[]
- immediate_actions: TEXT
- investigation_status: VARCHAR(50) (open, in_progress, closed)
- investigation_completed_date: DATE
- attachments, photos: JSONB
```

## 🔄 Automation Workflows

### 1. Risk Assessment → Training Assignment
When a risk assessment is created and linked to an activity:
1. System checks `activity_training_requirements` table
2. Finds all employees assigned to that activity via `employee_activity_assignments`
3. Auto-creates training records in `training_records` table
4. Employees receive notification of new training requirements

### 2. Audit Finding → Task Creation
When an audit is completed with findings:
1. Audit finding description is captured
2. System auto-creates a task in `tasks` table
3. Task is assigned to department head or auditor
4. Due date is set (default 7 days)
5. Priority is set based on audit status

### 3. Measure → Employee Assignment
When a measure is created:
1. System checks what the measure is linked to (risk/audit/incident)
2. Finds related activities via `activity_risk_links`
3. Gets employees assigned to those activities
4. Auto-assigns measure to relevant employees

## 🎨 UI Components Architecture

### Component Library: ShadCN UI
All UI components are located in `src/components/ui/` and include:
- Forms: Input, Select, Checkbox, Radio, Switch, Textarea
- Layout: Card, Tabs, Accordion, Sheet, Dialog
- Data: Table, Badge, Progress, Avatar
- Feedback: Alert, Toast, Skeleton
- Navigation: Button, Dropdown, Context Menu, Breadcrumb

### Reusable Patterns
```tsx
// Standard page structure
<div className="p-8">
  <div className="mb-8 flex items-center justify-between">
    <h2 className="text-3xl font-bold">Page Title</h2>
    <Button>Action</Button>
  </div>
  
  <Card>
    <CardHeader>
      <CardTitle>Section Title</CardTitle>
    </CardHeader>
    <CardContent>
      {/* Content */}
    </CardContent>
  </Card>
</div>
```

## 🧪 Testing Checklist

### Before Going Live
- [ ] All migrations applied successfully
- [ ] TypeScript types regenerated without errors
- [ ] No TypeScript compilation errors
- [ ] All RLS policies tested for each role
- [ ] Authentication flow works (signup, login, logout)
- [ ] Each CRUD operation tested per module
- [ ] Automation workflows tested
- [ ] File uploads working (if using S3)
- [ ] Email notifications configured
- [ ] Performance tested with realistic data volume
- [ ] Responsive design tested on mobile/tablet
- [ ] Error handling tested (network errors, validation)

## 📈 Performance Optimization

### Database Indexing
All foreign keys are indexed:
- `company_id` on all multi-tenant tables
- `employee_id`, `activity_group_id` on assignment tables
- `status` fields for filtering
- `date` fields for sorting

### Query Optimization
- Use `select('id', { count: 'exact', head: true })` for counting
- Use `.range()` for pagination instead of fetching all records
- Use `.single()` when expecting one record
- Parallel fetch with `Promise.all()` for dashboard statistics

### Frontend Optimization
- TanStack Query caching for all data fetching
- Lazy loading for large tables
- Debounced search inputs
- Optimistic updates for better UX

## 🐛 Common Issues & Fixes

### Issue 1: TypeScript Errors on New Tables
**Problem**: `activity_groups`, `measures`, `incidents` not found in types

**Solution**: 
1. Apply database migration first
2. Regenerate types: `supabase gen types typescript`
3. Restart dev server

### Issue 2: RLS Policy Denying Access
**Problem**: Users can't see their own company data

**Solution**:
1. Check `user_roles` table has correct mapping
2. Verify `company_id` is set in session
3. Check RLS policies with Supabase dashboard SQL editor

### Issue 3: Automation Functions Not Working
**Problem**: Training not auto-assigned when risk created

**Solution**:
1. Ensure `activity_risk_links` table has mappings
2. Check `activity_training_requirements` has required training defined
3. Verify `employee_activity_assignments` has employees assigned to activities

## 🔮 Future Enhancements

### Phase 2 - Advanced Features
- [ ] Document management with S3 storage
- [ ] Advanced reporting with charts (Recharts)
- [ ] Email notifications (SendGrid/Resend)
- [ ] Mobile app (React Native)
- [ ] Offline support (PWA)
- [ ] Real-time collaboration (Supabase Realtime)
- [ ] AI-powered risk assessment suggestions
- [ ] Multi-language support (i18n)

### Phase 3 - Enterprise Features
- [ ] SSO integration (SAML, OIDC)
- [ ] Advanced audit logging
- [ ] Data export/import (bulk operations)
- [ ] Workflow automation builder
- [ ] Custom report builder
- [ ] API for external integrations
- [ ] White-label branding
- [ ] Advanced analytics (Power BI embed)

## 📞 Support & Maintenance

### Log Files Location
- Browser console for frontend errors
- Supabase logs for backend errors
- Network tab for API call debugging

### Monitoring
- Supabase Dashboard → Database → Performance
- Supabase Dashboard → Auth → Users
- Supabase Dashboard → Storage → Usage

### Backup Strategy
- Supabase automatic daily backups (free tier: 7 days retention)
- Manual backups: SQL Editor → Export database
- Code backups: Git repository

## 📝 License & Credits

**Built with**:
- React 18.3.1
- TypeScript 5.8.3
- Vite 5.4.19
- Supabase 2.81.1
- TanStack Query 5.83.0
- ShadCN UI (Radix UI)
- Tailwind CSS 3.4.17

---

**Last Updated**: November 15, 2025
**Version**: 1.0.0
**Status**: Production Ready (after migration applied)
