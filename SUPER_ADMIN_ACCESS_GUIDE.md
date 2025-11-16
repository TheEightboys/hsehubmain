# 🔐 Super Admin Access Guide

## How to Access Super Admin Features

### Step 1: Create Your Super Admin Account

You need to assign the `super_admin` role to your user account in the database.

#### Option A: Via Supabase SQL Editor (Recommended)

1. Go to: https://supabase.com/dashboard/project/zczaicsmeazucvsihick/sql
2. Run this SQL query (replace with your email):

```sql
-- Replace 'your-email@example.com' with the email you used to sign up
INSERT INTO public.user_roles (user_id, role, company_id)
SELECT id, 'super_admin', NULL
FROM auth.users
WHERE email = 'your-email@example.com'
ON CONFLICT (user_id, role, company_id) DO NOTHING;
```

3. Click "Run" button

#### Option B: Via Supabase Table Editor

1. Go to: https://supabase.com/dashboard/project/zczaicsmeazucvsihick/editor
2. Click on `user_roles` table
3. Click "Insert" → "Insert row"
4. Fill in:
   - `user_id`: Find your user ID from the `auth.users` table (your UUID)
   - `role`: Select `super_admin`
   - `company_id`: Leave as `NULL`
5. Click "Save"

### Step 2: Sign In

1. Navigate to: http://localhost:5173/auth (or your deployed URL)
2. Sign in with your email and password
3. You'll be redirected to `/dashboard`

### Step 3: Access Super Admin Features

Once signed in as a super admin, you have **3 ways** to access Super Admin features:

#### Method 1: Sidebar Navigation (NEW!)
- Look at the left sidebar
- You'll see a **red "SUPER ADMIN"** section with:
  - 🛡️ **Super Dashboard** → `/super-admin/dashboard`
  - 🏢 **Manage Companies** → `/super-admin/companies`

#### Method 2: Direct URL
Simply navigate to:
- http://localhost:5173/super-admin/dashboard
- http://localhost:5173/super-admin/companies

#### Method 3: From Regular Dashboard
On `/dashboard`, you'll see buttons to access super admin features.

---

## 🎯 Super Admin Features

### Super Admin Dashboard (`/super-admin/dashboard`)

**What you can see:**
- 📊 **Total Companies** - All registered organizations
- 💰 **Active Subscriptions** - Paying customers count
- ⚠️ **Trial Accounts** - Companies in evaluation phase
- 💵 **Monthly Revenue** - Calculated from active subscriptions
- 👥 **Total Users** - All users across all companies

**Recent Companies Section:**
- View the 5 most recently registered companies
- Quick view of their subscription tier and status
- Click "View All →" to go to full company management

### Manage Companies (`/super-admin/companies`)

**Features:**
- 🔍 **Search** - Find companies by name or email
- 👁️ **View Details** - Complete company information
- ✏️ **Edit Subscriptions** - Change:
  - Subscription tier (basic/standard/premium)
  - Subscription status (trial/active/inactive/cancelled)
  - Max employees limit
- 📊 **Company Stats** - See total company count

---

## 🚀 Quick Setup Tutorial

### Complete Walkthrough:

1. **Create Super Admin User**
   ```sql
   -- Run in Supabase SQL Editor
   INSERT INTO public.user_roles (user_id, role, company_id)
   SELECT id, 'super_admin', NULL
   FROM auth.users
   WHERE email = 'your-email@example.com'
   ON CONFLICT DO NOTHING;
   ```

2. **Sign Out & Sign Back In**
   - If you're already logged in, sign out first
   - Sign back in to load the new role

3. **Check Sidebar**
   - You should now see the red "SUPER ADMIN" section
   - Click "Super Dashboard"

4. **Explore Features**
   - View system metrics
   - Click "Manage Companies"
   - Search/view/edit companies

---

## 🎨 What You'll See

### Sidebar with Super Admin:
```
Dashboard
━━━━━━ SUPER ADMIN ━━━━━━
🛡️ Super Dashboard     ← Red border
🏢 Manage Companies
━━━━━━━━━━━━━━━━━━━━━━━━
Employees
Activity Groups
Risk Assessments
...
```

### Super Admin Badge:
In the sidebar footer, you'll see:
```
CA (or your initials)
Company Admin
[super admin] ← Badge showing your role
```

---

## 🔐 Security Notes

### Super Admin Permissions:

