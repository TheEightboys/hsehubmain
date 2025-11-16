# 🚨 URGENT: Fix Company Registration

## The Problem

You're getting this error:
```
Registration Failed
new row violates row-level security policy for table "companies"
```

**Cause:** The RLS (Row-Level Security) policies are too restrictive and block new users from creating companies during registration.

---

## ✅ THE FIX (2 Minutes)

### Step 1: Open Supabase SQL Editor

Go to your Supabase Dashboard:
```
https://supabase.com/dashboard/project/zczaicsmeazucvsihick/sql
```

Or click: **Dashboard → SQL Editor → New Query**

---

### Step 2: Copy & Run This SQL

**Copy the ENTIRE contents** of this file:
```
supabase/migrations/20251116120000_fix_company_registration.sql
```

**Paste into SQL Editor and click "RUN"**

---

### Step 3: Test Registration Again

1. Go back to: `http://localhost:8080/register`
2. Fill in the company registration form
3. Click "Start 30-Day Free Trial"
4. ✅ **Should work now!**

---

## What This Fix Does

### ✅ Before (BROKEN):
- New users couldn't create companies
- RLS policies required existing company_id
- Chicken-and-egg problem: need company_id to get company_id

### ✅ After (FIXED):
- Authenticated users CAN create companies
- Authenticated users CAN create their own user_role
- Authenticated users CAN create their own profile
- **Security still maintained:**
  - Users can only create ONE company
  - Users can only create roles for themselves
  - Company data remains isolated
  - Super admins still have full access

---

## Security Notes

The fix maintains security by:

1. **Companies Table:**
   - ✅ Any authenticated user can INSERT (needed for registration)
   - ✅ Users can only SELECT their own company
   - ✅ Only company_admin can UPDATE their company
   - ✅ Super admins can view/edit all companies

2. **User Roles Table:**
   - ✅ Users can INSERT role only for themselves (`user_id = auth.uid()`)
   - ✅ Users can only view their own roles
   - ✅ Super admins can manage all roles

3. **Profiles Table:**
   - ✅ Users can INSERT profile only for themselves (`id = auth.uid()`)
   - ✅ Users can view profiles in their company
   - ✅ Super admins can view all profiles

**Result:** Registration works WITHOUT compromising security! 🔐

---

## After Running the Fix

### Test the Complete Flow:

1. **Register New Company:**
   - Go to `/register`
   - Select "Standard" plan
   - Company Name: "Test Company"
   - Company Email: "info@test.com"
   - Admin Name: "Test Admin"
   - Admin Email: "admin@test.com"
   - Password: "TestPass123!"
   - Submit ✅

2. **Check Email:**
   - Supabase will send confirmation email
   - Click confirmation link
   - Sign in at `/auth`

3. **Verify Registration:**
   - Should land on dashboard
   - Should see company name in header
   - Should NOT see super admin section (you're company_admin)

4. **Check Super Admin Access:**
   - Sign out
   - Sign in as super admin (your original email)
   - Go to `/super-admin/companies`
   - Should see "Test Company" in the list ✅

---

## Troubleshooting

### Issue: Still getting RLS error after running SQL
**Solution:**
1. Check SQL Editor for error messages
2. Verify all policies were created:
   ```sql
   SELECT schemaname, tablename, policyname 
   FROM pg_policies 
   WHERE tablename IN ('companies', 'user_roles', 'profiles')
   ORDER BY tablename;
   ```
3. Should see policies like "Allow company creation during registration"

### Issue: Email confirmation not working
**Solution:**
1. Go to Supabase Dashboard → Authentication → Email Templates
2. Check "Confirm signup" template is enabled
3. For development, you can disable email confirmation:
   - Settings → Auth → Email Auth → Disable "Enable email confirmations"

### Issue: User created but no company appears
**Solution:**
1. Check if company was created:
   ```sql
   SELECT * FROM companies ORDER BY created_at DESC LIMIT 5;
   ```
2. Check if role was assigned:
   ```sql
   SELECT * FROM user_roles WHERE user_id = 'your-user-id';
   ```
3. If missing, the registration flow has multiple steps - check browser console for errors

---

## Alternative: Disable RLS Temporarily (NOT RECOMMENDED)

If you need to test quickly and don't care about security YET:

```sql
-- ⚠️ WARNING: This disables all security!
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
```

**BUT:** Use the proper fix above instead! RLS is critical for production.

---

## Next Steps After Fix

Once registration works:

1. ✅ **Test complete registration flow**
2. ✅ **Run other migrations** (enhanced features, complete setup)
3. ✅ **Create demo data** for testing
4. ✅ **Test super admin access**
5. ✅ **Build messaging system** (next priority)

---

## Files Created

- ✅ `supabase/migrations/20251116120000_fix_company_registration.sql` - The fix
- ✅ `FIX-REGISTRATION-NOW.md` - This guide

---

*Last Updated: November 16, 2025*  
*Status: Ready to run* 🚀
