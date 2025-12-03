# Quick Start Guide - New Features

## 🚀 Getting Started

Two new features have been added to your HSE Hub application:

1. **Employee Profile Fields** (Languages, Skills, Salary)
2. **ISO Selection & Criteria System** (Enhanced)

---

## ⚡ Quick Setup (5 minutes)

### Step 1: Run Database Migration

**Required for Employee Profile Fields:**

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Open the file: `ADD_EMPLOYEE_PROFILE_FIELDS.sql`
4. Copy and paste the contents into SQL Editor
5. Click "Run"

You should see: ✓ Success message

### Step 2: Test Employee Profile Fields

1. Navigate to **Employees** page
2. Click on any employee to open their profile
3. Scroll down to see the new **"Profile Fields"** card
4. It should appear after "Contact" and before "Profile Fields Table"
5. Click the pencil icon (✏️) next to "Languages Known"
6. Enter: "English, German, Spanish"
7. Click "Save" button
8. Verify it displays correctly

**Repeat for Skills and Salary fields**

### Step 3: Test ISO Criteria System

1. Navigate to **Settings** page
2. Click on **"Intervals"** tab in the left sidebar
3. Scroll down to **"ISO Selection"** section
4. Check one or more ISO standards (e.g., ISO 45001)
5. Observe the "Criteria" section appear below
6. Test the view toggle:
   - Click "**Kompakt**" - See 4 key criteria
   - Click "**Vollständig**" - See 12+ detailed criteria
7. Test custom criteria:
   - Click "**Hinzufügen**" button
   - Enter: "Custom safety check"
   - Press Enter or click "Speichern"
   - Verify it appears in the list
   - Hover over it and click trash icon to delete

---

## 📋 Feature Details

### 1. Employee Profile Fields

**Location:** Employee Profile Page → "Profile Fields" Card

**Fields Added:**

- **Languages Known** - Multi-line text field
- **Skills** - Multi-line text field
- **Salary** - Single-line text field

**How to Use:**

1. Click pencil icon (✏️) to edit
2. Enter text in the field
3. Click "Save" (or press Enter for single-line)
4. Click "Cancel" or press Escape to discard changes

**Features:**

- ✅ Inline editing
- ✅ Auto-save to database
- ✅ Activity logging (tracked in Activity tab)
- ✅ Empty state handling ("No languages specified")

---

### 2. ISO Selection & Criteria System

**Location:** Settings → Intervals Tab → "ISO Selection" Card

**ISO Standards Supported:**

- ISO 45001 (Occupational Health & Safety)
- ISO 14001 (Environmental Management)
- ISO 9001 (Quality Management)
- ISO 50001 (Energy Management)

**View Modes:**

**Kompakt (Compact):**

- Shows 4-6 key criteria per ISO
- Quick overview mode
- Essential requirements only

**Vollständig (Complete):**

- Shows 12+ detailed criteria per ISO
- Comprehensive view
- All requirements listed

**Custom Criteria:**

- Click "Hinzufügen" to add custom criteria per ISO
- Enter text and save
- Hover over custom criteria to see delete button
- Predefined criteria cannot be deleted

**Checkboxes:**

- Each criterion has a checkbox
- Currently for selection/tracking
- Can be used for audit preparation

---

## 🎯 Use Cases

### Employee Profile Fields

**Use Case 1: Track Multilingual Employees**

```
Languages Known: English (Native), German (B2), Spanish (A1)
Skills: Technical Translation, International Communication
Salary: €55,000 per year + benefits
```

**Use Case 2: Identify Training Needs**

```
Languages Known: German
Skills: Basic Safety Training, First Aid Certified
Salary: €45,000 per year
```

### ISO Criteria System

**Use Case 1: Prepare for ISO 45001 Audit**

1. Select ISO 45001
2. Switch to "Vollständig" view
3. Review all 12 criteria
4. Check off completed items
5. Add custom criteria: "Monthly safety meetings"
6. Use as audit preparation checklist

**Use Case 2: Multi-Standard Compliance**

1. Select ISO 45001 + ISO 14001
2. See criteria for both standards
3. Add custom criteria specific to your company
4. Track compliance across multiple standards

---

## 🔧 Troubleshooting

### Employee Profile Fields Not Showing

**Problem:** Fields don't appear or show errors

