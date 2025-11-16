# HSE Management System - Complete Architecture Documentation

## 📐 System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER                           │
│  React 18 + TypeScript + Vite + TailwindCSS + ShadCN UI        │
├─────────────────────────────────────────────────────────────────┤
│                     PRESENTATION LAYER                           │
│  ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌──────────┐         │
│  │Dashboard │ │ Employees │ │  Risks   │ │ Measures │  ...    │
│  │          │ │           │ │          │ │          │         │
│  └──────────┘ └───────────┘ └──────────┘ └──────────┘         │
├─────────────────────────────────────────────────────────────────┤
│                      STATE MANAGEMENT                            │
│  TanStack Query (React Query) + Context API                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│  │  Auth Cache │ │  Data Cache │ │ Query State │              │
│  └─────────────┘ └─────────────┘ └─────────────┘              │
├─────────────────────────────────────────────────────────────────┤
│                         API LAYER                                │
│  Supabase Client (Real-time + REST + Auth)                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  @supabase/supabase-js  +  Typed Client                  │  │
│  └──────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                      BACKEND LAYER                               │
│  Supabase (PostgreSQL + PostgREST + GoTrue + Realtime)         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐           │
│  │  PostgreSQL  │ │  PostgREST   │ │   Storage    │           │
│  │  Database    │ │  API Layer   │ │   (Files)    │           │
│  └──────────────┘ └──────────────┘ └──────────────┘           │
├─────────────────────────────────────────────────────────────────┤
│                    SECURITY LAYER                                │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Row Level Security (RLS) + JWT Auth + RBAC           │    │
│  │  company_admin | employee | super_admin               │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## 🗄️ Complete Database Schema

### Core Tables (Existing)
```
companies
├── id (uuid, PK)
├── name (varchar)
├── domain (varchar)
├── subscription_tier (enum)
├── subscription_status (enum)
└── settings (jsonb)

employees
├── id (uuid, PK)
├── company_id (uuid, FK → companies)
├── user_id (uuid, FK → auth.users)
├── full_name (varchar)
├── email (varchar)
├── employee_number (varchar)
├── department_id (uuid, FK → departments)
├── job_role_id (uuid, FK → job_roles)
├── hire_date (date)
├── is_active (boolean)
└── contact_info (jsonb)

departments
├── id (uuid, PK)
├── company_id (uuid, FK → companies)
├── name (varchar)
└── description (text)

job_roles
├── id (uuid, PK)
├── company_id (uuid, FK → companies)
├── title (varchar)
└── description (text)

risk_assessments
├── id (uuid, PK)
├── company_id (uuid, FK → companies)
├── title (varchar)
├── category_id (uuid, FK → risk_categories)
├── hazard_description (text)
├── risk_level (enum: low, medium, high, critical)
├── probability (integer 1-5)
├── severity (integer 1-5)
├── control_measures (text)
├── status (varchar)
├── assessment_date (date)
├── next_review_date (date)
└── assessed_by (uuid, FK → employees)

risk_categories
├── id (uuid, PK)
├── company_id (uuid, FK → companies)
├── name (varchar)
└── description (text)

audits
├── id (uuid, PK)
├── company_id (uuid, FK → companies)
├── audit_category_id (uuid, FK → audit_categories)
├── title (varchar)
├── description (text)
├── audit_date (date)
├── auditor_id (uuid, FK → employees)
├── department_id (uuid, FK → departments)
├── status (enum: scheduled, in_progress, completed, cancelled)
├── findings (text)
└── corrective_actions (text)

audit_categories
├── id (uuid, PK)
├── company_id (uuid, FK → companies)
├── name (varchar)
└── description (text)

tasks
├── id (uuid, PK)
├── company_id (uuid, FK → companies)
├── title (varchar)
├── description (text)
├── status (enum: pending, in_progress, completed, cancelled)
├── priority (enum: low, medium, high, urgent)
├── due_date (date)
├── assigned_to (uuid, FK → employees)
├── created_by (uuid, FK → employees)
├── department_id (uuid, FK → departments)
├── risk_assessment_id (uuid, FK → risk_assessments)
└── audit_id (uuid, FK → audits)

training_types
├── id (uuid, PK)
├── company_id (uuid, FK → companies)
├── name (varchar)
├── description (text)
├── validity_days (integer)
└── is_mandatory (boolean)

training_records
├── id (uuid, PK)
├── company_id (uuid, FK → companies)
├── employee_id (uuid, FK → employees)
├── training_type_id (uuid, FK → training_types)
├── status (enum: assigned, in_progress, completed, expired)
├── assigned_date (date)
├── completion_date (date)
├── expiry_date (date)
├── risk_assessment_id (uuid, FK → risk_assessments)
└── certificate_url (text)

exposure_groups
├── id (uuid, PK)
├── company_id (uuid, FK → companies)
├── name (varchar)
└── description (text)
```

