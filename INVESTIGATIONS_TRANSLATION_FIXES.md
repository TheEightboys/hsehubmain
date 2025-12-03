# Investigations Page - Translation Fixes Required

## Issues Found:

1. **Translation keys missing prefix** - Most translations are using incorrect keys without "investigations." prefix
2. **Some translations pointing to non-existent keys** - Using generic keys that don't exist in LanguageContext
3. **Inconsistent translation usage** - Mixing correct and incorrect translation patterns

## Files to Fix:

- `src/pages/Investigations.tsx`

## Required Changes:

### 1. Page Title and Subtitle (Lines ~519-523)

```typescript
// WRONG:
<h2 className="text-3xl font-bold">{t("title")}</h2>
<p className="text-muted-foreground">{t("overview")}</p>

// CORRECT:
<h2 className="text-3xl font-bold">{t("investigations.title")}</h2>
<p className="text-muted-foreground">{t("investigations.overview")}</p>
```

### 2. Card Header (Lines ~528-531)

```typescript
// WRONG:
<CardTitle>{t("allInvestigations")}</CardTitle>
<CardDescription>{t("employeesWithInvestigations")}</CardDescription>

// CORRECT:
<CardTitle>{t("investigations.allInvestigations")}</CardTitle>
<CardDescription>{t("investigations.employeesWithInvestigations")}</CardDescription>
```

### 3. Export PDF Button (Line ~535)

```typescript
// WRONG:
{
  t("exportPDF");
}

// CORRECT:
{
  t("investigations.exportPDF");
}
```

### 4. New Investigation Button (Line ~541)

```typescript
// WRONG:
{
  t("newInvestigation");
}

// CORRECT:
{
  t("investigations.newInvestigation");
}
```

### 5. Dialog Title (Lines ~546-549)

```typescript
// WRONG:
{
  editingInvestigation ? t("editInvestigation") : t("newInvestigation");
}
{
  t("investigationDetails");
}

// CORRECT:
{
  editingInvestigation
    ? t("investigations.editInvestigation")
    : t("investigations.newInvestigation");
}
{
  t("investigations.investigationDetails");
}
```

### 6. Form Fields (Lines ~554-596)

```typescript
// WRONG:
{t("gCode")} *
{t("employee")} *
placeholder={t("selectEmployee")}
{t("none")}

// CORRECT:
{t("investigations.gCode")} *
{t("investigations.employee")} *
placeholder={t("investigations.selectEmployee")}
{t("investigations.none")}
```

### 7. Date Fields (Lines ~600-620)

```typescript
// WRONG:
{
  t("startDate");
}
{
  t("dueDate");
}
{
  t("appointmentDate");
}

// CORRECT:
{
  t("investigations.startDate");
}
{
  t("investigations.dueDate");
}
{
  t("investigations.appointmentDate");
}
```

### 8. Doctor Field (Lines ~627-633)

```typescript
// WRONG:
{t("doctor")}
placeholder={t("doctorName")}

// CORRECT:
{t("investigations.doctor")}
placeholder={t("investigations.doctorName")}
```

### 9. Status Select (Lines ~648-656)

```typescript
// WRONG:
{
  t("planned");
}
{
  t("completed");
}

// CORRECT:
{
  t("investigations.planned");
}
{
  t("investigations.completed");
}
```

### 10. Description Field (Line ~660)

```typescript
// WRONG:
{
  t("description");
}

// CORRECT:
{
  t("investigations.description");
}
```

### 11. Form Buttons (Lines ~679-687)

```typescript
// WRONG:
{
  t("cancel");
}
{
  editingInvestigation ? t("update") : t("create");
}

// CORRECT:
{
  t("investigations.cancel");
}
{
  editingInvestigation
    ? t("investigations.update")
    : t("investigations.create");
}
```

### 12. View Mode Buttons (Lines ~698-710)

```typescript
// WRONG:
{
  t("employeeView");
}
{
  t("dateView");
}

// CORRECT:
{
  t("investigations.employeeView");
}
{
  t("investigations.dateView");
}
```

### 13. Search and Filters (Lines ~717-759)

```typescript
// WRONG:
placeholder={t("searchPlaceholder")}
placeholder={t("plannedOrDue")}
{t("allTypes")}
{t("planned")}
{t("completed")}
placeholder={t("allDepartments")}
{t("allDepartments")}
placeholder={t("allGroups")}
{t("allGroups")}
placeholder={t("fromDate")}
placeholder={t("toDate")}

// CORRECT:
placeholder={t("investigations.search")}
placeholder={t("investigations.filterStatus")}
{t("common.all")}
{t("investigations.planned")}
{t("investigations.completed")}
placeholder={t("common.allDepartments")}
{t("common.allDepartments")}
placeholder={t("common.allGroups")}
{t("common.allGroups")}
placeholder={t("common.fromDate")}
placeholder={t("common.toDate")}
```

