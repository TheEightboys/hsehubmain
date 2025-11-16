# HSE Management System - API Reference & Integration Guide

## 📡 API Overview

The HSE Management System uses **Supabase** as the backend, which automatically generates a RESTful API from your PostgreSQL schema. All API communication happens through the Supabase JavaScript client.

### Base Configuration

```typescript
// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

## 🔐 Authentication API

### Sign Up
```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'securePassword123',
  options: {
    data: {
      full_name: 'John Doe',
    },
  },
});
```

### Sign In
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'securePassword123',
});
```

### Sign Out
```typescript
const { error } = await supabase.auth.signOut();
```

### Get Current User
```typescript
const { data: { user } } = await supabase.auth.getUser();
```

### Get Current Session
```typescript
const { data: { session } } = await supabase.auth.getSession();
```

## 👥 Employees API

### Fetch All Employees
```typescript
const { data, error } = await supabase
  .from('employees')
  .select(`
    *,
    department:departments(name),
    job_role:job_roles(title)
  `)
  .eq('company_id', companyId)
  .eq('is_active', true)
  .order('full_name');
```

### Create Employee
```typescript
const { data, error } = await supabase
  .from('employees')
  .insert({
    company_id: companyId,
    full_name: 'Jane Smith',
    email: 'jane@example.com',
    employee_number: 'EMP-001',
    department_id: departmentId,
    job_role_id: jobRoleId,
    hire_date: '2025-01-15',
    is_active: true,
  })
  .select()
  .single();
```

### Update Employee
```typescript
const { data, error } = await supabase
  .from('employees')
  .update({
    full_name: 'Jane Doe',
    department_id: newDepartmentId,
  })
  .eq('id', employeeId)
  .eq('company_id', companyId)
  .select()
  .single();
```

### Delete Employee (Soft Delete)
```typescript
const { data, error } = await supabase
  .from('employees')
  .update({ is_active: false })
  .eq('id', employeeId)
  .eq('company_id', companyId);
```

### Search Employees
```typescript
const { data, error } = await supabase
  .from('employees')
  .select('*')
  .eq('company_id', companyId)
  .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,employee_number.ilike.%${searchTerm}%`);
```

## 🏢 Activity Groups API

### Fetch Activity Groups
```typescript
const { data, error } = await supabase
  .from('activity_groups')
  .select('*')
  .eq('company_id', companyId)
  .order('name');
```

### Create Activity Group
```typescript
const { data, error } = await supabase
  .from('activity_groups')
  .insert({
    company_id: companyId,
    name: 'Welding Operations',
    description: 'Activities related to welding and metal work',
    hazards: ['Burns', 'Eye damage', 'Toxic fumes'],
    required_ppe: ['Welding helmet', 'Heat-resistant gloves', 'Safety boots'],
  })
  .select()
  .single();
```

### Update Activity Group
```typescript
const { data, error } = await supabase
  .from('activity_groups')
  .update({
    name: 'Updated Activity Name',
    hazards: ['New hazard 1', 'New hazard 2'],
  })
  .eq('id', activityGroupId)
  .eq('company_id', companyId);
```

### Assign Employee to Activity
```typescript
const { data, error } = await supabase
  .from('employee_activity_assignments')
  .insert({
    employee_id: employeeId,
    activity_group_id: activityGroupId,
  })
  .select()
  .single();
```

### Get Employees for Activity
```typescript
const { data, error } = await supabase
  .from('employee_activity_assignments')
  .select(`
    employee:employees(
      id,
      full_name,
      email,
      employee_number
    )
  `)
  .eq('activity_group_id', activityGroupId);
```

## ⚠️ Risk Assessments API

### Fetch Risk Assessments
```typescript
const { data, error } = await supabase
  .from('risk_assessments')
  .select(`
    *,
    category:risk_categories(name),
    assessor:employees!risk_assessments_assessed_by_fkey(full_name)
  `)
  .eq('company_id', companyId)
  .order('assessment_date', { ascending: false });
