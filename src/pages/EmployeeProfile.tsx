import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Combobox } from "@/components/ui/combobox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  ArrowLeft,
  Edit2,
  Save,
  X,
  Upload,
  FileText,
  Download,
  Trash2,
  Heart,
  GraduationCap,
  ClipboardList,
  Plus,
  CalendarCheck,
  StickyNote,
  Tag,
  Users,
  Activity,
  Bold,
  Italic,
  Underline,
  List,
  Link,
  Paperclip,
  AtSign,
  Smile,
  ThumbsUp,
  RefreshCw,
  Reply,
  Eye,
  ChevronDown,
  Pencil,
  FileImage,
  File,
  FileSpreadsheet,
  FileCode,
  Calendar as CalendarIcon,
  Hash,
  CheckCircle,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";

interface EmployeeData {
  id: string;
  employee_number: string;
  full_name: string;
  email: string;
  hire_date: string | null;
  department_id: string | null;
  job_role_id: string | null;
  exposure_group_id: string | null;
  is_active: boolean;
  departments?: { id: string; name: string } | null;
  job_roles?: { id: string; title: string } | null;
  exposure_groups?: { id: string; name: string } | null;
  notes?: string | null;
  tags?: string[] | null;
  languages?: string | null;
  skills?: string | null;
  salary?: string | null;
}

interface HealthCheckup {
  id: string;
  employee_id: string;
  company_id: string;
  investigation_id?: string;
  investigation_name?: string;
  appointment_date: string;
  completion_date?: string | null;
  status: string;
  certificate_url?: string | null;
  notes: string | null;
}

interface EmployeeDocument {
  id: string;
  title: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  category: string;
  created_at: string;
  uploaded_by: string | null;
}

interface ActivityLog {
  id: string;
  employee_id: string;
  company_id: string;
  action: string;
  action_type: string;
  details: string | null;
  changed_by: string;
  changed_by_name: string;
  changed_at: string;
  metadata?: Record<string, any>;
}

interface Training {
  id: string;
  training_type: string;
  status: string;
  assigned_date: string;
  completion_date: string | null;
  expiry_date: string | null;
}