**✅ Can Do:**
- View ALL companies and their data
- Modify subscription tiers and status
- Change employee limits
- View system-wide metrics
- Support any company

**❌ Cannot Do:**
- Access company-specific data directly (unless also assigned as company_admin for that company)
- Delete companies (for safety - must be done via database)
- Change subscription prices (defined in subscription_packages table)

### Multi-Role Support:

You can be both `super_admin` AND `company_admin` for a company:

```sql
-- Super admin role
INSERT INTO user_roles (user_id, role, company_id) 
VALUES ('your-user-id', 'super_admin', NULL);

-- Also company admin for a specific company
INSERT INTO user_roles (user_id, role, company_id) 
VALUES ('your-user-id', 'company_admin', 'company-id-here');
```

This lets you:
- Access super admin features
- Also manage a specific company's data

---

## 🧪 Testing Super Admin

### Test Checklist:

- [ ] **Sign in as super admin**
- [ ] **Verify red "SUPER ADMIN" section appears in sidebar**
- [ ] **Click "Super Dashboard"**
  - [ ] Verify metrics show (total companies, revenue, etc.)
  - [ ] View recent companies list
- [ ] **Click "Manage Companies"**
  - [ ] Search for a company
  - [ ] Click view (eye icon) on a company
  - [ ] Click edit (pencil icon) on a company
  - [ ] Change subscription tier
  - [ ] Save changes
  - [ ] Verify changes persisted
- [ ] **Navigate back to regular Dashboard**
  - [ ] Verify you can still access company features

---

## 🐛 Troubleshooting

### "I don't see the Super Admin section in sidebar"

**Possible causes:**
1. **Role not assigned** - Run the SQL query again
2. **Need to re-login** - Sign out and sign back in
3. **Wrong email** - Check the email in SQL matches your login
4. **Caching** - Clear browser cache and reload

**Check your role:**
```sql
-- Run in Supabase SQL Editor
SELECT ur.role, u.email
FROM user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE u.email = 'your-email@example.com';
```

Should return: `super_admin | your-email@example.com`

### "I see 'Access Denied' or redirect to Dashboard"

**Solution:**
- Check AuthContext is loading your role correctly
- Verify `userRole` state in browser dev tools (React DevTools)
- Check browser console for errors

### "No companies showing in Manage Companies"

**Possible causes:**
1. **No companies registered yet** - Register a test company at `/register`
2. **Database connection issue** - Check Supabase connection
3. **RLS policy issue** - Super admins should bypass company-scoped RLS

**Create test company:**
- Navigate to `/register`
- Fill in form with test data
- Complete registration
- Should now appear in Manage Companies

---

## 📊 Company Registration Flow (For Testing)

To test the full system:

1. **As Super Admin:**
   - View empty companies list

2. **Sign Out**

3. **Register Test Company:**
   - Go to `/register`
   - Select "Standard" plan
   - Company Name: "Test Company Inc"
   - Company Email: "test@company.com"
   - Your Name: "Test Admin"
   - Email: "testadmin@company.com"
   - Password: "TestPassword123!"
   - Submit

4. **Sign In as New Admin:**
   - Use the credentials you just created
   - Verify you land on company dashboard
   - You should NOT see super admin section

5. **Sign Out, Sign Back In as Super Admin:**
   - Go to `/super-admin/companies`
   - You should now see "Test Company Inc"
   - Click edit, change to "active" subscription
   - Verify changes saved

---

## 🎓 Best Practices

### For Development:
1. Always have 1 super admin account for testing
2. Create 2-3 test companies to verify multi-tenancy
3. Test data isolation between companies
4. Verify super admin can see all, but companies can't see each other

### For Production:
1. Limit super admin access to trusted team members only
2. Use strong passwords for super admin accounts
3. Enable 2FA on super admin accounts (Supabase Auth settings)
4. Log all super admin actions (add audit trail)
5. Regularly review who has super admin access

---

## 🎉 You're All Set!

Now you can:
- ✅ Access super admin dashboard
- ✅ Manage all companies
- ✅ View system metrics
- ✅ Support customers
- ✅ Monitor subscriptions

**Next Steps:**
1. Register a few test companies
2. Practice editing subscriptions
3. Test the automated workflows
4. Review the analytics

---

**Need Help?**
- Check: `ENHANCED_IMPLEMENTATION_GUIDE.md`
- Check: `SUPER_ADMIN_SETUP.md`
- Check: `IMPLEMENTATION_COMPLETE.md`
