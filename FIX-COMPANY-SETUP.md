# Fix for "No company ID found" Error

## Problem

Your user is authenticated but not linked to any company in the database.

## Solution

You need to run SQL commands in Supabase to create a company and link your user to it.

### Steps:

1. **Open Supabase Dashboard**

   - Go to https://supabase.com/dashboard
   - Select your project: `zczaicsmeazucvsihick`
   - Click on "SQL Editor" in the left sidebar

2. **Run this SQL command** (copy and paste the entire block):

```sql
DO $$
DECLARE
    v_user_id UUID;
    v_company_id UUID;
    v_email TEXT := 'YOUR_EMAIL_HERE'; -- ⚠️ CHANGE THIS TO YOUR ACTUAL EMAIL
BEGIN
    -- Get user ID
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found with email: %', v_email;
    END IF;

    RAISE NOTICE 'Found user ID: %', v_user_id;

    -- Check if user already has a company
    SELECT company_id INTO v_company_id FROM public.user_roles WHERE user_id = v_user_id LIMIT 1;

    IF v_company_id IS NULL THEN
        -- Create a new company
        INSERT INTO public.companies (name, email, subscription_tier, subscription_status, max_employees, is_active)
        VALUES ('My Company', v_email, 'basic', 'active', 100, true)
        RETURNING id INTO v_company_id;

        RAISE NOTICE 'Created company with ID: %', v_company_id;

        -- Assign user as company admin
        INSERT INTO public.user_roles (user_id, role, company_id)
        VALUES (v_user_id, 'company_admin', v_company_id);

        RAISE NOTICE 'SUCCESS! User assigned as company_admin to company %', v_company_id;
    ELSE
        RAISE NOTICE 'User already has company ID: %', v_company_id;
    END IF;
END $$;
```

3. **Replace `'YOUR_EMAIL_HERE'`** with your actual email (the one you use to log in)

   - Example: `v_email TEXT := 'kishore.05mk@gmail.com';`

4. **Click "Run"** or press `Ctrl+Enter`

5. **Refresh your app page** (press F5) and try adding an employee again

### What this does:

- Creates a company called "My Company"
- Assigns you as the `company_admin` of that company
- Links your user account to the company

### After running the SQL:

- Log out and log back in (or just refresh the page)
- The "No company ID found" error should be gone
- You should be able to add employees successfully

---

## Alternative: Check existing data

If you want to check what's currently in your database first:

```sql
-- Check your user
SELECT id, email FROM auth.users WHERE email = 'YOUR_EMAIL_HERE';

-- Check existing companies
SELECT * FROM public.companies;

-- Check existing user roles
SELECT * FROM public.user_roles;
```
