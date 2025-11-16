# 🚀 IMMEDIATE FIX - RUN THESE 4 QUERIES NOW!

## Copy and paste these queries ONE BY ONE into Supabase SQL Editor

### Query 1: Get Your Full User ID
\`\`\`sql
SELECT id as user_id, email FROM auth.users WHERE email = 'barathanand2004@gmail.com';
\`\`\`
**Copy the `user_id` from the result**

---

### Query 2: Get Your Latest Company ID  
\`\`\`sql
SELECT id as company_id, name, created_at FROM companies ORDER BY created_at DESC LIMIT 5;
\`\`\`
**Copy the `company_id` of YOUR company**

---

### Query 3: Check If Link Exists
\`\`\`sql
SELECT * FROM user_roles WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'barathanand2004@gmail.com');
\`\`\`
**If this returns EMPTY, that's the problem!**

---

### Query 4: CREATE THE LINK (Automatic!)
\`\`\`sql
INSERT INTO user_roles (user_id, company_id, role)
SELECT 
  (SELECT id FROM auth.users WHERE email = 'barathanand2004@gmail.com'),
  (SELECT id FROM companies ORDER BY created_at DESC LIMIT 1),
  'company_admin'
ON CONFLICT DO NOTHING
RETURNING *;
\`\`\`
**Should return 1 row showing the new link**

---

### Query 5: VERIFY IT WORKED
\`\`\`sql
SELECT 
  ur.role,
  au.email,
  c.name as company_name,
  c.id as company_id
FROM user_roles ur
JOIN auth.users au ON au.id = ur.user_id
JOIN companies c ON c.id = ur.company_id
WHERE au.email = 'barathanand2004@gmail.com';
\`\`\`
**Should return 1 row with your email and company name**

---

## ✅ After Running All 5 Queries:

1. Go back to your app: http://localhost:8080/employees
2. Click **"Refresh Session"** button
3. Wait 2-3 seconds
4. **Orange warning should disappear!**
5. Debug line should show Company ID (not "null")

---

## 🎯 That's It!

These queries will:
- ✅ Find your user ID automatically
- ✅ Find your latest company automatically  
- ✅ Link them together
- ✅ Make you the company_admin

No manual UUID copying needed!