### New HSE Tables (Newly Created)
```
activity_groups
├── id (uuid, PK)
├── company_id (uuid, FK → companies)
├── name (varchar)
├── description (text)
├── hazards (text[])  ← Array of hazard descriptions
├── required_ppe (text[])  ← Required protective equipment
├── created_at (timestamp)
└── updated_at (timestamp)

employee_activity_assignments
├── id (uuid, PK)
├── employee_id (uuid, FK → employees)
├── activity_group_id (uuid, FK → activity_groups)
├── assigned_date (timestamp)
└── UNIQUE(employee_id, activity_group_id)

measures (Maßnahmen)
├── id (uuid, PK)
├── company_id (uuid, FK → companies)
├── title (varchar)
├── description (text)
├── measure_type (enum: preventive, corrective, improvement)
├── status (enum: planned, in_progress, completed, cancelled)
├── risk_assessment_id (uuid, FK → risk_assessments) [nullable]
├── audit_id (uuid, FK → audits) [nullable]
├── incident_id (uuid, FK → incidents) [nullable]
├── responsible_person_id (uuid, FK → employees)
├── due_date (date)
├── completion_date (date)
├── verification_method (text)
├── attachments (jsonb)
├── created_at (timestamp)
├── updated_at (timestamp)
└── created_by (uuid)

incidents (Unfälle/Ereignisse)
├── id (uuid, PK)
├── company_id (uuid, FK → companies)
├── incident_number (varchar UNIQUE)  ← Auto-generated: YYYY-0001
├── title (varchar)
├── description (text)
├── incident_type (enum: injury, near_miss, property_damage, environmental, other)
├── severity (enum: minor, moderate, serious, critical, fatal)
├── incident_date (timestamp)
├── location (varchar)
├── department_id (uuid, FK → departments)
├── affected_employee_id (uuid, FK → employees)
├── witness_ids (uuid[])  ← Array of employee IDs
├── reported_by_id (uuid, FK → employees)
├── root_cause (text)
├── contributing_factors (text[])
├── immediate_actions (text)
├── investigation_status (varchar: open, in_progress, closed)
├── investigation_completed_date (date)
├── attachments (jsonb)
├── photos (jsonb)
├── created_at (timestamp)
└── updated_at (timestamp)

activity_risk_links
├── id (uuid, PK)
├── activity_group_id (uuid, FK → activity_groups)
├── risk_assessment_id (uuid, FK → risk_assessments)
├── company_id (uuid, FK → companies)
└── UNIQUE(activity_group_id, risk_assessment_id)

activity_training_requirements
├── id (uuid, PK)
├── activity_group_id (uuid, FK → activity_groups)
├── training_type_id (uuid, FK → training_types)
├── company_id (uuid, FK → companies)
├── is_mandatory (boolean)
└── UNIQUE(activity_group_id, training_type_id)
```

## 🔄 Data Flow & Automation Workflows

### Workflow 1: Risk Assessment → Auto Training Assignment
```
[User creates Risk Assessment]
         ↓
[Links Risk to Activity Group via activity_risk_links]
         ↓
[autoAssignTrainingFromRisk() function triggered]
         ↓
[System checks activity_training_requirements]
         ↓
[Finds all employees via employee_activity_assignments]
         ↓
[Creates training_records for each employee]
         ↓
[Employees see new training requirements]
```

**Implementation:**
```typescript
// src/utils/hseAutomation.ts
export async function autoAssignTrainingFromRisk(
  riskAssessmentId: string,
  companyId: string
) {
  // 1. Get risk and linked activity
  // 2. Get required training for activity
  // 3. Get employees assigned to activity
  // 4. Create training records for each employee
}
```

### Workflow 2: Audit Finding → Auto Task Creation
```
[Auditor completes Audit with Findings]
         ↓
[autoCreateTaskFromAuditFinding() function triggered]
         ↓
[Task created with details from audit]
         ↓
[Assigned to department head or auditor]
         ↓
[Due date set (default 7 days)]
         ↓
[Task appears in Task Management module]
```

**Implementation:**
```typescript
// src/utils/hseAutomation.ts
export async function autoCreateTaskFromAuditFinding(
  auditId: string,
  findingDescription: string,
  companyId: string
) {
  // 1. Get audit details
  // 2. Determine priority based on audit status
  // 3. Assign to appropriate person
  // 4. Create task with 7-day deadline
}
```