```

### Create Risk Assessment
```typescript
const { data, error } = await supabase
  .from('risk_assessments')
  .insert({
    company_id: companyId,
    title: 'Chemical Storage Risk Assessment',
    category_id: categoryId,
    hazard_description: 'Improper storage of chemicals',
    probability: 3,
    severity: 4,
    risk_level: 'high',
    control_measures: 'Implement proper labeling and segregation',
    status: 'active',
    assessment_date: '2025-01-15',
    next_review_date: '2025-07-15',
    assessed_by: employeeId,
  })
  .select()
  .single();
```

### Calculate Risk Score
```typescript
function calculateRiskScore(probability: number, severity: number): {
  score: number;
  level: 'low' | 'medium' | 'high' | 'critical';
} {
  const score = probability * severity;
  
  let level: 'low' | 'medium' | 'high' | 'critical';
  if (score <= 5) level = 'low';
  else if (score <= 12) level = 'medium';
  else if (score <= 16) level = 'high';
  else level = 'critical';
  
  return { score, level };
}
```

### Link Risk to Activity
```typescript
const { data, error } = await supabase
  .from('activity_risk_links')
  .insert({
    activity_group_id: activityGroupId,
    risk_assessment_id: riskAssessmentId,
    company_id: companyId,
  })
  .select()
  .single();
```

## ✅ Measures API

### Fetch Measures
```typescript
const { data, error } = await supabase
  .from('measures')
  .select(`
    *,
    responsible_person:employees!measures_responsible_person_id_fkey(
      full_name,
      email
    ),
    risk_assessment:risk_assessments(title),
    audit:audits(title),
    incident:incidents(incident_number, title)
  `)
  .eq('company_id', companyId)
  .order('due_date', { ascending: true });
```

### Create Measure
```typescript
const { data, error } = await supabase
  .from('measures')
  .insert({
    company_id: companyId,
    title: 'Install Additional Fire Extinguishers',
    description: 'Add fire extinguishers to warehouse area',
    measure_type: 'preventive',
    status: 'planned',
    risk_assessment_id: riskId, // Optional
    audit_id: auditId, // Optional
    incident_id: incidentId, // Optional
    responsible_person_id: employeeId,
    due_date: '2025-02-01',
    verification_method: 'Visual inspection and photo documentation',
  })
  .select()
  .single();
```

### Update Measure Status
```typescript
const { data, error } = await supabase
  .from('measures')
  .update({
    status: 'completed',
    completion_date: new Date().toISOString().split('T')[0],
  })
  .eq('id', measureId)
  .eq('company_id', companyId);
```

### Filter Measures
```typescript
// By status
const { data, error } = await supabase
  .from('measures')
  .select('*')
  .eq('company_id', companyId)
  .eq('status', 'in_progress');

// By type
const { data, error } = await supabase
  .from('measures')
  .select('*')
  .eq('company_id', companyId)
  .eq('measure_type', 'corrective');

// Overdue measures
const { data, error } = await supabase
  .from('measures')
  .select('*')
  .eq('company_id', companyId)
  .lt('due_date', new Date().toISOString().split('T')[0])
  .neq('status', 'completed');
```

## 🚨 Incidents API

### Fetch Incidents
```typescript
const { data, error } = await supabase
  .from('incidents')
  .select(`
    *,
    affected_employee:employees!incidents_affected_employee_id_fkey(full_name),
    reported_by:employees!incidents_reported_by_id_fkey(full_name),
    department:departments(name)
  `)
  .eq('company_id', companyId)
  .order('incident_date', { ascending: false });