### 14. Employee View Table Headers (Lines ~773-781)

```typescript
// WRONG:
<TableHead>{t("name")}</TableHead>
<TableHead>{t("firstName")}</TableHead>
<TableHead>{t("department")}</TableHead>
<TableHead>{t("location")}</TableHead>
<TableHead>{t("group")}</TableHead>
<TableHead>{t("gInvestigations")}</TableHead>
<TableHead className="text-right">{t("actions")}</TableHead>

// CORRECT:
<TableHead>{t("common.lastName")}</TableHead>
<TableHead>{t("common.firstName")}</TableHead>
<TableHead>{t("common.department")}</TableHead>
<TableHead>{t("common.location")}</TableHead>
<TableHead>{t("common.group")}</TableHead>
<TableHead>{t("investigations.gCode")}</TableHead>
<TableHead className="text-right">{t("common.actions")}</TableHead>
```

### 15. No Results Message (Line ~790)

```typescript
// WRONG:
{
  t("noInvestigations");
}

// CORRECT:
{
  t("investigations.noInvestigations");
}
```

### 16. Edit Button (Line ~844)

```typescript
// WRONG:
{
  t("edit");
}

// CORRECT:
{
  t("common.edit");
}
```

### 17. Date View Table Headers (Lines ~860-868)

```typescript
// WRONG:
<TableHead>{t("employee")}</TableHead>
<TableHead>{t("investigation")}</TableHead>
<TableHead>{t("dueDate")}</TableHead>
<TableHead>{t("appointmentDate")}</TableHead>
<TableHead>{t("doctor")}</TableHead>
<TableHead className="text-right">{t("actions")}</TableHead>

// CORRECT:
<TableHead>{t("common.employee")}</TableHead>
<TableHead>{t("investigations.gCode")}</TableHead>
<TableHead>{t("investigations.dueDate")}</TableHead>
<TableHead>{t("investigations.appointmentDate")}</TableHead>
<TableHead>{t("investigations.doctor")}</TableHead>
<TableHead className="text-right">{t("common.actions")}</TableHead>
```

### 18. Toast Messages (Lines ~298-314)

```typescript
// WRONG:
toast({ title: t("success"), description: t("investigationUpdated") });
toast({ title: t("success"), description: t("investigationCreated") });
toast({
  title: t("error"),
  description: error.message || t("savingError"),
  variant: "destructive",
});

// CORRECT:
toast({ title: t("common.success"), description: t("investigations.updated") });
toast({ title: t("common.success"), description: t("investigations.created") });
toast({
  title: t("common.error"),
  description: error.message || t("common.savingError"),
  variant: "destructive",
});
```

### 19. PDF Export (Lines ~448-468)

```typescript
// WRONG:
doc.text(t("investigationsOverview"), 14, 22);
doc.text(`${t("createdOn")} ${format(new Date(), "dd.MM.yyyy")}`, 14, 30);
[t("name"), t("firstName"), t("department"), t("group"), t("gInvestigations")][
  (t("employee"),
  t("investigation"),
  t("dueDate"),
  t("appointmentDate"),
  t("doctor"),
  t("common.status"))
];
toast({ title: t("success"), description: t("pdfExported") });

// CORRECT:
doc.text(t("investigations.overview"), 14, 22);
doc.text(
  `${t("common.createdOn")} ${format(new Date(), "dd.MM.yyyy")}`,
  14,
  30
);
[
  t("common.lastName"),
  t("common.firstName"),
  t("common.department"),
  t("common.group"),
  t("investigations.gCode"),
][
  (t("common.employee"),
  t("investigations.gCode"),
  t("investigations.dueDate"),
  t("investigations.appointmentDate"),
  t("investigations.doctor"),
  t("common.status"))
];
toast({ title: t("common.success"), description: t("common.pdfExported") });
```

## Summary:

- **Total translation keys to fix**: ~50+
- **Main issues**: Missing "investigations." prefix, using non-existent generic keys
- **Impact**: German translations not showing, displaying English fallback or translation keys

## How to Apply:

Use Find & Replace in VS Code with these patterns (use carefully):

1. `t("title")` → `t("investigations.title")`
2. `t("overview")` → `t("investigations.overview")`
3. Continue pattern for all keys listed above

Or manually edit each line following the correct patterns shown.