**Solution:**

1. Check if database migration was run
2. Verify columns exist in employees table:
   ```sql
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'employees'
   AND column_name IN ('languages', 'skills', 'salary');
   ```
3. Clear browser cache (Ctrl+Shift+Del)
4. Refresh the page (F5)

### ISO Criteria Not Displaying

**Problem:** Criteria section is empty

**Solution:**

1. Make sure at least one ISO is selected (checkbox checked)
2. Check browser console for JavaScript errors (F12)
3. Verify you're on the "Intervals" tab in Settings
4. Try toggling between Kompakt/Vollständig views

### Custom Criteria Not Saving

**Problem:** Custom criteria disappear after page refresh

**Note:** This is expected behavior in current version!

**Current Behavior:**

- Custom criteria are stored in component state (memory)
- They persist during the session but not after page refresh
- This is intentional for the initial implementation

**Future Enhancement:**

- If you need persistent custom criteria, run the optional migration: `ISO_CRITERIA_PERSISTENCE_OPTIONAL.sql`
- This creates a database table to store custom criteria permanently
- Requires additional frontend code integration

---

## 📊 Data Storage

### Employee Profile Fields

```
Table: employees
Columns:
- languages (TEXT) - Multi-line text
- skills (TEXT) - Multi-line text
- salary (TEXT) - Free text format
```

### ISO Criteria (Optional)

```
Table: company_iso_criteria (if you run optional migration)
Columns:
- company_id
- iso_code (e.g., 'ISO_45001')
- criterion_text
- is_checked (boolean)
- is_custom (boolean)
```

---

## 🎨 UI/UX Features

### Employee Profile

- Clean card layout
- Inline editing with visual feedback
- Edit/Save/Cancel buttons
- Consistent with existing design
- Mobile responsive

### ISO Criteria

- Modern card design per ISO
- Hover effects on criteria rows
- Badge showing criteria count
- Color-coded buttons (Kompakt/Vollständig)
- German language labels
- Informational notes section
- Trash icon appears on hover for custom items

---

## 🚧 Future Enhancements (Optional)

### Employee Profile:

- [ ] Add language proficiency levels (A1-C2)
- [ ] Add skill categories/tags
- [ ] Add salary history tracking
- [ ] Add currency selector
- [ ] Add automatic language detection
- [ ] Add skills suggestions/autocomplete

### ISO Criteria:

- [ ] Persist custom criteria to database ✓ (SQL provided)
- [ ] Add bulk import/export
- [ ] Add search/filter for criteria
- [ ] Add drag-and-drop reordering
- [ ] Link criteria to audit templates
- [ ] Add progress tracking dashboard
- [ ] Add criteria completion percentage
- [ ] Add PDF export of checklists

---

## 📞 Support

If you need help:

1. Check `FEATURE_ADDITIONS_SUMMARY.md` for detailed documentation
2. Review SQL files for database schema
3. Check browser console (F12) for errors
4. Verify Supabase RLS policies allow access
5. Test with different user roles

---

## ✅ Verification Checklist

After setup, verify:

**Employee Profile:**

- [ ] "Profile Fields" card visible on employee profile
- [ ] Can edit Languages field
- [ ] Can edit Skills field
- [ ] Can edit Salary field
- [ ] Save functionality works
- [ ] Cancel functionality works
- [ ] Activity log records changes
- [ ] Empty state shows correct message

**ISO Criteria:**

- [ ] ISO selection checkboxes work
- [ ] Kompakt view shows fewer criteria
- [ ] Vollständig view shows all criteria
- [ ] Different ISOs show different criteria
- [ ] Multiple ISOs can be selected
- [ ] "Hinzufügen" button works
- [ ] Custom criteria can be added
- [ ] Custom criteria can be deleted
- [ ] Criteria checkboxes are interactive
- [ ] Badge shows correct count

---

## 🎉 You're All Set!

Both features are now fully functional and ready to use. Enjoy the enhanced HSE Hub experience!

**Quick Links:**

- [Detailed Documentation](./FEATURE_ADDITIONS_SUMMARY.md)
- [Database Migration](./ADD_EMPLOYEE_PROFILE_FIELDS.sql)
- [Optional ISO Persistence](./ISO_CRITERIA_PERSISTENCE_OPTIONAL.sql)