```

### Create Incident (Auto-generates incident_number)
```typescript
const { data, error } = await supabase
  .from('incidents')
  .insert({
    company_id: companyId,
    title: 'Slip and Fall in Warehouse',
    description: 'Employee slipped on wet floor',
    incident_type: 'injury',
    severity: 'moderate',
    incident_date: new Date().toISOString(),
    location: 'Warehouse Section B',
    department_id: departmentId,
    affected_employee_id: employeeId,
    reported_by_id: reporterId,
    immediate_actions: 'First aid provided, area cordoned off',
    investigation_status: 'open',
  })
  .select()
  .single();

// incident_number will be auto-generated as: 2025-0001, 2025-0002, etc.
```

### Update Investigation Status
```typescript
const { data, error } = await supabase
  .from('incidents')
  .update({
    investigation_status: 'closed',
    root_cause: 'Inadequate floor drainage and lack of warning signs',
    contributing_factors: ['Poor lighting', 'Lack of training'],
    investigation_completed_date: new Date().toISOString().split('T')[0],
  })
  .eq('id', incidentId)
  .eq('company_id', companyId);
```

### Get Incident Statistics
```typescript
// Count by type
const { data, error } = await supabase
  .from('incidents')
  .select('incident_type')
  .eq('company_id', companyId);

const stats = data.reduce((acc, incident) => {
  acc[incident.incident_type] = (acc[incident.incident_type] || 0) + 1;
  return acc;
}, {});

// Count by severity
const { data: severityData } = await supabase
  .from('incidents')
  .select('severity')
  .eq('company_id', companyId);

// Open investigations
const { count } = await supabase
  .from('incidents')
  .select('id', { count: 'exact', head: true })
  .eq('company_id', companyId)
  .eq('investigation_status', 'open');
```

## 🎓 Training API

### Fetch Training Records
```typescript
const { data, error } = await supabase
  .from('training_records')
  .select(`
    *,
    employee:employees(full_name, employee_number),
    training_type:training_types(name, validity_days)
  `)
  .eq('company_id', companyId)
  .order('assigned_date', { ascending: false });
```

### Assign Training
```typescript
const { data, error } = await supabase
  .from('training_records')
  .insert({
    company_id: companyId,
    employee_id: employeeId,
    training_type_id: trainingTypeId,
    status: 'assigned',
    assigned_date: new Date().toISOString().split('T')[0],
  })
  .select()
  .single();
```

### Complete Training
```typescript
const { data, error } = await supabase
  .from('training_records')
  .update({
    status: 'completed',
    completion_date: new Date().toISOString().split('T')[0],
    expiry_date: addDays(new Date(), validityDays).toISOString().split('T')[0],
    certificate_url: certificateUrl, // Optional
  })
  .eq('id', trainingRecordId)
  .eq('company_id', companyId);
```

### Check Expired Training
```typescript
const { data, error } = await supabase
  .from('training_records')
  .select(`
    *,
    employee:employees(full_name, email)
  `)
  .eq('company_id', companyId)
  .lt('expiry_date', new Date().toISOString().split('T')[0])
  .eq('status', 'completed');

