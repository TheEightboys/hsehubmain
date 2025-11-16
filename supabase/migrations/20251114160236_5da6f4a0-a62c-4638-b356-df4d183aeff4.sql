-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE public.app_role AS ENUM ('super_admin', 'company_admin', 'employee');
CREATE TYPE public.subscription_tier AS ENUM ('basic', 'standard', 'premium');
CREATE TYPE public.subscription_status AS ENUM ('active', 'inactive', 'cancelled', 'trial');
CREATE TYPE public.risk_level AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE public.task_status AS ENUM ('pending', 'in_progress', 'completed', 'overdue');
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE public.audit_status AS ENUM ('planned', 'in_progress', 'completed');
CREATE TYPE public.training_status AS ENUM ('assigned', 'in_progress', 'completed', 'expired');

-- ============================================
-- SUPER ADMIN TABLES
-- ============================================

-- Subscription packages
CREATE TABLE public.subscription_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    tier subscription_tier NOT NULL UNIQUE,
    price_monthly DECIMAL(10,2) NOT NULL,
    price_yearly DECIMAL(10,2) NOT NULL,
    max_employees INTEGER NOT NULL,
    features JSONB DEFAULT '[]'::jsonb,
    stripe_price_id_monthly TEXT,
    stripe_price_id_yearly TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Companies (tenants)
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    subscription_tier subscription_tier NOT NULL DEFAULT 'basic',
    subscription_status subscription_status NOT NULL DEFAULT 'trial',
    subscription_start_date TIMESTAMPTZ,
    subscription_end_date TIMESTAMPTZ,
    max_employees INTEGER NOT NULL DEFAULT 10,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- User roles (separate table for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, role, company_id)
);

-- User profiles
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- COMPANY-SPECIFIC TABLES (Multi-tenant)
-- ============================================

-- Departments
CREATE TABLE public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id, name)
);

-- Job Roles
CREATE TABLE public.job_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id, title)
);

-- Exposure Groups
CREATE TABLE public.exposure_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id, name)
);

-- Risk Categories
CREATE TABLE public.risk_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id, name)
);

-- Training Types
CREATE TABLE public.training_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    duration_hours INTEGER,
    validity_months INTEGER,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id, name)
);

-- Audit Categories
CREATE TABLE public.audit_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id, name)
);

-- Employees
CREATE TABLE public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    employee_number TEXT NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    job_role_id UUID REFERENCES public.job_roles(id) ON DELETE SET NULL,
    exposure_group_id UUID REFERENCES public.exposure_groups(id) ON DELETE SET NULL,
    hire_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id, employee_number)
);

-- Risk Assessments (GBU)
CREATE TABLE public.risk_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    risk_category_id UUID REFERENCES public.risk_categories(id) ON DELETE SET NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    assessed_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    risk_level risk_level NOT NULL,
    likelihood INTEGER CHECK (likelihood >= 1 AND likelihood <= 5),
    severity INTEGER CHECK (severity >= 1 AND severity <= 5),
    risk_score INTEGER GENERATED ALWAYS AS (likelihood * severity) STORED,
    mitigation_measures TEXT,
    status TEXT DEFAULT 'open',
    assessment_date DATE NOT NULL,
    review_date DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Audits
