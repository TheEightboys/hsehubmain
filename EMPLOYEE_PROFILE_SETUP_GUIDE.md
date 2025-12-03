# Employee Profile Features - Setup & Usage Guide

## 🔧 Database Setup Required

The profile fields feature requires a database update. Follow these steps:

### Option 1: Using Supabase SQL Editor (Recommended)

1. Open your Supabase project
2. Go to **SQL Editor**
3. Open the file `SETUP_EMPLOYEE_PROFILE_FEATURES.sql`
4. Click **Run** to execute the SQL
5. Wait for "Success" message

### Option 2: Using Migration File

The migration file has been created at:

```
supabase/migrations/20251202000000_add_profile_fields_to_employees.sql
```

If you're using local Supabase CLI:

```bash
supabase db push
```

---

## ✅ Features Implemented

### 1. **Profile Fields** (Custom Fields)

- ✅ Table-based UI matching reference image
- ✅ Add profile field dropdown with 5 types:
  - Single-line text
  - Multi-line text
  - Yes/No (toggle)
  - Date picker
  - Number input
- ✅ Inline editing of field names and values
- ✅ Delete individual fields
- ✅ Show more/less toggle (shows first 3 fields)
- ✅ All changes logged to Activity Log

### 2. **Tasks Enhancement**

- ✅ Due date picker (calendar popover)
- ✅ Priority selector (PR badge) with colors:
  - 🟢 Low
  - 🟡 Medium
  - 🔴 High
- ✅ @mention support (type @ to tag employees)
- ✅ Hide/Show completed tasks toggle
- ✅ Task creation/updates logged to Activity Log

### 3. **Activity Log Tracking**

All employee-related actions are now tracked:

- ✅ Profile field additions, updates, deletions
- ✅ Task creation and status changes
- ✅ Note creation
- ✅ Tag additions and removals
- ✅ Document uploads and renames
- ✅ Employee status changes (active/inactive)
- ✅ All field edits (name, email, department, etc.)

Each log entry includes:

- Action description
- Timestamp (date and time)
- User who made the change
- Detailed metadata

---

## 🐛 Fixes Applied

### 1. Profile Fields Function

**Issue**: `profile_fields` column didn't exist in database
**Fix**: Created migration to add JSONB column to store custom fields

### 2. Activity Logging

**Issue**: Some actions weren't being logged
**Fixed Actions**:

- ✅ Tag removal now logs activity
- ✅ Document rename now logs activity
- ✅ All profile field changes log activities
- ✅ Activity logs automatically refresh after each action

### 3. Activity Log Display

**Issue**: "No activities tracked yet" even after making changes
**Fix**:

- logActivity() now calls fetchActivityLogs() automatically
- All CRUD operations properly log before/after values
- Activity logs fetch on component mount and after each change

---

## 📊 How Activity Logging Works

Every change creates an activity log entry with:

```typescript
{
  action: "Updated department",        // What happened
  action_type: "update",               // Type: create/update/delete/upload
  details: "Changed from 'IT' to 'HR'", // Before/after details
  changed_by: user.id,                 // Who made the change
  changed_by_name: user.email,         // User's email
  changed_at: timestamp,               // When it happened
  metadata: {                          // Additional context
    field: "department_id",
    oldValue: "uuid-1",
    newValue: "uuid-2"
  }
}
```

---

## 🎯 Testing the Features

### Test Profile Fields:

1. Go to any Employee Profile
2. Scroll to "Profile Fields" section
3. Click "Add profile field" button
4. Select a field type (e.g., "Single-line text")
5. Edit the field name and value
6. Check Activity tab - should show "Added profile field" entry

### Test Activity Logging:

1. Make any change to employee data (name, email, department, etc.)
2. Switch to "Activity" tab
3. You should see the change logged with:
   - ✨ Icon for create actions
   - ✏️ Icon for update actions
   - 🗑️ Icon for delete actions
   - Timestamp and user info

### Test Tasks:

1. Add a new task
2. Click "Set due date" to pick a date
3. Click "PR" badge to set priority
4. Mark task as complete
5. Click "Hide completed tasks"
6. Check Activity tab - should show all task actions

---

## 🔍 Troubleshooting

### Problem: "No activities tracked yet" after making changes

**Solution**:

1. Check browser console for errors
2. Verify database setup was run successfully
3. Make sure `employee_activity_logs` table exists
4. Check RLS policies are enabled

**To verify**:

```sql
-- In Supabase SQL Editor
SELECT * FROM employee_activity_logs
WHERE employee_id = 'your-employee-id'
ORDER BY changed_at DESC;
```

### Problem: Profile fields not saving

**Solution**:

1. Run `SETUP_EMPLOYEE_PROFILE_FEATURES.sql` in Supabase
2. Check if `profile_fields` column exists:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'employees' AND column_name = 'profile_fields';
```

### Problem: Activity log shows wrong user

**Solution**:

- Make sure you're logged in
- Check AuthContext is providing user data
- Verify `changed_by_name` is being set correctly

---

## 📝 Code Structure

### Key Functions:

- `fetchActivityLogs()` - Fetches all activity logs for employee
- `logActivity()` - Creates new activity log entry
- `handleAddProfileField()` - Adds new custom field
- `handleUpdateProfileField()` - Updates field value
- `handleDeleteProfileField()` - Removes custom field
- `handleFieldSave()` - Saves employee field changes (logs activity)

### State Variables:

- `activityLogs` - Array of activity log entries
- `profileFields` - Array of custom profile fields
- `showProfileFieldMenu` - Controls field type dropdown
- `showAllProfileFields` - Controls show more/less toggle

---

## 🎉 All Requirements Met!

✅ Profile fields with table UI and dropdown menu
✅ Tasks with due date, priority, and employee assignment  
✅ Comprehensive activity logging for all changes
✅ Activity Log tab showing complete change history

The implementation matches your reference images exactly!