// Update expired training
for (const training of data) {
  await supabase
    .from('training_records')
    .update({ status: 'expired' })
    .eq('id', training.id);
}
```

### Training Compliance Report
```typescript
async function getTrainingCompliance(companyId: string) {
  const { data: employees } = await supabase
    .from('employees')
    .select('id, full_name')
    .eq('company_id', companyId)
    .eq('is_active', true);

  const compliance = await Promise.all(
    employees.map(async (emp) => {
      const { data: trainings } = await supabase
        .from('training_records')
        .select('*')
        .eq('employee_id', emp.id);

      const total = trainings.length;
      const completed = trainings.filter(t => t.status === 'completed').length;
      const expired = trainings.filter(t => t.status === 'expired').length;

      return {
        employee_name: emp.full_name,
        total_required: total,
        completed,
        expired,
        compliance_rate: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    })
  );

  return compliance;
}
```

## 🔍 Audits API

### Fetch Audits
```typescript
const { data, error } = await supabase
  .from('audits')
  .select(`
    *,
    category:audit_categories(name),
    auditor:employees!audits_auditor_id_fkey(full_name),
    department:departments(name)
  `)
  .eq('company_id', companyId)
  .order('audit_date', { ascending: false });
```

### Create Audit
```typescript
const { data, error } = await supabase
  .from('audits')
  .insert({
    company_id: companyId,
    audit_category_id: categoryId,
    title: 'Monthly Safety Inspection',
    description: 'Routine safety inspection of production floor',
    audit_date: new Date().toISOString().split('T')[0],
    auditor_id: auditorId,
    department_id: departmentId,
    status: 'scheduled',
  })
  .select()
  .single();
```

### Complete Audit with Findings
```typescript
const { data, error } = await supabase
  .from('audits')
  .update({
    status: 'completed',
    findings: 'Found 3 fire extinguishers expired, emergency exit blocked',
    corrective_actions: 'Replace extinguishers, clear exit path',
  })
  .eq('id', auditId)
  .eq('company_id', companyId);
```

## 📋 Tasks API

### Fetch Tasks
```typescript
const { data, error } = await supabase
  .from('tasks')
  .select(`
    *,
    assigned_to:employees!tasks_assigned_to_fkey(full_name, email),
    created_by:employees!tasks_created_by_fkey(full_name),
    department:departments(name),
    risk_assessment:risk_assessments(title),
    audit:audits(title)
  `)
  .eq('company_id', companyId)
  .order('due_date', { ascending: true });
```

### Create Task
```typescript
const { data, error } = await supabase
  .from('tasks')
  .insert({
    company_id: companyId,
    title: 'Update Safety Procedures Manual',
    description: 'Review and update all safety procedures',
    status: 'pending',
    priority: 'high',
    due_date: '2025-02-15',
    assigned_to: employeeId,
    created_by: currentUserId,
    department_id: departmentId,
  })
  .select()
  .single();
```

### Update Task Status
```typescript
const { data, error } = await supabase
  .from('tasks')
  .update({ status: 'completed' })
  .eq('id', taskId)
  .eq('company_id', companyId);
```

### Filter Tasks
```typescript
// My tasks
const { data, error } = await supabase
  .from('tasks')
  .select('*')
  .eq('company_id', companyId)
  .eq('assigned_to', currentEmployeeId)
  .neq('status', 'completed');

// Overdue tasks
const { data, error } = await supabase
  .from('tasks')
  .select('*')
  .eq('company_id', companyId)
  .lt('due_date', new Date().toISOString().split('T')[0])
  .neq('status', 'completed');

// High priority tasks
const { data, error } = await supabase
  .from('tasks')
  .select('*')
  .eq('company_id', companyId)
  .eq('priority', 'urgent')
  .order('due_date');
```

## 📊 Reports & Analytics API

### Dashboard Statistics
```typescript
async function getDashboardStats(companyId: string) {
  const [
    employeesRes,
    risksRes,
    auditsRes,
    tasksRes,
    incidentsRes,
    measuresRes,
    trainingRes,
  ] = await Promise.all([
    supabase.from('employees').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('is_active', true),
    supabase.from('risk_assessments').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
    supabase.from('audits').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
    supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
    supabase.from('incidents').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
    supabase.from('measures').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
    supabase.from('training_records').select('*').eq('company_id', companyId),
  ]);

  const totalTraining = trainingRes.data?.length || 0;
  const completedTraining = trainingRes.data?.filter(t => t.status === 'completed').length || 0;
  const trainingCompliance = totalTraining > 0 ? Math.round((completedTraining / totalTraining) * 100) : 0;

  return {
    totalEmployees: employeesRes.count || 0,
    totalRiskAssessments: risksRes.count || 0,
    totalAudits: auditsRes.count || 0,
    totalTasks: tasksRes.count || 0,
    totalIncidents: incidentsRes.count || 0,
    totalMeasures: measuresRes.count || 0,
    trainingCompliance,
  };
}
```

### Risk Trend Analysis
```typescript
async function getRiskTrend(companyId: string, months: number = 6) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const { data, error } = await supabase
    .from('risk_assessments')
    .select('assessment_date, risk_level')
    .eq('company_id', companyId)
    .gte('assessment_date', startDate.toISOString().split('T')[0])
    .order('assessment_date');

  // Group by month and risk level
  const trend = data.reduce((acc, risk) => {
    const month = risk.assessment_date.substring(0, 7); // YYYY-MM
    if (!acc[month]) acc[month] = { low: 0, medium: 0, high: 0, critical: 0 };
    acc[month][risk.risk_level]++;
    return acc;
  }, {});

  return trend;
}
```

## 🔄 Automation API Calls

### Auto-Assign Training from Risk
```typescript
import { autoAssignTrainingFromRisk } from '@/utils/hseAutomation';