CREATE TABLE public.audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    audit_category_id UUID REFERENCES public.audit_categories(id) ON DELETE SET NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    auditor_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    status audit_status NOT NULL DEFAULT 'planned',
    scheduled_date DATE NOT NULL,
    completed_date DATE,
    findings TEXT,
    deficiencies_found INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tasks
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    assigned_to UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    status task_status NOT NULL DEFAULT 'pending',
    priority task_priority NOT NULL DEFAULT 'medium',
    due_date DATE,
    completed_date DATE,
    audit_id UUID REFERENCES public.audits(id) ON DELETE SET NULL,
    risk_assessment_id UUID REFERENCES public.risk_assessments(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Training Records
CREATE TABLE public.training_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
    training_type_id UUID REFERENCES public.training_types(id) ON DELETE CASCADE NOT NULL,
    status training_status NOT NULL DEFAULT 'assigned',
    assigned_date DATE NOT NULL,
    completion_date DATE,
    expiry_date DATE,
    risk_assessment_id UUID REFERENCES public.risk_assessments(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- FUNCTIONS FOR RLS
-- ============================================

-- Function to check if user has specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to get user's company_id
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id
  FROM public.user_roles
  WHERE user_id = _user_id AND role IN ('company_admin', 'employee')
  LIMIT 1
$$;

-- Function to check if user belongs to company
CREATE OR REPLACE FUNCTION public.user_belongs_to_company(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND company_id = _company_id
  )
$$;

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_job_roles_updated_at BEFORE UPDATE ON public.job_roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_risk_assessments_updated_at BEFORE UPDATE ON public.risk_assessments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_audits_updated_at BEFORE UPDATE ON public.audits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.subscription_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exposure_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_records ENABLE ROW LEVEL SECURITY;

-- Subscription Packages (public read, super_admin write)
CREATE POLICY "Anyone can view subscription packages"
  ON public.subscription_packages FOR SELECT
  USING (true);

CREATE POLICY "Super admins can manage subscription packages"
  ON public.subscription_packages FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Companies (super_admin full access, company admins can view own)
CREATE POLICY "Super admins can manage all companies"
  ON public.companies FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Company admins can view their company"
  ON public.companies FOR SELECT
  USING (
    public.has_role(auth.uid(), 'company_admin') AND 
    id = public.get_user_company_id(auth.uid())
  );

-- User Roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Super admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Company admins can manage company roles"
  ON public.user_roles FOR ALL
  USING (
    public.has_role(auth.uid(), 'company_admin') AND
    company_id = public.get_user_company_id(auth.uid()) AND
    role != 'super_admin'
  );

-- Profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Super admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Company-scoped tables (Departments, Job Roles, etc.)
CREATE POLICY "Company users can view their departments"
  ON public.departments FOR SELECT
  USING (public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Company admins can manage their departments"
  ON public.departments FOR ALL
  USING (
    public.has_role(auth.uid(), 'company_admin') AND
    company_id = public.get_user_company_id(auth.uid())
  );

CREATE POLICY "Company users can view their job roles"
  ON public.job_roles FOR SELECT
  USING (public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Company admins can manage their job roles"
  ON public.job_roles FOR ALL
  USING (
    public.has_role(auth.uid(), 'company_admin') AND
    company_id = public.get_user_company_id(auth.uid())
  );

CREATE POLICY "Company users can view their exposure groups"
  ON public.exposure_groups FOR SELECT
  USING (public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Company admins can manage their exposure groups"
  ON public.exposure_groups FOR ALL
  USING (
    public.has_role(auth.uid(), 'company_admin') AND
    company_id = public.get_user_company_id(auth.uid())
  );

CREATE POLICY "Company users can view their risk categories"
  ON public.risk_categories FOR SELECT
  USING (public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Company admins can manage their risk categories"
  ON public.risk_categories FOR ALL
  USING (
    public.has_role(auth.uid(), 'company_admin') AND
    company_id = public.get_user_company_id(auth.uid())
  );

CREATE POLICY "Company users can view their training types"
  ON public.training_types FOR SELECT
  USING (public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Company admins can manage their training types"
  ON public.training_types FOR ALL
  USING (
    public.has_role(auth.uid(), 'company_admin') AND
    company_id = public.get_user_company_id(auth.uid())
  );

CREATE POLICY "Company users can view their audit categories"
  ON public.audit_categories FOR SELECT
  USING (public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Company admins can manage their audit categories"
  ON public.audit_categories FOR ALL
  USING (
    public.has_role(auth.uid(), 'company_admin') AND
    company_id = public.get_user_company_id(auth.uid())
  );

-- Employees
CREATE POLICY "Company users can view their employees"
  ON public.employees FOR SELECT
  USING (public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Company admins can manage their employees"
  ON public.employees FOR ALL
  USING (
    public.has_role(auth.uid(), 'company_admin') AND
    company_id = public.get_user_company_id(auth.uid())
  );

-- Risk Assessments
CREATE POLICY "Company users can view their risk assessments"
  ON public.risk_assessments FOR SELECT
  USING (public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Company users can create risk assessments"
  ON public.risk_assessments FOR INSERT
  WITH CHECK (
    public.user_belongs_to_company(auth.uid(), company_id) AND
    company_id = public.get_user_company_id(auth.uid())
  );

CREATE POLICY "Company admins can manage risk assessments"
  ON public.risk_assessments FOR ALL
  USING (
    public.has_role(auth.uid(), 'company_admin') AND
    company_id = public.get_user_company_id(auth.uid())
  );

-- Audits
CREATE POLICY "Company users can view their audits"
  ON public.audits FOR SELECT
  USING (public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Company admins can manage audits"
  ON public.audits FOR ALL
  USING (
    public.has_role(auth.uid(), 'company_admin') AND
    company_id = public.get_user_company_id(auth.uid())
  );

-- Tasks
CREATE POLICY "Company users can view their tasks"
  ON public.tasks FOR SELECT
  USING (public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Company users can create tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (
    public.user_belongs_to_company(auth.uid(), company_id) AND
    company_id = public.get_user_company_id(auth.uid())
  );

CREATE POLICY "Company users can update their assigned tasks"
  ON public.tasks FOR UPDATE
  USING (
    public.user_belongs_to_company(auth.uid(), company_id) AND
    (
      public.has_role(auth.uid(), 'company_admin') OR
      assigned_to IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
    )
  );

-- Training Records
CREATE POLICY "Company users can view their training records"
  ON public.training_records FOR SELECT
  USING (public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Company admins can manage training records"
  ON public.training_records FOR ALL
  USING (
    public.has_role(auth.uid(), 'company_admin') AND
    company_id = public.get_user_company_id(auth.uid())
  );

-- Insert default subscription packages
INSERT INTO public.subscription_packages (name, tier, price_monthly, price_yearly, max_employees, features) VALUES
  ('Basic Plan', 'basic', 49.99, 499.99, 25, 
   '["Employee Management", "Basic Risk Assessments", "Audit Checklists", "Task Management"]'::jsonb),
  ('Standard Plan', 'standard', 99.99, 999.99, 100, 
   '["All Basic Features", "Advanced Risk Assessments", "Training Management", "Compliance Reports", "Custom Categories"]'::jsonb),
  ('Premium Plan', 'premium', 199.99, 1999.99, 500, 
   '["All Standard Features", "Advanced Analytics", "Automation Workflows", "API Access", "Priority Support", "Custom Integrations"]'::jsonb);