export default function EmployeeProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { companyId, user } = useAuth();

  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [editMode, setEditMode] = useState<{ [key: string]: boolean }>({});
  const [formData, setFormData] = useState<Partial<EmployeeData>>({});
  const [loading, setLoading] = useState(true);

  // Derived state for first/last name from full_name
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // Data for dropdowns
  const [departments, setDepartments] = useState<any[]>([]);
  const [jobRoles, setJobRoles] = useState<any[]>([]);

  // Tab data
  const [healthCheckups, setHealthCheckups] = useState<HealthCheckup[]>([]);
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [notes, setNotes] = useState<string>("");
  const [notesList, setNotesList] = useState<any[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [employees, setEmployees] = useState<any[]>([]);

  // Task enhancement states
  const [newTaskDueDate, setNewTaskDueDate] = useState<Date | undefined>(
    undefined
  );
  const [newTaskPriority, setNewTaskPriority] = useState<
    "low" | "medium" | "high"
  >("medium");
  const [hideCompletedTasks, setHideCompletedTasks] = useState(false);

  // Separate mention dropdown states for Tasks and Notes
  const [showTaskMentionDropdown, setShowTaskMentionDropdown] = useState(false);
  const [taskMentionSearch, setTaskMentionSearch] = useState("");
  const [showNotesMentionDropdown, setShowNotesMentionDropdown] =
    useState(false);
  const [notesMentionSearch, setNotesMentionSearch] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);

  // Note reply state
  const [replyingToNoteId, setReplyingToNoteId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  // Document preview and rename states
  const [previewDocument, setPreviewDocument] = useState<any>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(
    null
  );
  const [editingDocumentTitle, setEditingDocumentTitle] = useState("");

  // Custom input states
  const [exposureGroups, setExposureGroups] = useState<any[]>([]);

  // Profile fields states
  const [profileFields, setProfileFields] = useState<any[]>([]);
  const [showProfileFieldMenu, setShowProfileFieldMenu] = useState(false);
  const [showAllProfileFields, setShowAllProfileFields] = useState(false);

  // Special profile fields (languages, skills, salary)
  const [languages, setLanguages] = useState("");
  const [skills, setSkills] = useState("");
  const [salary, setSalary] = useState("");
  const [editingSpecialField, setEditingSpecialField] = useState<string | null>(
    null
  );

  // Check-ups states
  const [isCheckupDialogOpen, setIsCheckupDialogOpen] = useState(false);
  const [gInvestigations, setGInvestigations] = useState<any[]>([]);
  const [checkupFormData, setCheckupFormData] = useState({
    investigation_id: "",
    appointment_date: "",
    status: "open" as "done" | "open" | "planned",
    completion_date: "",
    certificate_url: "",
    notes: "",
  });
  const [editingCheckup, setEditingCheckup] = useState<any>(null);

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);

  const { t } = useLanguage();

  useEffect(() => {
    if (id && companyId) {
      fetchEmployeeData();
      fetchDropdownData();
      fetchHealthCheckups();
      fetchDocuments();
      fetchActivityLogs();
      fetchTasks();
      fetchEmployees();
      fetchGInvestigations();
      fetchProfileFields();
    }
  }, [id, companyId]);

  const fetchEmployeeData = async () => {
    try {
      const { data, error } = await supabase
        .from("employees")
        .select(
          `
          *,
          departments (id, name),
          job_roles (id, title),
          exposure_groups (id, name)
        `
        )
        .eq("id", id)
        .single();

      if (error) throw error;

      setEmployee(data as any);
      setFormData(data as any);
      // Don't load raw notes into textarea, leave it empty for new notes
      setNotes("");
      setTags((data as any)?.tags || []);

      // Load special profile fields
      setLanguages((data as any)?.languages || "");
      setSkills((data as any)?.skills || "");
      setSalary((data as any)?.salary || "");

      // Split full_name into first and last name
      if ((data as any)?.full_name) {
        const nameParts = (data as any).full_name.trim().split(" ");
        setFirstName(nameParts[0] || "");
        setLastName(nameParts.slice(1).join(" ") || "");
      }
    } catch (error) {
      console.error("Error fetching employee:", error);
      toast.error("Failed to load employee data");
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    if (!companyId) return;

    try {
      const [depts, roles, groups] = await Promise.all([
        supabase
          .from("departments")
          .select("id, name")
          .eq("company_id", companyId),
        supabase
          .from("job_roles")
          .select("id, title")
          .eq("company_id", companyId),
        supabase
          .from("exposure_groups")
          .select("id, name")
          .eq("company_id", companyId),
      ]);

      setDepartments(depts.data || []);
      setJobRoles(roles.data || []);
      setExposureGroups(groups.data || []);
    } catch (error) {
      console.error("Error fetching dropdown data:", error);
    }
  };

  const fetchHealthCheckups = async () => {
    try {
      const { data, error } = await supabase
        .from("health_checkups")
        .select("*")
        .eq("employee_id", id)
        .order("appointment_date", { ascending: false });

      if (error) {
        // If table doesn't exist yet, just set empty array
        console.log("Health checkups table not created yet");
        setHealthCheckups([]);
        return;
      }
      setHealthCheckups((data as any) || []);
    } catch (error) {
      console.error("Error fetching health checkups:", error);
      setHealthCheckups([]);
    }
  };

  const fetchDocuments = async () => {
    if (!companyId || !id) return;

    try {
      // Fetch documents tagged with employee ID or name
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Filter documents that have employee ID in tags or description
      const employeeDocuments = (data || []).filter(
        (doc: any) =>
          doc.tags?.includes(id) ||
          doc.tags?.includes(employee?.employee_number) ||
          doc.description?.includes(id)
      );

      setDocuments(employeeDocuments as EmployeeDocument[]);
    } catch (error) {
      console.error("Error fetching documents:", error);
      setDocuments([]);
    }
  };

  const fetchActivityLogs = async () => {
    try {
      console.log("=== Fetching Activity Logs ===");
      console.log("Employee ID:", id);
      console.log("Company ID:", companyId);
      console.log("User ID:", user?.id);

      const { data, error } = await supabase
        .from("employee_activity_logs")
        .select("*")
        .eq("employee_id", id)
        .order("changed_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("❌ Error fetching activity logs:", error);
        console.error("Error code:", error.code);
        console.error("Error message:", error.message);
        console.error("Error details:", error.details);
        console.error("Error hint:", error.hint);

        // Check if table doesn't exist
        if (
          error.message?.includes("does not exist") ||
          error.code === "42P01"
        ) {
          toast.error(
            "Activity log table not set up. Please run the SQL setup script."
          );
          console.error(
            "🔴 TABLE DOES NOT EXIST - Run SETUP_EMPLOYEE_PROFILE_FEATURES.sql"
          );
        }

        throw error;
      }

      console.log("✅ Activity logs fetched successfully");
      console.log("Records found:", data?.length || 0);
      if (data && data.length > 0) {
        console.log("Sample log:", data[0]);
      }
      setActivityLogs((data as any) || []);
    } catch (error: any) {
      console.error("❌ Failed to fetch activity logs:", error);
      setActivityLogs([]);
    }
  };

  // Helper function to log activity
  const logActivity = async (
    action: string,
    actionType: string,
    details?: string,
    metadata?: Record<string, any>
  ) => {
    if (!companyId || !user || !id) {
      console.warn("⚠️ Cannot log activity - missing required data:");
      console.warn("  - Company ID:", companyId);
      console.warn("  - User:", user ? "✓" : "✗");
      console.warn("  - Employee ID:", id);
      return false;
    }

    try {
      console.log("=== Logging Activity ===");
      console.log("Action:", action);
      console.log("Type:", actionType);
      console.log("Details:", details);
      console.log("Employee ID:", id);
      console.log("Company ID:", companyId);
      console.log("User:", user.email);

      const { data, error } = await supabase
        .from("employee_activity_logs")
        .insert({
          employee_id: id,
          company_id: companyId,
          action,
          action_type: actionType,
          details: details || null,
          changed_by: user.id,
          changed_by_name: user.email || "Unknown User",
          metadata: metadata || null,
        })
        .select();

      if (error) {
        console.error("❌ Error logging activity:", error);
        console.error("Error code:", error.code);
        console.error("Error message:", error.message);

        // Check if table doesn't exist
        if (
          error.message?.includes("does not exist") ||
          error.code === "42P01"
        ) {
          console.error("🔴 TABLE DOES NOT EXIST");
          console.error("👉 Run this SQL in Supabase: RUN_THIS_NOW.sql");
          toast.error("Activity log not set up. Check console for SQL script.");
        } else if (error.code === "42501") {
          console.error("🔴 PERMISSION DENIED - RLS policy issue");
          toast.error("Permission denied. Check RLS policies.");
        }

        return false;
      } else {
        console.log("✅ Activity logged successfully!");
        console.log("Log data:", data);
        // Refresh activity logs after logging
        setTimeout(() => {
          console.log("🔄 Refreshing activity logs...");
          fetchActivityLogs();
        }, 500);
        return true;
      }
    } catch (error: any) {
      console.error("❌ Exception while logging activity:", error);
      toast.error("Failed to log activity: " + error.message);
      return false;
    }
  };

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("assigned_to", id)
        .order("due_date", { ascending: true });

      if (error) throw error;
      setTasks((data as any) || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  const fetchEmployees = async () => {
    if (!companyId) return;
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("id, full_name, employee_number")
        .eq("company_id", companyId)
        .eq("is_active", true);

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const fetchGInvestigations = async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from("g_investigations")
        .select("*")
        .eq("company_id", companyId)
        .order("name");

      if (error) {
        console.log("G-Investigations table not created yet");
        setGInvestigations([]);
        return;
      }
      setGInvestigations(data || []);
    } catch (error) {
      console.error("Error fetching G-Investigations:", error);
      setGInvestigations([]);
    }
  };

  const fetchProfileFields = async () => {
    if (!id) return;

    try {
      const { data: empData, error } = await supabase
        .from("employees")
        .select("profile_fields")
        .eq("id", id)
        .single();

      if (error) {
        console.log("No profile fields found");
        setProfileFields([]);
        return;
      }

      setProfileFields(empData?.profile_fields || []);
    } catch (error) {
      console.error("Error fetching profile fields:", error);
      setProfileFields([]);
    }
  };

  const handleAddProfileField = async (fieldType: string) => {
    const fieldName = `${fieldType
      .replace(/\s+/g, "_")
      .toLowerCase()}_${Date.now()}`;
    const newField = {
      id: fieldName,
      label: `New ${fieldType}`,
      type: fieldType,
      value: fieldType === "Yes/No" ? false : "",
      created_at: new Date().toISOString(),
    };

    try {
      const updatedFields = [...profileFields, newField];

      const { error } = await supabase
        .from("employees")
        .update({ profile_fields: updatedFields })
        .eq("id", id);

      if (error) throw error;

      setProfileFields(updatedFields);
      setShowProfileFieldMenu(false);
      toast.success("Profile field added");

      await logActivity(
        `Added profile field: ${newField.label}`,
        "create",
        `Added custom field of type ${fieldType}`,
        { field: newField }
      );
      await fetchActivityLogs();
    } catch (error) {
      console.error("Error adding profile field:", error);
      toast.error("Failed to add profile field");
    }
  };

  const handleUpdateProfileField = async (fieldId: string, updates: any) => {
    try {
      const updatedFields = profileFields.map((f) =>
        f.id === fieldId ? { ...f, ...updates } : f
      );

      const { error } = await supabase
        .from("employees")
        .update({ profile_fields: updatedFields })
        .eq("id", id);

      if (error) throw error;

      const field = profileFields.find((f) => f.id === fieldId);
      setProfileFields(updatedFields);
      toast.success("Field updated");

      await logActivity(
        `Updated profile field: ${field?.label || fieldId}`,
        "update",
        `Changed ${field?.label} value`,
        { fieldId, updates }
      );
      await fetchActivityLogs();
    } catch (error) {
      console.error("Error updating profile field:", error);
      toast.error("Failed to update field");
    }
  };

  const handleDeleteProfileField = async (fieldId: string) => {
    try {
      const field = profileFields.find((f) => f.id === fieldId);
      const updatedFields = profileFields.filter((f) => f.id !== fieldId);

      const { error } = await supabase
        .from("employees")
        .update({ profile_fields: updatedFields })
        .eq("id", id);

      if (error) throw error;

      setProfileFields(updatedFields);
      toast.success("Field deleted");

      await logActivity(
        `Deleted profile field: ${field?.label || fieldId}`,
        "delete",
        `Removed custom field`,
        { field }
      );
      await fetchActivityLogs();
    } catch (error) {
      console.error("Error deleting profile field:", error);
      toast.error("Failed to delete field");
    }
  };

  const handleFieldEdit = (field: string) => {
    setEditMode({ ...editMode, [field]: true });
  };

  const handleFieldSave = async (field: string) => {
    try {
      let updateData: any = {};

      // Handle name fields - combine into full_name
      if (field === "first_name" || field === "last_name") {
        const newFullName = `${
          field === "first_name"
            ? firstName
            : employee?.full_name.split(" ")[0] || ""
        } ${
          field === "last_name"
            ? lastName
            : employee?.full_name.split(" ").slice(1).join(" ") || ""
        }`;
        updateData.full_name = newFullName.trim();
      } else {
        updateData[field] = formData[field as keyof EmployeeData];
      }

      const { error } = await (supabase as any)
        .from("employees")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;

      await logActivity(
        `Updated ${field}`,
        "update",
        `Changed ${field} from "${
          employee?.[field as keyof EmployeeData] || "empty"
        }" to "${updateData[field]}"`,
        {
          field,
          oldValue: employee?.[field as keyof EmployeeData],
          newValue: updateData[field],
        }
      );

      toast.success("Updated successfully");
      setEditMode({ ...editMode, [field]: false });
      fetchEmployeeData();
      fetchDropdownData();
      fetchActivityLogs();
    } catch (error) {
      console.error("Error updating field:", error);
      toast.error("Failed to update");
    }
  };

  const handleFieldCancel = (field: string) => {
    setEditMode({ ...editMode, [field]: false });
    setFormData({
      ...formData,
      [field]: employee?.[field as keyof EmployeeData],
    });
  };

  const handleSpecialFieldSave = async (
    field: "languages" | "skills" | "salary"
  ) => {
    try {
      let value = "";
      if (field === "languages") value = languages;
      else if (field === "skills") value = skills;
      else if (field === "salary") value = salary;

      const { error } = await supabase
        .from("employees")
        .update({ [field]: value })
        .eq("id", id);

      if (error) throw error;

      await logActivity(
        `Updated ${field}`,
        "update",
        `Changed ${field} value`,
        { field, newValue: value }
      );

      toast.success("Updated successfully");
      setEditingSpecialField(null);
      fetchEmployeeData();
      fetchActivityLogs();
    } catch (error) {
      console.error("Error updating field:", error);
      toast.error("Failed to update");
    }
  };

  const handleSpecialFieldCancel = (
    field: "languages" | "skills" | "salary"
  ) => {
    if (field === "languages") setLanguages(employee?.languages || "");
    else if (field === "skills") setSkills(employee?.skills || "");
    else if (field === "salary") setSalary(employee?.salary || "");
    setEditingSpecialField(null);
  };

  const handleSaveNotes = async () => {
    if (!notes.trim()) return;

    try {
      // Get existing notes
      let existingNotes: any[] = [];
      try {
        if (
          employee?.notes &&
          (employee.notes.startsWith("[") || employee.notes.startsWith("{"))
        ) {
          existingNotes = JSON.parse(employee.notes);
          if (!Array.isArray(existingNotes)) existingNotes = [];
        }
      } catch (e) {
        // If parsing fails, treat as empty
      }

      const newNoteObj = {
        id: Date.now().toString(),
        content: notes,
        author: "Current User", // TODO: Get actual user name
        date: new Date().toISOString(),
        replies: [],
      };

      const updatedNotes = [...existingNotes, newNoteObj];
      const updatedNotesString = JSON.stringify(updatedNotes);

      const { error } = await (supabase as any)
        .from("employees")
        .update({ notes: updatedNotesString })
        .eq("id", id);

      if (error) throw error;

      await logActivity(
        "Added note",
        "create",
        notes.substring(0, 100) + (notes.length > 100 ? "..." : "")
      );

      toast.success("Note added successfully");
      setNotes("");
      setShowNotesMentionDropdown(false);
      fetchEmployeeData();
    } catch (error) {
      console.error("Error saving notes:", error);
      toast.error("Failed to save note");
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      let existingNotes: any[] = [];

      // Parse existing notes
      if (
        employee?.notes &&
        (employee.notes.startsWith("[") || employee.notes.startsWith("{"))
      ) {
        try {
          existingNotes = JSON.parse(employee.notes);
          if (!Array.isArray(existingNotes)) existingNotes = [];
        } catch (e) {
          console.error("Error parsing notes:", e);
          toast.error("Error parsing notes data");
          return;
        }
      }

      // Find and filter the note
      const noteToDelete = existingNotes.find((note) => note.id === noteId);

      if (!noteToDelete) {
        toast.error("Note not found");
        return;
      }

      const updatedNotes = existingNotes.filter((note) => note.id !== noteId);
      const updatedNotesString = JSON.stringify(updatedNotes);

      // Update in database
      const { error } = await supabase
        .from("employees")
        .update({ notes: updatedNotesString })
        .eq("id", id);

      if (error) throw error;

      // Log activity with correct property (content instead of text)
      const noteContent = noteToDelete.content || noteToDelete.text || "";
      await logActivity(
        "Deleted note",
        "delete",
        noteContent.substring(0, 100) + (noteContent.length > 100 ? "..." : "")
      );

      toast.success("Note deleted successfully");
      fetchEmployeeData();
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("Failed to delete note");
    }
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setNotes(value);
    setCursorPosition(cursorPos);

    // Check for @ mention
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      // Check if there's no space after @
      if (!textAfterAt.includes(" ") && textAfterAt.length >= 0) {
        setNotesMentionSearch(textAfterAt);
        setShowNotesMentionDropdown(true);
      } else {
        setShowNotesMentionDropdown(false);
      }
    } else {
      setShowNotesMentionDropdown(false);
    }
  };

  const handleMentionSelect = (employeeName: string) => {
    const textBeforeCursor = notes.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");
    const textBeforeAt = notes.substring(0, lastAtIndex);
    const textAfterCursor = notes.substring(cursorPosition);

    const newText = `${textBeforeAt}@${employeeName} ${textAfterCursor}`;
    setNotes(newText);
    setShowNotesMentionDropdown(false);
  };

  // Separate filtered employee lists for Tasks and Notes
  const filteredTaskEmployees = employees.filter((emp) =>
    emp.full_name.toLowerCase().includes(taskMentionSearch.toLowerCase())
  );

  const filteredNotesEmployees = employees.filter((emp) =>
    emp.full_name.toLowerCase().includes(notesMentionSearch.toLowerCase())
  );

  const handleAddTag = async () => {
    if (!newTag.trim()) return;

    const updatedTags = [...tags, newTag.trim()];

    try {
      const { error } = await (supabase as any)
        .from("employees")
        .update({ tags: updatedTags })
        .eq("id", id);

      if (error) throw error;

      await logActivity("Added tag", "update", `Added tag: ${newTag}`, {
        tag: newTag,
      });

      setTags(updatedTags);
      setNewTag("");
      toast.success("Tag added");
      fetchEmployeeData();
    } catch (error) {
      console.error("Error adding tag:", error);
      toast.error("Failed to add tag");
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    const updatedTags = tags.filter((tag) => tag !== tagToRemove);

    try {
      const { error } = await (supabase as any)
        .from("employees")
        .update({ tags: updatedTags })
        .eq("id", id);

      if (error) throw error;

      await logActivity(
        "Removed tag",
        "update",
        `Removed tag: ${tagToRemove}`,
        {
          tag: tagToRemove,
        }
      );

      setTags(updatedTags);
      toast.success("Tag removed");
      fetchEmployeeData();
    } catch (error) {
      console.error("Error removing tag:", error);
      toast.error("Failed to remove tag");
    }
  };

  // Document preview and rename functions
  const handlePreviewDocument = async (doc: any) => {
    try {
      const { data, error } = await supabase.storage
        .from("documents")
        .download(doc.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      setPreviewUrl(url);
      setPreviewDocument(doc);
      setShowPreviewDialog(true);
    } catch (error: any) {
      console.error("Error loading preview:", error);
      toast.error("Failed to load document preview");
    }
  };

  const handleClosePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
    }
    setShowPreviewDialog(false);
    setPreviewDocument(null);
  };

  const handleStartRename = (doc: any) => {
    setEditingDocumentId(doc.id);
    setEditingDocumentTitle(doc.title);
  };

  const handleSaveRename = async (docId: string) => {
    if (!editingDocumentTitle.trim()) {
      toast.error("Document title cannot be empty");
      return;
    }

    try {
      const oldDocument = documents.find((d) => d.id === docId);

      const { error } = await (supabase as any)
        .from("documents")
        .update({ title: editingDocumentTitle })
        .eq("id", docId);

      if (error) throw error;

      await logActivity(
        "Renamed document",
        "update",
        `Renamed document from "${oldDocument?.title}" to "${editingDocumentTitle}"`,
        {
          documentId: docId,
          oldTitle: oldDocument?.title,
          newTitle: editingDocumentTitle,
        }
      );

      toast.success("Document renamed successfully");
      setEditingDocumentId(null);
      setEditingDocumentTitle("");
      fetchDocuments();
    } catch (error) {
      console.error("Error renaming document:", error);
      toast.error("Failed to rename document");
    }
  };

  const handleCancelRename = () => {
    setEditingDocumentId(null);
    setEditingDocumentTitle("");
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split(".").pop()?.toLowerCase();

    switch (ext) {
      case "pdf":
        return <FileText className="w-8 h-8 text-red-500" />;
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
      case "webp":
        return <FileImage className="w-8 h-8 text-blue-500" />;
      case "xls":
      case "xlsx":
      case "csv":
        return <FileSpreadsheet className="w-8 h-8 text-green-500" />;
      case "doc":
      case "docx":
        return <FileText className="w-8 h-8 text-blue-600" />;
      case "txt":
      case "md":
        return <FileCode className="w-8 h-8 text-gray-500" />;
      default:
        return <File className="w-8 h-8 text-muted-foreground" />;
    }
  };

  const handleToggleActive = async (isActive: boolean) => {
    try {
      const { error } = await (supabase as any)
        .from("employees")
        .update({ is_active: isActive })
        .eq("id", id);

      if (error) throw error;

      await logActivity(
        `${isActive ? "Activated" : "Deactivated"} employee`,
        "status_change",
        `Employee status changed to ${isActive ? "Active" : "Inactive"}`,
        { status: isActive ? "active" : "inactive" }
      );

      toast.success(`Employee ${isActive ? "activated" : "deactivated"}`);
      fetchEmployeeData();
      fetchActivityLogs();
    } catch (error) {
      console.error("Error toggling active status:", error);
      toast.error("Failed to update status");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      await uploadFile(file);
    }
  };

  const uploadFile = async (file: File) => {
    if (!file || !companyId || !user) return;

    try {
      // Generate unique file path
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(7)}.${fileExt}`;
      const filePath = `${companyId}/other/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Save document record
      const { error: dbError } = await supabase.from("documents").insert({
        company_id: companyId,
        title: file.name.replace(/\.[^/.]+$/, ""),
        description: `Document for employee ${employee?.full_name || ""} (${
          employee?.employee_number || ""
        })`,
        category: "other",
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        is_public: false,
        uploaded_by: user.id,
        tags: [id, employee?.employee_number || ""].filter(Boolean),
      } as any);

      if (dbError) throw dbError;

      await logActivity(
        "Uploaded document",
        "upload",
        `Uploaded file: ${file.name}`,
        { fileName: file.name, fileSize: file.size, mimeType: file.type }
      );

      toast.success("Document uploaded successfully");
      fetchDocuments();
    } catch (error: any) {
      console.error("Error uploading document:", error);
      toast.error(error.message || "Failed to upload document");
    }
  };

  const handleDocumentUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      await uploadFile(file);
      // Reset file input
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return;

    try {
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          title: newTaskTitle,
          assigned_to: id,
          company_id: companyId,
          status: "pending",
          priority: newTaskPriority,
          due_date: newTaskDueDate
            ? newTaskDueDate.toISOString().split("T")[0]
            : null,
        } as any)
        .select()
        .single();

      if (error) throw error;

      await logActivity(
        "Created task",
        "create",
        `Task created: ${newTaskTitle}`,
        { taskId: data.id, taskTitle: newTaskTitle }
      );

      setTasks([data, ...tasks]);
      setNewTaskTitle("");
      setNewTaskDueDate(undefined);
      setNewTaskPriority("medium");
      toast.success("Task created");
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error("Failed to create task");
    }
  };

  const handleToggleTaskStatus = async (task: any) => {
    const newStatus = task.status === "completed" ? "pending" : "completed";
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: newStatus })
        .eq("id", task.id);

      if (error) throw error;

      await logActivity(
        "Updated task status",
        "update",
        `Task "${task.title}" marked as ${newStatus}`,
        {
          taskId: task.id,
          taskTitle: task.title,
          oldStatus: task.status,
          newStatus,
        }
      );

      setTasks(
        tasks.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
      );
      toast.success(`Task marked as ${newStatus}`);
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
    }
  };

  const handleCreateCheckup = async () => {
    if (
      !checkupFormData.investigation_id ||
      !checkupFormData.appointment_date
    ) {
      toast.error("Please select investigation and appointment date");
      return;
    }

    try {
      const checkupData: any = {
        employee_id: id,
        company_id: companyId,
        investigation_name: checkupFormData.investigation_id, // Store G-code directly
        appointment_date: checkupFormData.appointment_date,
        status: checkupFormData.status,
        notes: checkupFormData.notes,
      };

      if (checkupFormData.completion_date) {
        checkupData.completion_date = checkupFormData.completion_date;
      }

      if (checkupFormData.certificate_url) {
        checkupData.certificate_url = checkupFormData.certificate_url;
      }

      const { data, error } = await supabase
        .from("health_checkups")
        .insert(checkupData)
        .select()
        .single();

      if (error) throw error;

      // If status is "done" and completion date is provided, schedule next checkup
      if (
        checkupFormData.status === "done" &&
        checkupFormData.completion_date
      ) {
        const completionDate = new Date(checkupFormData.completion_date);
        const nextCheckupDate = new Date(completionDate);
        nextCheckupDate.setFullYear(nextCheckupDate.getFullYear() + 3);

        await supabase.from("health_checkups").insert({
          employee_id: id,
          company_id: companyId,
          investigation_name: checkupFormData.investigation_id, // Store G-code directly
          appointment_date: nextCheckupDate.toISOString().split("T")[0],
          status: "open",
          notes: "Auto-scheduled 3 years after previous checkup",
        });

        toast.success("Check-up created and next checkup scheduled in 3 years");
      } else {
        toast.success("Check-up created successfully");
      }

      setIsCheckupDialogOpen(false);
      setCheckupFormData({
        investigation_id: "",
        appointment_date: "",
        status: "open",
        completion_date: "",
        certificate_url: "",
        notes: "",
      });

      await logActivity(
        "Created health check-up",
        "create",
        `Scheduled check-up: ${checkupFormData.investigation_id} on ${checkupFormData.appointment_date}`,
        {
          investigationId: checkupFormData.investigation_id,
          appointmentDate: checkupFormData.appointment_date,
          status: checkupFormData.status,
        }
      );

      fetchHealthCheckups();
    } catch (error) {
      console.error("Error creating checkup:", error);
      toast.error("Failed to create checkup");
    }
  };

  const handleUpdateCheckup = async (checkupId: string, updates: any) => {
    try {
      // If updating to "done" status with completion date, schedule next checkup
      if (updates.status === "done" && updates.completion_date) {
        const completionDate = new Date(updates.completion_date);
        const nextCheckupDate = new Date(completionDate);
        nextCheckupDate.setFullYear(nextCheckupDate.getFullYear() + 3);

        const checkup = healthCheckups.find((c) => c.id === checkupId);

        await supabase.from("health_checkups").insert({
          employee_id: id,
          company_id: companyId,
          investigation_name:
            checkup?.investigation_name || checkup?.investigation_id,
          appointment_date: nextCheckupDate.toISOString().split("T")[0],
          status: "open",
          notes: "Auto-scheduled 3 years after previous checkup",
        });
      }

      const { error } = await supabase
        .from("health_checkups")
        .update(updates)
        .eq("id", checkupId);

      if (error) throw error;

      await logActivity(
        "Updated health check-up",
        "update",
        `Updated check-up status to ${updates.status}${
          updates.completion_date ? " and marked as completed" : ""
        }`,
        { checkupId, updates }
      );

      toast.success("Check-up updated successfully");
      fetchHealthCheckups();
    } catch (error) {
      console.error("Error updating checkup:", error);
      toast.error("Failed to update checkup");
    }
  };

  const handleDeleteCheckup = async (checkupId: string) => {
    if (!confirm("Are you sure you want to delete this check-up?")) return;

    try {
      const { error } = await supabase
        .from("health_checkups")
        .delete()
        .eq("id", checkupId);

      if (error) throw error;

      await logActivity(
        "Deleted health check-up",
        "delete",
        `Deleted check-up appointment`,
        { checkupId }
      );

      toast.success("Check-up deleted successfully");
      fetchHealthCheckups();
    } catch (error) {
      console.error("Error deleting checkup:", error);
      toast.error("Failed to delete checkup");
    }
  };

  const handleCertificateUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    checkupId: string
  ) => {
    const file = event.target.files?.[0];
    if (!file || !companyId) return;

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-cert-${checkupId}.${fileExt}`;
      const filePath = `${companyId}/certificate/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("documents").getPublicUrl(filePath);

      await handleUpdateCheckup(checkupId, { certificate_url: publicUrl });

      toast.success("Certificate uploaded successfully");
    } catch (error: any) {
      console.error("Error uploading certificate:", error);
      toast.error(error.message || "Failed to upload certificate");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <p>Employee not found</p>
            <Button onClick={() => navigate("/employees")} className="mt-4">
              Back to Employees
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderEditableField = (
    field: string,
    label: string,
    value: any,
    type: "text" | "select" | "date" = "text",
    options?: any[]
  ) => {
    const isEditing = editMode[field];

    // Get the actual value for first/last name
    const displayValue =
      field === "first_name"
        ? firstName
        : field === "last_name"
        ? lastName
        : value;
    const inputValue =
      field === "first_name"
        ? firstName
        : field === "last_name"
        ? lastName
        : (formData[field as keyof EmployeeData] as string) || "";

    return (
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">{label}</Label>

        {!isEditing ? (
          <div
            onClick={() => handleFieldEdit(field)}
            className="font-medium cursor-pointer hover:bg-muted/50 p-2 rounded border border-transparent hover:border-muted-foreground/20 transition-colors"
          >
            {displayValue || "-"}
          </div>
        ) : type === "select" && options ? (
          <div className="space-y-2">
            <Combobox
              options={options.map((opt) => ({
                value: opt.id || opt,
                label: opt.name || opt.title || opt.full_name || opt,
              }))}
              value={formData[field as keyof EmployeeData] as string}
              onValueChange={async (val) => {
                setFormData({ ...formData, [field]: val });
                try {
                  const { error } = await (supabase as any)
                    .from("employees")
                    .update({ [field]: val })
                    .eq("id", id);
                  if (error) throw error;
                  toast.success("Updated successfully");
                  setEditMode({ ...editMode, [field]: false });
                  fetchEmployeeData();
                } catch (e) {
                  console.error(e);
                  toast.error("Failed to update");
                }
              }}
              placeholder={`Select ${label}`}
              searchPlaceholder="Search or type to create..."
              emptyText={`No ${label.toLowerCase()} found.`}
              allowCustom={field === "department_id" || field === "job_role_id"}
              onCreateCustom={async (newValue) => {
                if (!companyId) return;
                try {
                  let table = "";
                  let dataField = "";

                  if (field === "department_id") {
                    table = "departments";
                    dataField = "name";
                  } else if (field === "job_role_id") {
                    table = "job_roles";
                    dataField = "title";
                  }

                  if (table) {
                    const { data, error } = await (supabase as any)
                      .from(table)
                      .insert({ [dataField]: newValue, company_id: companyId })
                      .select()
                      .single();

                    if (error) throw error;

                    if (data) {
                      const { error: updateError } = await (supabase as any)
                        .from("employees")
                        .update({ [field]: data.id })
                        .eq("id", id);

                      if (updateError) throw updateError;

                      toast.success(
                        `${label} "${newValue}" created and assigned`
                      );
                      setEditMode({ ...editMode, [field]: false });
                      fetchEmployeeData();
                      fetchDropdownData();
                    }
                  }
                } catch (e) {
                  console.error(e);
                  toast.error(`Failed to create ${label}`);
                }
              }}
            />
          </div>
        ) : (
          <Input
            type={type}
            value={inputValue}
            onChange={(e) => {
              if (field === "first_name") {
                setFirstName(e.target.value);
              } else if (field === "last_name") {
                setLastName(e.target.value);
              } else {
                setFormData({ ...formData, [field]: e.target.value });
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleFieldSave(field);
              } else if (e.key === "Escape") {
                handleFieldCancel(field);
              }
            }}
            onBlur={() => handleFieldCancel(field)}
            autoFocus
          />
        )}
      </div>
    );
  };

  // Helper function to render note content with colored @mentions
  const renderNoteContent = (content: string) => {
    if (!content) return null;

    // Split content by @mentions
    const parts = content.split(/(@\w+(?:\s+\w+)*)/g);

    return parts.map((part, index) => {
      if (part.startsWith("@")) {
        // This is a mention - render with colored background
        return (
          <span key={index} className="bg-primary/20 text-primary px-1 rounded">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-[1400px]">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/employees")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("common.back")}
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{employee.full_name}</h1>
              <p className="text-muted-foreground">
                {t("employees.employeeNumber")} #{employee.employee_number}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="active-toggle" className="text-sm font-medium">
                {employee.is_active
                  ? t("employees.active")
                  : t("employees.inactive")}
              </Label>
              <Switch
                id="active-toggle"
                checked={employee.is_active}
                onCheckedChange={handleToggleActive}
              />
            </div>
            <Badge variant={employee.is_active ? "default" : "secondary"}>
              {employee.is_active
                ? t("employees.active")
                : t("employees.inactive")}
            </Badge>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="w-full justify-start h-auto p-1 bg-muted/50 overflow-x-auto flex-nowrap no-scrollbar">
            <TabsTrigger value="overview" className="px-4 py-2">
              Overview
            </TabsTrigger>
            <TabsTrigger value="checkups" className="px-4 py-2">
              Check-Ups
            </TabsTrigger>
            <TabsTrigger value="documents" className="px-4 py-2">
              Documents
            </TabsTrigger>
            <TabsTrigger value="activity" className="px-4 py-2">
              Activity
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Employee Details, Tags, Contact & Details */}
              <div className="lg:col-span-2 space-y-6">
                {/* 1. Employee Details & Records Card - FIRST */}
                <Card>
                  <CardHeader>
                    <CardTitle>Employee Details & Records</CardTitle>
                    <CardDescription>
                      Click on any field to edit. Press Enter to save.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {renderEditableField(
                        "employee_number",
                        t("employees.employeeNumber"),
                        employee.employee_number
                      )}
                      {renderEditableField(
                        "email",
                        t("employees.email"),
                        employee.email
                      )}
                      {renderEditableField(
                        "first_name",
                        t("employees.firstName"),
                        firstName
                      )}
                      {renderEditableField(
                        "last_name",
                        t("employees.lastName"),
                        lastName
                      )}
                      {renderEditableField(
                        "hire_date",
                        t("employees.hireDate"),
                        employee.hire_date,
                        "date"
                      )}
                      {renderEditableField(
                        "department_id",
                        t("employees.department"),
                        employee.departments?.name || "No Department",
                        "select",
                        departments
                      )}
                      {renderEditableField(
                        "job_role_id",
                        t("employees.jobRole"),
                        employee.job_roles?.title || "No Job Role",
                        "select",
                        jobRoles
                      )}
                      {renderEditableField(
                        "exposure_group_id",
                        "Exposure Group",
                        employee.exposure_groups?.name || "No Exposure Group",
                        "select",
                        exposureGroups
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 2. Tags Section - SECOND */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Tag className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">
                    Tags
                  </span>
                  {employee.tags && employee.tags.length > 0
                    ? employee.tags.map((tag, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="px-2 py-1 text-xs"
                        >
                          {tag}
                          <button
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-1.5 hover:text-destructive focus:outline-none"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))
                    : null}
                  <div className="flex gap-2 items-center">
                    <Input
                      placeholder="Add tag..."
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                      className="text-xs h-7 w-32"
                    />
                    <Button
                      onClick={handleAddTag}
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {/* 3. Contact Card - THIRD */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Contact</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                        <span className="text-muted-foreground">Email</span>
                        <span className="font-medium">{employee.email}</span>
                      </div>
                      <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                        <span className="text-muted-foreground">
                          Employee #
                        </span>
                        <span className="font-medium">
                          {employee.employee_number}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 3.5. Profile Fields - Languages, Skills, Salary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Profile Fields</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Languages */}
                      <div>
                        <Label className="text-sm font-medium mb-2 block">
                          Languages Known
                        </Label>
                        {editingSpecialField === "languages" ? (
                          <div className="space-y-2">
                            <Textarea
                              value={languages}
                              onChange={(e) => setLanguages(e.target.value)}
                              placeholder="Enter languages (e.g., English, German, Spanish)"
                              className="text-sm min-h-[80px]"
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() =>
                                  handleSpecialFieldSave("languages")
                                }
                              >
                                <Save className="w-3 h-3 mr-1" />
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleSpecialFieldCancel("languages")
                                }
                              >
                                <X className="w-3 h-3 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p
                            className="text-sm text-muted-foreground whitespace-pre-wrap cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors"
                            onClick={() => setEditingSpecialField("languages")}
                          >
                            {languages || "No languages specified"}
                          </p>
                        )}
                      </div>

                      {/* Skills */}
                      <div>
                        <Label className="text-sm font-medium mb-2 block">
                          Skills
                        </Label>
                        {editingSpecialField === "skills" ? (
                          <div className="space-y-2">
                            <Textarea
                              value={skills}
                              onChange={(e) => setSkills(e.target.value)}
                              placeholder="Enter skills (e.g., Project Management, Safety Training)"
                              className="text-sm min-h-[80px]"
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleSpecialFieldSave("skills")}
                              >
                                <Save className="w-3 h-3 mr-1" />
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleSpecialFieldCancel("skills")
                                }
                              >
                                <X className="w-3 h-3 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p
                            className="text-sm text-muted-foreground whitespace-pre-wrap cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors"
                            onClick={() => setEditingSpecialField("skills")}
                          >
                            {skills || "No skills specified"}
                          </p>
                        )}
                      </div>

                      {/* Salary */}
                      <div>
                        <Label className="text-sm font-medium mb-2 block">
                          Salary
                        </Label>
                        {editingSpecialField === "salary" ? (
                          <div className="space-y-2">
                            <Input
                              type="text"
                              value={salary}
                              onChange={(e) => setSalary(e.target.value)}
                              placeholder="Enter salary (e.g., €50,000 per year)"
                              className="text-sm"
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleSpecialFieldSave("salary")}
                              >
                                <Save className="w-3 h-3 mr-1" />
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleSpecialFieldCancel("salary")
                                }
                              >
                                <X className="w-3 h-3 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p
                            className="text-sm text-muted-foreground cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors"
                            onClick={() => setEditingSpecialField("salary")}
                          >
                            {salary || "No salary specified"}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 4. Profile Fields Table - FOURTH with Add profile field button */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="relative">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-8 text-muted-foreground"
                          onClick={() =>
                            setShowProfileFieldMenu(!showProfileFieldMenu)
                          }
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add profile field
                          <ChevronDown className="w-3 h-3 ml-1" />
                        </Button>

                        {showProfileFieldMenu && (
                          <Card className="absolute top-full left-0 mt-1 w-48 z-50 shadow-lg">
                            <CardContent className="p-2">
                              <div className="space-y-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-start text-xs"
                                  onClick={() =>
                                    handleAddProfileField("Single-line text")
                                  }
                                >
                                  <FileText className="w-3 h-3 mr-2" />
                                  Single-line text
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-start text-xs"
                                  onClick={() =>
                                    handleAddProfileField("Multi-line text")
                                  }
                                >
                                  <List className="w-3 h-3 mr-2" />
                                  Multi-line text
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-start text-xs"
                                  onClick={() =>
                                    handleAddProfileField("Yes/No")
                                  }
                                >
                                  <CheckCircle className="w-3 h-3 mr-2" />
                                  Yes / No
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-start text-xs"
                                  onClick={() => handleAddProfileField("Date")}
                                >
                                  <CalendarIcon className="w-3 h-3 mr-2" />
                                  Date
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-start text-xs"
                                  onClick={() =>
                                    handleAddProfileField("Number")
                                  }
                                >
                                  <Hash className="w-3 h-3 mr-2" />
                                  Number
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {profileFields.length > 0 ? (
                      <>
                        <div className="border rounded-lg">
                          <Table>
                            <TableBody>
                              {profileFields
                                .slice(0, showAllProfileFields ? undefined : 3)
                                .map((field) => (
                                  <TableRow key={field.id}>
                                    <TableCell className="font-medium w-[180px]">
                                      <Input
                                        value={field.label}
                                        onChange={(e) =>
                                          handleUpdateProfileField(field.id, {
                                            label: e.target.value,
                                          })
                                        }
                                        className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0 text-sm"
                                      />
                                    </TableCell>
                                    <TableCell>
                                      {field.type === "Yes/No" ? (
                                        <Switch
                                          checked={field.value}
                                          onCheckedChange={(checked) =>
                                            handleUpdateProfileField(field.id, {
                                              value: checked,
                                            })
                                          }
                                        />
                                      ) : field.type === "Date" ? (
                                        <Input
                                          type="date"
                                          value={field.value || ""}
                                          onChange={(e) =>
                                            handleUpdateProfileField(field.id, {
                                              value: e.target.value,
                                            })
                                          }
                                          className="text-sm"
                                        />
                                      ) : field.type === "Number" ? (
                                        <Input
                                          type="number"
                                          value={field.value || ""}
                                          onChange={(e) =>
                                            handleUpdateProfileField(field.id, {
                                              value: e.target.value,
                                            })
                                          }
                                          className="text-sm"
                                        />
                                      ) : field.type === "Multi-line text" ? (
                                        <Textarea
                                          value={field.value || ""}
                                          onChange={(e) =>
                                            handleUpdateProfileField(field.id, {
                                              value: e.target.value,
                                            })
                                          }
                                          className="text-sm min-h-[60px]"
                                        />
                                      ) : (
                                        <Input
                                          value={field.value || ""}
                                          onChange={(e) =>
                                            handleUpdateProfileField(field.id, {
                                              value: e.target.value,
                                            })
                                          }
                                          className="text-sm"
                                        />
                                      )}
                                    </TableCell>
                                    <TableCell className="w-[50px]">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() =>
                                          handleDeleteProfileField(field.id)
                                        }
                                      >
                                        <Trash2 className="w-4 h-4 text-destructive" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                        </div>

                        {profileFields.length > 3 && (
                          <div className="mt-3 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs"
                              onClick={() =>
                                setShowAllProfileFields(!showAllProfileFields)
                              }
                            >
                              {showAllProfileFields
                                ? "Show less"
                                : `Show more (${profileFields.length - 3})`}
                            </Button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        No custom fields yet. Click "Add profile field" to
                        create one.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Tasks & Notes */}
              <div className="lg:col-span-1 space-y-6">
                {/* Tasks Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <ClipboardList className="w-4 h-4" />
                      Tasks
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Task Input with Due Date and Priority */}
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input
                              placeholder="Add a task..."
                              value={newTaskTitle}
                              onChange={(e) => {
                                const value = e.target.value;
                                const cursorPos = e.target.selectionStart || 0;
                                setNewTaskTitle(value);

                                const textBeforeCursor = value.substring(
                                  0,
                                  cursorPos
                                );
                                const lastAtIndex =
                                  textBeforeCursor.lastIndexOf("@");

                                if (lastAtIndex !== -1) {
                                  const textAfterAt =
                                    textBeforeCursor.substring(lastAtIndex + 1);
                                  if (!textAfterAt.includes(" ")) {
                                    setTaskMentionSearch(textAfterAt);
                                    setShowTaskMentionDropdown(true);
                                  } else {
                                    setShowTaskMentionDropdown(false);
                                  }
                                } else {
                                  setShowTaskMentionDropdown(false);
                                }
                              }}
                              onKeyDown={(e) =>
                                e.key === "Enter" && handleCreateTask()
                              }
                              className="text-sm"
                            />
                            {showTaskMentionDropdown &&
                              filteredTaskEmployees.length > 0 && (
                                <Card className="absolute top-full mt-1 w-full max-h-48 overflow-y-auto z-50 shadow-lg">
                                  <CardContent className="p-2">
                                    {filteredTaskEmployees.map((emp) => (
                                      <div
                                        key={emp.id}
                                        className="px-3 py-2 hover:bg-muted rounded cursor-pointer"
                                        onClick={() => {
                                          const cursorPos = newTaskTitle.length;
                                          const textBeforeCursor =
                                            newTaskTitle.substring(
                                              0,
                                              cursorPos
                                            );
                                          const lastAtIndex =
                                            textBeforeCursor.lastIndexOf("@");
                                          const textBeforeAt =
                                            newTaskTitle.substring(
                                              0,
                                              lastAtIndex
                                            );
                                          const textAfterCursor =
                                            newTaskTitle.substring(cursorPos);
                                          setNewTaskTitle(
                                            `${textBeforeAt}@${emp.full_name} ${textAfterCursor}`
                                          );
                                          setShowTaskMentionDropdown(false);
                                        }}
                                      >
                                        <div className="font-medium text-sm">
                                          {emp.full_name}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          #{emp.employee_number}
                                        </div>
                                      </div>
                                    ))}
                                  </CardContent>
                                </Card>
                              )}
                          </div>
                          <Button onClick={handleCreateTask} size="sm">
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>

                        {/* Due Date and Priority Buttons */}
                        <div className="flex gap-2">
                          {/* Set due date button */}
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-8"
                              >
                                <CalendarIcon className="w-3 h-3 mr-1" />
                                {newTaskDueDate
                                  ? format(newTaskDueDate, "MMM d")
                                  : "Set due date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0"
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                selected={newTaskDueDate}
                                onSelect={setNewTaskDueDate}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>

                          {/* Priority button */}
                          <Select
                            value={newTaskPriority}
                            onValueChange={(value: "low" | "medium" | "high") =>
                              setNewTaskPriority(value)
                            }
                          >
                            <SelectTrigger className="w-[80px] h-8 text-xs">
                              <SelectValue>
                                <span className="flex items-center gap-1">
                                  <span
                                    className={`w-2 h-2 rounded-full ${
                                      newTaskPriority === "high"
                                        ? "bg-red-500"
                                        : newTaskPriority === "medium"
                                        ? "bg-yellow-500"
                                        : "bg-green-500"
                                    }`}
                                  />
                                  PR
                                </span>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">
                                <span className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-green-500" />
                                  Low
                                </span>
                              </SelectItem>
                              <SelectItem value="medium">
                                <span className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-yellow-500" />
                                  Medium
                                </span>
                              </SelectItem>
                              <SelectItem value="high">
                                <span className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-red-500" />
                                  High
                                </span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Hide completed tasks toggle */}
                      {tasks.some((t) => t.status === "completed") && (
                        <div className="flex justify-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-muted-foreground"
                            onClick={() =>
                              setHideCompletedTasks(!hideCompletedTasks)
                            }
                          >
                            {hideCompletedTasks ? (
                              <>
                                <Eye className="w-3 h-3 mr-1" />
                                Show completed tasks (
                                {
                                  tasks.filter((t) => t.status === "completed")
                                    .length
                                }
                                )
                              </>
                            ) : (
                              <>
                                <Eye className="w-3 h-3 mr-1" />
                                Hide completed tasks
                              </>
                            )}
                          </Button>
                        </div>
                      )}

                      <ScrollArea className="h-[300px]">
                        <div className="space-y-2 pr-4">
                          {tasks.length === 0 ? (
                            <p className="text-center text-muted-foreground text-xs py-4">
                              No tasks assigned
                            </p>
                          ) : (
                            <>
                              {tasks
                                .filter(
                                  (task) =>
                                    !hideCompletedTasks ||
                                    task.status !== "completed"
                                )
                                .map((task) => (
                                  <div
                                    key={task.id}
                                    className="flex items-start gap-2 p-2 border rounded hover:bg-muted/50 text-sm"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={task.status === "completed"}
                                      onChange={() =>
                                        handleToggleTaskStatus(task)
                                      }
                                      className="w-3.5 h-3.5 rounded border-gray-300 mt-0.5"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <span
                                        className={
                                          task.status === "completed"
                                            ? "line-through text-muted-foreground text-xs"
                                            : "text-xs"
                                        }
                                      >
                                        {task.title}
                                      </span>
                                      <div className="flex flex-wrap items-center gap-1 mt-1">
                                        {task.due_date && (
                                          <Badge
                                            variant="outline"
                                            className="text-[10px] px-1 py-0"
                                          >
                                            {new Date(
                                              task.due_date
                                            ).toLocaleDateString()}
                                          </Badge>
                                        )}
                                        <Badge
                                          variant={
                                            task.priority === "high"
                                              ? "destructive"
                                              : task.priority === "medium"
                                              ? "default"
                                              : "secondary"
                                          }
                                          className="text-[10px] px-1 py-0"
                                        >
                                          {task.priority}
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                            </>
                          )}
                        </div>
                      </ScrollArea>

                      {/* Hide/Show completed tasks toggle */}
                      {tasks.filter((t) => t.status === "completed").length >
                        0 && (
                        <button
                          onClick={() =>
                            setHideCompletedTasks(!hideCompletedTasks)
                          }
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {hideCompletedTasks
                            ? `Show completed tasks (${
                                tasks.filter((t) => t.status === "completed")
                                  .length
                              })`
                            : "Hide completed tasks"}
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Notes Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <StickyNote className="w-4 h-4" />
                      Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Add Note Input with Formatting Toolbar */}
                      <div className="space-y-2">
                        <div className="border rounded-lg p-3 space-y-2">
                          {/* Formatting Toolbar */}
                          <div className="flex items-center gap-1 pb-2 border-b">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                            >
                              <Bold className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                            >
                              <Italic className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                            >
                              <Underline className="w-3.5 h-3.5" />
                            </Button>
                            <div className="w-px h-4 bg-border mx-1" />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                            >
                              <List className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                            >
                              <Link className="w-3.5 h-3.5" />
                            </Button>
                            <div className="w-px h-4 bg-border mx-1" />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                            >
                              <Paperclip className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                            >
                              <AtSign className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                            >
                              <Smile className="w-3.5 h-3.5" />
                            </Button>
                          </div>

                          {/* Textarea */}
                          <div className="relative">
                            <Textarea
                              placeholder="Add a note..."
                              value={notes}
                              onChange={handleNotesChange}
                              className="min-h-[60px] text-sm border-0 p-0 focus-visible:ring-0 resize-none"
                            />
                            {showNotesMentionDropdown &&
                              filteredNotesEmployees.length > 0 && (
                                <Card className="absolute bottom-full mb-1 w-full max-h-48 overflow-y-auto z-50 shadow-lg">
                                  <CardContent className="p-2">
                                    {filteredNotesEmployees.map((emp) => (
                                      <div
                                        key={emp.id}
                                        className="px-3 py-2 hover:bg-muted rounded cursor-pointer"
                                        onClick={() =>
                                          handleMentionSelect(emp.full_name)
                                        }
                                      >
                                        <div className="font-medium text-sm">
                                          {emp.full_name}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          #{emp.employee_number}
                                        </div>
                                      </div>
                                    ))}
                                  </CardContent>
                                </Card>
                              )}
                          </div>

                          {/* Visibility Dropdown */}
                          <div className="flex items-center gap-2 pt-2">
                            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              Visible to everyone
                            </span>
                            <ChevronDown className="w-3 h-3 text-muted-foreground" />
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleSaveNotes}
                            size="sm"
                            className="text-xs h-7"
                          >
                            Save
                          </Button>
                        </div>
                      </div>

                      {/* Notes List */}
                      <ScrollArea className="h-[300px]">
                        <div className="space-y-4 pr-4">
                          {(() => {
                            try {
                              const parsedNotes =
                                employee?.notes &&
                                (employee.notes.startsWith("[") ||
                                  employee.notes.startsWith("{"))
                                  ? JSON.parse(employee.notes)
                                  : null;

                              if (
                                Array.isArray(parsedNotes) &&
                                parsedNotes.length > 0
                              ) {
                                return parsedNotes.map((note: any) => (
                                  <div key={note.id} className="flex gap-3">
                                    {/* Avatar */}
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                      <span className="text-xs font-semibold text-primary">
                                        {note.author?.[0] || "U"}
                                      </span>
                                    </div>

                                    {/* Note Content */}
                                    <div className="flex-1 space-y-2">
                                      <div className="flex items-start justify-between">
                                        <div>
                                          <p className="font-semibold text-xs">
                                            {note.author || "Current User"}
                                          </p>
                                          <span className="text-[10px] text-muted-foreground">
                                            {note.date
                                              ? new Date(
                                                  note.date
                                                ).toLocaleString("en-US", {
                                                  month: "short",
                                                  day: "numeric",
                                                  hour: "2-digit",
                                                  minute: "2-digit",
                                                })
                                              : ""}
                                          </span>
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                          onClick={() =>
                                            handleDeleteNote(note.id)
                                          }
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>

                                      <p className="text-xs text-foreground/90 whitespace-pre-wrap">
                                        {renderNoteContent(note.content)}
                                      </p>

                                      {/* Action Buttons */}
                                      <div className="flex items-center gap-3">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                                        >
                                          <ThumbsUp className="w-3 h-3 mr-1" />
                                          Like
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                                        >
                                          <RefreshCw className="w-3 h-3 mr-1" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                                          onClick={() => {
                                            setReplyingToNoteId(note.id);
                                            setReplyText(`@${note.author} `);
                                          }}
                                        >
                                          <Reply className="w-3 h-3 mr-1" />
                                          Reply
                                        </Button>
                                      </div>

                                      {/* Reply Input - shown below the note when replying */}
                                      {replyingToNoteId === note.id && (
                                        <div className="mt-3 pl-4 border-l-2 border-primary/20">
                                          <div className="space-y-2">
                                            <Textarea
                                              placeholder="Write a reply..."
                                              value={replyText}
                                              onChange={(e) =>
                                                setReplyText(e.target.value)
                                              }
                                              className="min-h-[60px] text-sm"
                                            />
                                            <div className="flex justify-end gap-2">
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-xs h-7"
                                                onClick={() => {
                                                  setReplyingToNoteId(null);
                                                  setReplyText("");
                                                }}
                                              >
                                                Cancel
                                              </Button>
                                              <Button
                                                size="sm"
                                                className="text-xs h-7"
                                                onClick={() => {
                                                  // TODO: Implement reply save functionality
                                                  toast.success("Reply added");
                                                  setReplyingToNoteId(null);
                                                  setReplyText("");
                                                }}
                                              >
                                                Save
                                              </Button>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ));
                              }
                            } catch (e) {
                              console.error("Error parsing notes:", e);
                            }

                            return (
                              <p className="text-center text-muted-foreground text-xs py-4">
                                No notes added yet
                              </p>
                            );
                          })()}
                        </div>
                      </ScrollArea>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Check-Ups Tab */}
          <TabsContent value="checkups">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarCheck className="w-5 h-5" />
                      Health Check-Ups
                    </CardTitle>
                    <CardDescription>
                      Manage health examinations and G-Investigations
                    </CardDescription>
                  </div>
                  <Button onClick={() => setIsCheckupDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Check-Up
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {healthCheckups.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No check-ups scheduled
                  </p>
                ) : (
                  <div className="space-y-4">
                    {healthCheckups.map((checkup) => (
                      <Card key={checkup.id} className="p-4">
                        <div className="space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <p className="font-semibold">
                                  {checkup.investigation_name ||
                                    gInvestigations.find(
                                      (g) => g.id === checkup.investigation_id
                                    )?.name ||
                                    "Investigation"}
                                </p>
                                <Badge
                                  variant={
                                    checkup.status === "done"
                                      ? "default"
                                      : checkup.status === "open"
                                      ? "destructive"
                                      : "secondary"
                                  }
                                >
                                  {checkup.status.toUpperCase()}
                                </Badge>
                              </div>
                              <div className="text-sm space-y-1">
                                <p>
                                  <span className="text-muted-foreground">
                                    Appointment:
                                  </span>{" "}
                                  <span className="font-medium">
                                    {checkup.appointment_date
                                      ? new Date(
                                          checkup.appointment_date
                                        ).toLocaleDateString("en-US", {
                                          year: "numeric",
                                          month: "long",
                                          day: "numeric",
                                        })
                                      : "Not set"}
                                  </span>
                                </p>
                                {checkup.completion_date && (
                                  <p>
                                    <span className="text-muted-foreground">
                                      Completed:
                                    </span>{" "}
                                    <span className="font-medium">
                                      {new Date(
                                        checkup.completion_date
                                      ).toLocaleDateString("en-US", {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                      })}
                                    </span>
                                  </p>
                                )}
                                {checkup.notes && (
                                  <p className="text-muted-foreground">
                                    {checkup.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeleteCheckup(checkup.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <Select
                              value={checkup.status}
                              onValueChange={(value) =>
                                handleUpdateCheckup(checkup.id, {
                                  status: value,
                                })
                              }
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="planned">Planned</SelectItem>
                                <SelectItem value="open">Open</SelectItem>
                                <SelectItem value="done">Done</SelectItem>
                              </SelectContent>
                            </Select>

                            {checkup.status === "done" &&
                              !checkup.completion_date && (
                                <Input
                                  type="date"
                                  placeholder="Completion date"
                                  className="w-48"
                                  onChange={(e) =>
                                    handleUpdateCheckup(checkup.id, {
                                      completion_date: e.target.value,
                                    })
                                  }
                                />
                              )}

                            <div className="flex gap-2">
                              {checkup.certificate_url ? (
                                <Button variant="outline" size="sm" asChild>
                                  <a
                                    href={checkup.certificate_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <FileText className="w-4 h-4 mr-2" />
                                    View Certificate
                                  </a>
                                </Button>
                              ) : (
                                <Button variant="outline" size="sm" asChild>
                                  <label className="cursor-pointer">
                                    <Upload className="w-4 h-4 mr-2" />
                                    Upload Certificate
                                    <input
                                      type="file"
                                      className="hidden"
                                      accept=".pdf,.jpg,.jpeg,.png"
                                      onChange={(e) =>
                                        handleCertificateUpload(e, checkup.id)
                                      }
                                    />
                                  </label>
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Add Check-Up Dialog */}
            <Dialog
              open={isCheckupDialogOpen}
              onOpenChange={setIsCheckupDialogOpen}
            >
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Health Check-Up</DialogTitle>
                  <DialogDescription>
                    Schedule a new health examination
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>G-Investigation *</Label>
                    {gInvestigations.length === 0 ? (
                      <div className="space-y-2">
                        <Select disabled>
                          <SelectTrigger className="border-destructive">
                            <SelectValue placeholder="No investigations available" />
                          </SelectTrigger>
                        </Select>
                        <div className="text-xs text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
                          <p className="font-semibold mb-1">
                            Dropdown of Occupational Medical Care (Settings) is
                            missing.
                          </p>
                          <p className="text-muted-foreground">
                            <strong>Explanation:</strong> Company Set up all
                            G-Check Ups which they need for their company. Those
                            selected G-Check ups will be shown in the dropdown
                            list.
                          </p>
                          <p className="mt-2 text-muted-foreground">
                            Please go to{" "}
                            <strong>
                              Settings → Occupational Medical Care
                            </strong>{" "}
                            to configure G-Investigations for your company.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <Select
                        value={checkupFormData.investigation_id}
                        onValueChange={(value) =>
                          setCheckupFormData({
                            ...checkupFormData,
                            investigation_id: value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select investigation" />
                        </SelectTrigger>
                        <SelectContent>
                          {gInvestigations.map((inv) => (
                            <SelectItem key={inv.id} value={inv.id}>
                              {inv.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div>
                    <Label>Appointment Date *</Label>
                    <Input
                      type="date"
                      value={checkupFormData.appointment_date}
                      onChange={(e) =>
                        setCheckupFormData({
                          ...checkupFormData,
                          appointment_date: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label>Status</Label>
                    <Select
                      value={checkupFormData.status}
                      onValueChange={(value: any) =>
                        setCheckupFormData({
                          ...checkupFormData,
                          status: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planned">Planned</SelectItem>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {checkupFormData.status === "done" && (
                    <div>
                      <Label>Completion Date *</Label>
                      <Input
                        type="date"
                        value={checkupFormData.completion_date}
                        onChange={(e) =>
                          setCheckupFormData({
                            ...checkupFormData,
                            completion_date: e.target.value,
                          })
                        }
                      />
                    </div>
                  )}

                  <div>
                    <Label>Notes</Label>
                    <Textarea
                      value={checkupFormData.notes}
                      onChange={(e) =>
                        setCheckupFormData({
                          ...checkupFormData,
                          notes: e.target.value,
                        })
                      }
                      placeholder="Additional notes..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsCheckupDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreateCheckup}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Check-Up
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Documents
                </CardTitle>
                <CardDescription>Employee documents and files</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Drag and Drop Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragging
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-2">
                    Drag and drop files here
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    or click the button below to select files
                  </p>
                  <Button variant="outline" asChild>
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Document
                      <input
                        id="file-upload"
                        type="file"
                        className="hidden"
                        onChange={handleDocumentUpload}
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.txt,.csv"
                      />
                    </label>
                  </Button>
                </div>

                {/* Documents List */}
                {documents.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    No documents uploaded yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center gap-3 p-3 border rounded hover:bg-muted/50"
                      >
                        {/* File Type Icon */}
                        {getFileIcon(doc.file_name)}

                        {/* Document Info */}
                        <div className="flex-1">
                          {editingDocumentId === doc.id ? (
                            <div className="flex gap-2 items-center">
                              <Input
                                value={editingDocumentTitle}
                                onChange={(e) =>
                                  setEditingDocumentTitle(e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter")
                                    handleSaveRename(doc.id);
                                  if (e.key === "Escape") handleCancelRename();
                                }}
                                className="h-8"
                                autoFocus
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSaveRename(doc.id)}
                              >
                                <Save className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCancelRename}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <p className="font-medium">{doc.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {doc.file_name} • Uploaded{" "}
                                {new Date(doc.created_at).toLocaleDateString()}
                              </p>
                            </>
                          )}
                        </div>

                        {/* Action Buttons */}
                        {editingDocumentId !== doc.id && (
                          <>
                            {/* Preview Button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePreviewDocument(doc)}
                              title="Preview document"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>

                            {/* Rename Button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStartRename(doc)}
                              title="Rename document"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>

                            {/* Download Button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                try {
                                  const { data, error } = await supabase.storage
                                    .from("documents")
                                    .download(doc.file_path);

                                  if (error) throw error;

                                  const url = URL.createObjectURL(data);
                                  const a = document.createElement("a");
                                  a.href = url;
                                  a.download = doc.file_name;
                                  document.body.appendChild(a);
                                  a.click();
                                  document.body.removeChild(a);
                                  URL.revokeObjectURL(url);

                                  toast.success("Document downloaded");
                                } catch (error: any) {
                                  console.error("Error downloading:", error);
                                  toast.error("Failed to download document");
                                }
                              }}
                              title="Download document"
                            >
                              <Download className="w-4 h-4" />
                            </Button>

                            {/* Delete Button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={async () => {
                                if (!confirm(`Delete ${doc.title}?`)) return;

                                try {
                                  await supabase.storage
                                    .from("documents")
                                    .remove([doc.file_path]);

                                  await supabase
                                    .from("documents")
                                    .delete()
                                    .eq("id", doc.id);

                                  await logActivity(
                                    "Deleted document",
                                    "delete",
                                    `Deleted file: ${doc.file_name}`,
                                    {
                                      documentId: doc.id,
                                      fileName: doc.file_name,
                                    }
                                  );

                                  toast.success("Document deleted");
                                  fetchDocuments();
                                  fetchActivityLogs();
                                } catch (error: any) {
                                  console.error("Error deleting:", error);
                                  toast.error("Failed to delete document");
                                }
                              }}
                              title="Delete document"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Document Preview Dialog */}
            <Dialog
              open={showPreviewDialog}
              onOpenChange={setShowPreviewDialog}
            >
              <DialogContent className="max-w-4xl max-h-[90vh]">
                <DialogHeader>
                  <DialogTitle>{previewDocument?.title}</DialogTitle>
                  <DialogDescription>
                    {previewDocument?.file_name}
                  </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-auto">
                  {previewDocument &&
                    previewUrl &&
                    (() => {
                      const ext = previewDocument.file_name
                        .split(".")
                        .pop()
                        ?.toLowerCase();
                      const isImage = [
                        "jpg",
                        "jpeg",
                        "png",
                        "gif",
                        "webp",
                      ].includes(ext || "");
                      const isPDF = ext === "pdf";

                      if (isImage) {
                        // Preview images
                        return (
                          <div className="flex items-center justify-center p-4">
                            <img
                              src={previewUrl}
                              alt={previewDocument.title}
                              className="max-w-full h-auto rounded"
                            />
                          </div>
                        );
                      } else if (isPDF) {
                        // Preview PDFs
                        return (
                          <iframe
                            src={previewUrl}
                            className="w-full h-[600px] border rounded"
                            title={previewDocument.title}
                          />
                        );
                      } else {
                        // Other file types - show message and download button
                        return (
                          <div className="flex flex-col items-center justify-center p-8 text-center">
                            <FileText className="w-16 h-16 text-muted-foreground mb-4" />
                            <p className="text-lg font-medium mb-2">
                              Preview not available
                            </p>
                            <p className="text-sm text-muted-foreground mb-4">
                              This file type cannot be previewed in the browser.
                            </p>
                            <Button
                              onClick={() => {
                                const a = document.createElement("a");
                                a.href = previewUrl;
                                a.download = previewDocument.file_name;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                toast.success("Document downloaded");
                              }}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download File
                            </Button>
                          </div>
                        );
                      }
                    })()}
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={handleClosePreview}>
                    Close
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Activity Log
                </CardTitle>
                <CardDescription>
                  Complete history of all changes and actions for this employee
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activityLogs.length === 0 ? (
                  <div className="text-center py-12">
                    <Activity className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground font-medium mb-1">
                      No activities tracked yet
                    </p>
                    <p className="text-sm text-muted-foreground">
                      All actions related to this employee will appear here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activityLogs.map((log) => {
                      // Determine icon based on action type
                      const getActionIcon = () => {
                        const type = log.action_type?.toLowerCase();
                        if (type === "create") return "✨";
                        if (type === "update") return "✏️";
                        if (type === "delete") return "🗑️";
                        if (type === "upload") return "📤";
                        if (type === "status_change") return "🔄";
                        return "📝";
                      };

                      return (
                        <div
                          key={log.id}
                          className="flex gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            <span className="text-lg">{getActionIcon()}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{log.action}</p>
                            {log.details && (
                              <p className="text-sm text-muted-foreground mt-1 break-words">
                                {log.details}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              <span>
                                {new Date(log.changed_at).toLocaleDateString()}{" "}
                                at{" "}
                                {new Date(log.changed_at).toLocaleTimeString()}
                              </span>
                              <span>•</span>
                              <span className="truncate">
                                {log.changed_by_name || "Unknown User"}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tags Tab */}
          <TabsContent value="tags">
            <Card>
              <CardHeader>
                <CardTitle>Tags / Keywords</CardTitle>
                <CardDescription>Manage tags for this employee</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a new tag..."
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                    />
                    <Button onClick={handleAddTag}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {employee.tags && employee.tags.length > 0 ? (
                      employee.tags.map((tag, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="px-3 py-1 text-sm"
                        >
                          {tag}
                          <button
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-2 hover:text-destructive focus:outline-none"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        No tags added yet.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity / Stress Group Tab */}
          <TabsContent value="groups">
            <Card>
              <CardHeader>
                <CardTitle>Activity / Stress Group</CardTitle>
                <CardDescription>
                  Manage activity and stress groups
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Assigned Group</Label>
                      <div className="p-3 bg-muted rounded-md font-medium">
                        {employee.exposure_groups?.name || "No Group Assigned"}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    To change the group, please use the Overview tab.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