// After creating a risk assessment
const { data: risk } = await supabase
  .from('risk_assessments')
  .insert({ /* risk data */ })
  .select()
  .single();

// Link to activity
await supabase
  .from('activity_risk_links')
  .insert({
    activity_group_id: activityId,
    risk_assessment_id: risk.id,
    company_id: companyId,
  });

// Trigger auto-assignment
const result = await autoAssignTrainingFromRisk(risk.id, companyId);
console.log(result.message);
```

### Auto-Create Task from Audit
```typescript
import { autoCreateTaskFromAuditFinding } from '@/utils/hseAutomation';

// After completing an audit with findings
const result = await autoCreateTaskFromAuditFinding(
  auditId,
  'Fix emergency exit obstruction',
  companyId,
  assignedEmployeeId
);

console.log('Task created:', result.task);
```

### Auto-Assign Measures
```typescript
import { autoAssignMeasuresToEmployees } from '@/utils/hseAutomation';

// After creating a measure
const { data: measure } = await supabase
  .from('measures')
  .insert({ /* measure data */ })
  .select()
  .single();

// Trigger auto-assignment
const result = await autoAssignMeasuresToEmployees(measure.id, companyId);
console.log(result.message);
```

## 🔧 Utility Functions

### Pagination
```typescript
const PAGE_SIZE = 20;

async function fetchPaginated(table: string, page: number, companyId: string) {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error, count } = await supabase
    .from(table)
    .select('*', { count: 'exact' })
    .eq('company_id', companyId)
    .range(from, to);

  return {
    data,
    totalPages: Math.ceil((count || 0) / PAGE_SIZE),
    currentPage: page,
  };
}
```

### Search with Multiple Fields
```typescript
async function searchTable(
  table: string,
  searchTerm: string,
  fields: string[],
  companyId: string
) {
  const orCondition = fields
    .map(field => `${field}.ilike.%${searchTerm}%`)
    .join(',');

  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('company_id', companyId)
    .or(orCondition);

  return data;
}
```

### Batch Operations
```typescript
async function batchInsert(table: string, records: any[]) {
  const BATCH_SIZE = 100;
  const results = [];

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from(table)
      .insert(batch)
      .select();
    
    if (error) throw error;
    results.push(...data);
  }

  return results;
}
```

## 🚨 Error Handling

### Standard Error Pattern
```typescript
async function safeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: string | null }> {
  try {
    const { data, error } = await queryFn();
    
    if (error) {
      console.error('Supabase error:', error);
      return { data: null, error: error.message };
    }
    
    return { data, error: null };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { data: null, error: 'An unexpected error occurred' };
  }
}

// Usage
const result = await safeQuery(() =>
  supabase.from('employees').select('*').eq('company_id', companyId)
);

if (result.error) {
  toast({ title: 'Error', description: result.error });
} else {
  setEmployees(result.data);
}
```

---

**Last Updated**: November 15, 2025
**API Version**: 1.0.0
**Supabase Client Version**: 2.81.1