### Workflow 3: Measure → Employee Auto-Assignment
```
[Measure created from Risk/Audit/Incident]
         ↓
[autoAssignMeasuresToEmployees() function triggered]
         ↓
[System determines source (risk/audit/incident)]
         ↓
[Finds related activity groups]
         ↓
[Gets employees assigned to those activities]
         ↓
[Assigns measure to responsible employee]
```

**Implementation:**
```typescript
// src/utils/hseAutomation.ts
export async function autoAssignMeasuresToEmployees(
  measureId: string,
  companyId: string
) {
  // 1. Get measure and its source
  // 2. Find related activities
  // 3. Get assigned employees
  // 4. Update measure with responsible person
}
```

## 🔐 Security Architecture

### Authentication Flow
```
[User enters credentials]
         ↓
[Supabase Auth verifies]
         ↓
[JWT token issued]
         ↓
[AuthContext stores user + role + companyId]
         ↓
[All API calls include JWT in header]
         ↓
[RLS policies verify access]
```

### Role-Based Access Control (RBAC)
```
super_admin:
  ✓ Full system access
  ✓ Manage all companies
  ✓ Access any data across companies
  ✓ Delete any record

company_admin:
  ✓ Full access to their company data
  ✓ Create/edit/delete employees
  ✓ Create/edit/delete risks, audits, measures
  ✓ View all reports for their company
  ✗ Cannot access other companies

employee:
  ✓ View their assigned tasks
  ✓ View their training records
  ✓ Report incidents
  ✓ Update measures assigned to them
  ✗ Cannot delete records
  ✗ Cannot access other employees' data
```

### Row Level Security (RLS) Implementation
```sql
-- Example: measures table RLS
CREATE POLICY "measures_select_policy" ON measures
FOR SELECT USING (
  company_id IN (
    SELECT company_id FROM user_roles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "measures_update_policy" ON measures
FOR UPDATE USING (
  company_id IN (
    SELECT company_id FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('company_admin', 'super_admin')
  )
  OR responsible_person_id IN (
    SELECT id FROM employees 
    WHERE user_id = auth.uid()
  )
);
```

## 📊 Module Architecture

### Module Pattern (Consistent Across All Pages)
```tsx
// src/pages/[ModuleName].tsx

export default function ModuleName() {
  // 1. Hooks
  const { user, companyId, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // 2. State
  const [data, setData] = useState<DataType[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // 3. Data Fetching
  useEffect(() => {
    if (companyId) {
      fetchData();
    }
  }, [companyId]);

  const fetchData = async () => {
    const { data, error } = await supabase
      .from('table_name')
      .select('*')
      .eq('company_id', companyId);
    
    if (error) {
      toast({ title: "Error", description: error.message });
    } else {
      setData(data);
    }
  };

  // 4. CRUD Operations
  const handleCreate = async (formData) => { /* ... */ };
  const handleUpdate = async (id, formData) => { /* ... */ };
  const handleDelete = async (id) => { /* ... */ };

  // 5. UI Rendering
  return (
    <div className="p-8">
      {/* Header with actions */}
      {/* Statistics cards */}
      {/* Data table with search/filter */}
      {/* Dialogs for CRUD operations */}
    </div>
  );
}
```

### Component Hierarchy
```
App.tsx (Root)
├── BrowserRouter
│   ├── AuthProvider (Context)
│   │   ├── QueryClientProvider (TanStack Query)
│   │   │   ├── Routes
│   │   │   │   ├── Index (Public)
│   │   │   │   ├── Auth (Login/Signup)
│   │   │   │   ├── MainLayout (Authenticated wrapper)
│   │   │   │   │   ├── Sidebar navigation
│   │   │   │   │   ├── Dashboard
│   │   │   │   │   ├── Employees
│   │   │   │   │   ├── ActivityGroups
│   │   │   │   │   ├── RiskAssessments
│   │   │   │   │   ├── Measures
│   │   │   │   │   ├── Training
│   │   │   │   │   ├── Audits
│   │   │   │   │   ├── Tasks
│   │   │   │   │   ├── Incidents
│   │   │   │   │   ├── Reports
│   │   │   │   │   ├── Settings
│   │   │   │   │   ├── Messages
│   │   │   │   │   └── Documents
│   │   │   │   └── NotFound (404)
│   │   │   └── Toaster (Notifications)
```

## 🎨 UI Component System

### ShadCN UI Components Used
```
Layout:
- Card, CardHeader, CardTitle, CardDescription, CardContent
- Tabs, TabsList, TabsTrigger, TabsContent
- Separator
- Sheet, Drawer

Forms:
- Input, Textarea
- Select, SelectTrigger, SelectContent, SelectItem
- Checkbox, Switch, RadioGroup
- Button
- Label
- Form (react-hook-form integration)

Data Display:
- Table, TableHeader, TableBody, TableRow, TableCell
- Badge
- Avatar
- Progress
- Accordion

Feedback:
- Alert, AlertDescription
- AlertDialog
- Dialog
- Toast, Sonner
- Skeleton

Navigation:
- Breadcrumb
- Dropdown Menu
- Context Menu
- Navigation Menu
- Pagination
```

