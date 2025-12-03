# Settings Page Implementation Guide

## ✅ Changes Already Completed

1. **Locations Table** - Description field removed
2. **Departments Table** - Description field removed
3. **Sidebar** - Made more compact with smaller fonts and spacing

## 🔄 Changes Required Based on Client Images

### Image 1: Hazard Categories & Measure Building Blocks (Catalogs Tab)

**Requirements:**

- ✅ Hazard Categories: Change to inline add (less clicks)
- ✅ Measure Building Blocks: Fix saving issue - currently just shows toast but doesn't persist
- ⚠️ Risk Matrix Labels: Should be in Catalogs tab, not Intervals tab
- Background should be white, not dark

### Image 2: Intervals Tab

**Requirements:**

- ✅ Risk Assessment Intervals section needs actual input fields:
  - GBU intervals (months) with Add button
  - Audit intervals (months) with Add button
- ✅ Audit Categories: Move FROM Intervals TO Catalogs tab
- ✅ Audit Intervals section: Add actual configuration
- ✅ Notification Logic section: Add fields for days before notifications

### Image 3: Risk Matrix Labels (Currently in wrong tab)

**Requirements:**

- Move from Intervals tab to Catalogs & Content tab
- White background instead of dark
- Editable fields for:
  - Likelihood column (5 items)
  - Severity column (5 items)
  - Result column (5 items)
- Color boxes at bottom (Green, Orange, Red, Dark Red)

### Image 4: ISO Selection & Criteria (Intervals Tab)

**Requirements:**

- ✅ 4 predefined ISOs: ISO 45001, ISO 14001, ISO 9001, ISO 50001
- ✅ Ability to add custom ISOs
- ✅ Criteria section that shows based on selected ISOs
- ✅ Two view modes: "Kompakt" and "Vollständig"
- ✅ Ability to add custom criteria

## 📋 Implementation Tasks

### Task 1: Fix Measure Building Blocks Saving

Currently it only shows a toast. Need to create database table and persist data.

### Task 2: Add Risk Matrix Labels Section to Catalogs Tab

Create a new card with editable labels and color configuration.

### Task 3: Move Audit Categories from Intervals to Catalogs Tab

Simple move operation in the code.

### Task 4: Add Risk Assessment Intervals Configuration

Add input fields for GBU and Audit intervals with ability to add/remove.

### Task 5: Add Notification Logic Configuration

Add section with fields for days before notifications for different event types.

## 🗄️ Database Changes Needed

### 1. Create measure_building_blocks table

```sql
CREATE TABLE IF NOT EXISTS public.measure_building_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies
ALTER TABLE public.measure_building_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "measure_blocks_select" ON public.measure_building_blocks
FOR SELECT TO authenticated
USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "measure_blocks_insert" ON public.measure_building_blocks
FOR INSERT TO authenticated
WITH CHECK (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "measure_blocks_update" ON public.measure_building_blocks
FOR UPDATE TO authenticated
USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "measure_blocks_delete" ON public.measure_building_blocks
FOR DELETE TO authenticated
USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));
```

### 2. Create risk_matrix_labels table

```sql
CREATE TABLE IF NOT EXISTS public.risk_matrix_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  label_type TEXT NOT NULL CHECK (label_type IN ('likelihood', 'severity', 'result')),
  label_order INTEGER NOT NULL,
  label_text TEXT NOT NULL,
  color_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, label_type, label_order)
);

-- RLS policies (same pattern as above)
```

### 3. Create interval_configurations table

```sql
CREATE TABLE IF NOT EXISTS public.interval_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  config_type TEXT NOT NULL CHECK (config_type IN ('gbu_interval', 'audit_interval', 'notification_logic')),
  config_key TEXT NOT NULL,
  config_value INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, config_type, config_key)
);

-- RLS policies (same pattern as above)
```

## 📝 Code Structure

The Settings.tsx file should have this tab structure:

1. **Team Tab** - User management
2. **User Roles & Permissions** - RBAC
3. **Configuration Tab**

   - Locations (inline add)
   - Departments (inline add)
   - Approval Process
   - Exposure Groups (inline add)

4. **Catalogs & Content Tab**

   - Hazard Categories (inline add) ✅
   - Measure Building Blocks (inline add + persist)
   - Risk Matrix Labels (new section)
   - Audit Categories (moved from Intervals)

5. **Intervals and Deadlines Tab**

   - ISO Selection & Criteria
   - Risk Assessment Intervals (GBU + Audit)
   - Audit Intervals Configuration
   - Notification Logic

6. **Occupational Medical Care Tab** - G-Investigations
7. **API Integration Tab** - External systems

## 🎨 UI Improvements

- All inline add patterns should match Departments/Locations style
- White backgrounds for configuration sections
- Consistent button styling
- Proper spacing and borders