### Styling System
```
Base: Tailwind CSS 3.4.17
Extensions:
- @tailwindcss/typography
- tailwindcss-animate

Design Tokens:
- Colors: primary, secondary, accent, destructive, muted
- Spacing: Tailwind default (0-96)
- Typography: Inter font family
- Border Radius: rounded-lg (default)
- Shadows: shadow-sm to shadow-2xl
```

## 🚀 Performance Optimization Strategies

### 1. Database Query Optimization
```typescript
// ✅ Good: Count only, don't fetch data
const { count } = await supabase
  .from('employees')
  .select('id', { count: 'exact', head: true })
  .eq('company_id', companyId);

// ❌ Bad: Fetch all data to count
const { data } = await supabase
  .from('employees')
  .select('*')
  .eq('company_id', companyId);
const count = data?.length;

// ✅ Good: Parallel fetching
const [employees, risks, audits] = await Promise.all([
  supabase.from('employees').select('*'),
  supabase.from('risk_assessments').select('*'),
  supabase.from('audits').select('*')
]);

// ❌ Bad: Sequential fetching
const employees = await supabase.from('employees').select('*');
const risks = await supabase.from('risk_assessments').select('*');
const audits = await supabase.from('audits').select('*');
```

### 2. React Query Caching
```typescript
// Configure cache times
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 30 * 60 * 1000, // 30 minutes
    },
  },
});

// Use query keys consistently
useQuery(['employees', companyId], fetchEmployees);
useQuery(['risks', companyId, status], () => fetchRisks(status));
```

### 3. Component Optimization
```typescript
// Use React.memo for expensive components
const EmployeeRow = React.memo(({ employee }) => {
  return <TableRow>...</TableRow>;
});

// Debounce search inputs
const [search, setSearch] = useState('');
const debouncedSearch = useDebounce(search, 500);

// Lazy load components
const ReportsModule = React.lazy(() => import('./pages/Reports'));
```

### 4. Bundle Optimization
```javascript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-select'],
          'supabase': ['@supabase/supabase-js'],
        },
      },
    },
  },
});
```

## 📦 Deployment Architecture

### Production Build Process
```bash
# 1. Install dependencies
npm install

# 2. Run linting
npm run lint

# 3. Build for production
npm run build
# Output: dist/ folder with optimized bundle

# 4. Preview production build locally
npm run preview
```

### Environment Configuration
```env
# .env (Development)
VITE_SUPABASE_URL=https://dev-project.supabase.co
VITE_SUPABASE_ANON_KEY=dev-anon-key

# .env.production
VITE_SUPABASE_URL=https://prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=prod-anon-key
```

### Hosting Options
```
Option 1: Vercel (Recommended)
- Connect GitHub repo
- Auto-deploys on push
- Edge network (fast)
- Free SSL
- Environment variables in dashboard

Option 2: Netlify
- Similar to Vercel
- Good for SPA
- Drag-and-drop deployment

Option 3: Self-hosted (VPS)
- Build: npm run build
- Serve: nginx/Apache
- dist/ folder contains static files
```

## 🔧 Development Tools

### VS Code Extensions Recommended
```
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript Vue Plugin (Volar)
- GitLens
- Thunder Client (API testing)
```

### Testing Strategy
```
Unit Tests: (Future)
- Jest + React Testing Library
- Test individual components
- Test utility functions

Integration Tests:
- Test complete user flows
- Test automation workflows

E2E Tests:
- Playwright or Cypress
- Test critical paths
- Test authentication flow
```

## 📈 Monitoring & Logging

### Frontend Monitoring
```typescript
// Error Boundary
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    // Log to monitoring service
    console.error('App Error:', error, errorInfo);
  }
}

// Performance Monitoring
window.addEventListener('load', () => {
  const perfData = performance.getEntriesByType('navigation')[0];
  console.log('Page Load Time:', perfData.loadEventEnd);
});
```

### Backend Monitoring
```
Supabase Dashboard:
- Database → Performance
  - Query performance
  - Slow queries
  - Connection pool usage

- Auth → Users
  - Active users
  - Failed login attempts

- Logs
  - Real-time logs
  - Filter by severity
```

---

**Last Updated**: November 15, 2025
**Architecture Version**: 1.0.0
**System Status**: Production Ready (after migration)
