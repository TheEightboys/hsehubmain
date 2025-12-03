import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  X,
  Building2,
  AlertTriangle,
  Clock,
  Shield,
  CheckSquare,
  Users,
  Settings as SettingsIcon,
  BookOpen,
  Bell,
  Stethoscope,
  Plug,
  MapPin,
  GitBranch,
  Target,
  Tag,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

const baseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

export default function Settings() {
  const { user, loading, companyId, userRole } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loadingData, setLoadingData] = useState(false);
  const [activeTab, setActiveTab] = useState("team");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteItem, setDeleteItem] = useState<any>(null);
  const [currentTableName, setCurrentTableName] = useState("");
  const [forceDialogOpen, setForceDialogOpen] = useState(false);

  // State for each master data type
  const [departments, setDepartments] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [jobRoles, setJobRoles] = useState<any[]>([]);
  const [exposureGroups, setExposureGroups] = useState<any[]>([]);
  const [riskCategories, setRiskCategories] = useState<any[]>([]);
  const [trainingTypes, setTrainingTypes] = useState<any[]>([]);
  const [auditCategories, setAuditCategories] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  // Approval Process State
  const [approvalWorkflows, setApprovalWorkflows] = useState<any[]>([]);

  // ISO Selection State
  const [selectedISOs, setSelectedISOs] = useState<string[]>([]);
  const [customISOs, setCustomISOs] = useState<string[]>([]);
  const [isoCriteria, setIsoCriteria] = useState<any[]>([]);
  const [criteriaView, setCriteriaView] = useState<"compact" | "complete">(
    "compact"
  );
  const [newCustomISO, setNewCustomISO] = useState("");
  const [customCriteria, setCustomCriteria] = useState<
    Record<string, string[]>
  >({});
  const [newCriterionText, setNewCriterionText] = useState("");
  const [addingCriterionForISO, setAddingCriterionForISO] = useState<
    string | null
  >(null);

  // G-Investigations State
  const [selectedGInvestigations, setSelectedGInvestigations] = useState<
    string[]
  >([]);

  const predefinedISOs = [
    {
      id: "ISO_45001",
      name: "ISO 45001",
      description: "Occupational Health and Safety",
    },
    {
      id: "ISO_14001",
      name: "ISO 14001",
      description: "Environmental Management",
    },
    { id: "ISO_9001", name: "ISO 9001", description: "Quality Management" },
    { id: "ISO_50001", name: "ISO 50001", description: "Energy Management" },
  ];

  // Predefined criteria for each ISO standard
  const predefinedCriteria: Record<
    string,
    { compact: string[]; complete: string[] }
  > = {
    ISO_45001: {
      compact: [
        "Context of the organization",
        "Leadership and worker participation",
        "Planning",
        "Support and operation",
      ],
      complete: [
        "Understanding the organization and its context",
        "Understanding the needs and expectations of workers",
        "OH&S policy",
        "Roles, responsibilities and authorities",
        "Consultation and participation of workers",
        "Hazard identification and assessment of risks",
        "Legal requirements and other requirements",
        "OH&S objectives and planning",
        "Resources, competence, awareness, communication",
        "Documented information",
        "Operational planning and control",
        "Emergency preparedness and response",
      ],
    },
    ISO_14001: {
      compact: [
        "Environmental policy",
        "Environmental aspects",
        "Legal and other requirements",
        "Environmental objectives",
      ],
      complete: [
        "Understanding the organization and its context",
        "Understanding stakeholder needs",
        "Environmental management system scope",
        "Environmental policy establishment",
        "Environmental aspects identification",
        "Compliance obligations",
        "Environmental objectives and planning",
        "Resources and competence",
        "Awareness and communication",
        "Operational control",
        "Emergency preparedness",
        "Monitoring and measurement",
      ],
    },
    ISO_9001: {
      compact: [
        "Quality management system",
        "Leadership commitment",
        "Customer focus",
        "Quality objectives",
      ],
      complete: [
        "Understanding the organization context",
        "Understanding customer requirements",
        "Quality policy",
        "Quality objectives",
        "Resources provision",
        "Competence and awareness",
        "Communication processes",
        "Documented information control",
        "Operational planning and control",
        "Customer requirements determination",
        "Design and development",
        "Control of externally provided processes",
      ],
    },
    ISO_50001: {
      compact: [
        "Energy policy",
        "Energy planning",
        "Energy performance",
        "Energy baseline",
      ],
      complete: [
        "Understanding organization context",
        "Understanding stakeholder needs",
        "Energy management system scope",
        "Energy policy",
        "Energy review",
        "Energy performance indicators",
        "Energy baseline establishment",
        "Energy objectives and targets",
        "Action plans for targets",
        "Competence and awareness",
        "Operational control",
        "Monitoring and measurement",
      ],
    },
  };

  const form = useForm({
    resolver: zodResolver(baseSchema),
    defaultValues: { name: "", description: "" },
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
    if (user && companyId) {
      fetchAllData();
      fetchTeamMembers();
      fetchCustomRoles();
      fetchApprovalWorkflows();
      fetchISOStandards();
      fetchGInvestigations();
    }
  }, [user, loading, navigate, companyId]);

  const fetchAllData = async () => {
    if (!companyId) return;

    setLoadingData(true);
    try {
      const [depts, locs, roles, exposure, risk, training, audit, emps] =
        await Promise.all([
          supabase.from("departments").select("*").eq("company_id", companyId),
          supabase.from("locations").select("*").eq("company_id", companyId),
          supabase.from("job_roles").select("*").eq("company_id", companyId),
          supabase
            .from("exposure_groups")
            .select("*")
            .eq("company_id", companyId),
          supabase
            .from("risk_categories")
            .select("*")
            .eq("company_id", companyId),
          supabase
            .from("training_types")
            .select("*")
            .eq("company_id", companyId),
          supabase
            .from("audit_categories")
            .select("*")
            .eq("company_id", companyId),
          supabase
            .from("employees")
            .select("id, full_name")
            .eq("company_id", companyId)
            .order("full_name"),
        ]);

      setDepartments(depts.data || []);
      setLocations(locs.data || []);
      setJobRoles(roles.data || []);
      setExposureGroups(exposure.data || []);
      setRiskCategories(risk.data || []);
      setTrainingTypes(training.data || []);
      setAuditCategories(audit.data || []);
      setEmployees(emps.data || []);
    } catch (err: unknown) {
      const e = err as { message?: string } | Error | null;
      const message =
        e && "message" in e && e.message ? e.message : String(err);
      toast({
        title: "Error loading data",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  };

  const fetchTeamMembers = async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from("team_members")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTeamMembers(data || []);
    } catch (err: unknown) {
      console.error("Error fetching team members:", err);
    }
  };

  const fetchCustomRoles = async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from("custom_roles")
        .select("*")
        .eq("company_id", companyId);

      if (error) throw error;

      // Merge custom roles with predefined ones
      if (data && data.length > 0) {
        const customRolesObj: RolePermissions = {};
        data.forEach((role: any) => {
          customRolesObj[role.role_name] = role.permissions;
        });
        setRoles((prev) => ({ ...prev, ...customRolesObj }));
      }
    } catch (err: unknown) {
      console.error("Error fetching custom roles:", err);
    }
  };

  const fetchApprovalWorkflows = async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from("approval_workflows")
        .select(
          `
          *,
          departments(name),
          employees(full_name)
        `
        )
        .eq("company_id", companyId);

      if (error) throw error;

      const formatted = (data || []).map((wf: any) => ({
        id: wf.id,
        department_id: wf.department_id,
        department_name: wf.departments?.name || "",
        approver_id: wf.approver_id,
        approver_name: wf.employees?.full_name || "",
      }));

      setApprovalWorkflows(formatted);
    } catch (err: unknown) {
      console.error("Error fetching approval workflows:", err);
    }
  };

  const fetchISOStandards = async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from("company_iso_standards")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_active", true);

      if (error) throw error;

      const selected: string[] = [];
      const custom: string[] = [];

      (data || []).forEach((iso: any) => {
        selected.push(iso.iso_code);
        if (iso.is_custom) {
          custom.push(iso.iso_code);
        }
      });

      setSelectedISOs(selected);
      setCustomISOs(custom);
    } catch (err: unknown) {
      console.error("Error fetching ISO standards:", err);
    }
  };

  const fetchGInvestigations = async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from("g_investigations")
        .select("*")
        .eq("company_id", companyId);

      if (error) {
        console.log("G-Investigations not found, table may not exist yet");
        setSelectedGInvestigations([]);
        return;
      }

      // Extract just the code part from "code - description" format
      const selected = (data || []).map((item: any) => {
        const name = item.name;
        // If name contains " - ", extract the code part before it
        if (name && name.includes(" - ")) {
          return name.split(" - ")[0];
        }
        return name;
      });
      setSelectedGInvestigations(selected);
    } catch (err: unknown) {
      console.error("Error fetching G-Investigations:", err);
      setSelectedGInvestigations([]);
    }
  };

  const saveGInvestigations = async () => {
    if (!companyId) return;

    try {
      // First, delete all existing G-Investigations for this company
      await supabase
        .from("g_investigations")
        .delete()
        .eq("company_id", companyId);

      // Then insert the selected ones with full descriptions
      if (selectedGInvestigations.length > 0) {
        // Map of G-codes to their descriptions
        const gCodeDescriptions: Record<string, string> = {
          "G 1.1": "General medical examination",
          "G 1.2": "Ophthalmological examination",
          "G 1.3": "Audiological examination",
          "G 1.4": "Examination for tropical service",
          "G 2": "Blood (e.g. lead, solvents)",
          "G 3": "Allergizing substances",
          "G 4": "Skin diseases",
          "G 5": "Tropical service",
          "G 6": "Compressed air",
          "G 7": "Hazardous substances",
          "G 8": "Benzene",
          "G 9": "Mercury",
          "G 10": "Methyl alcohol",
          "G 11": "Carbon disulfide",
          "G 12": "Phosphorus",
          "G 13": "Hydrocarbons",
          "G 14": "Chromium compounds",
          "G 15": "Carcinogenic substances",
          "G 16": "Arsenic",
          "G 17": "Vinyl chloride",
          "G 18": "Pesticides",
          "G 19": "Nitro compounds",
          "G 20": "Noise",
          "G 21": "Cold",
          "G 22": "Heat",
          "G 23": "Ionizing radiation",
          "G 24": "Skin cancer",
          "G 25": "Driving activities",
          "G 26": "Non-ionizing radiation",
          "G 27": "Isocyanates",
          "G 28": "Latex",
          "G 29": "Benzol homologues",
          "G 30": "Biological agents",
          "G 31": "Overpressure",
          "G 32": "Cadmium",
          "G 33": "Asbestos",
          "G 34": "Fluorine",
          "G 35": "Work abroad under special climatic and health stresses",
          "G 36": "Bitumen",
          "G 37": "Display screen work",
          "G 38": "Nickel dusts",
          "G 39": "Welding fumes",
          "G 40": "Carcinogenic and mutagenic substances",
          "G 41": "Risk of falling",
          "G 42": "Infectious hazards",
          "G 43": "Biotechnology",
          "G 44": "Hardwood dusts",
          "G 45": "Styrene",
          "G 46": "Musculoskeletal stress including vibrations",
        };

        const investigations = selectedGInvestigations.map((code) => ({
          company_id: companyId,
          name: `${code} - ${gCodeDescriptions[code] || code}`, // Save code with description
        }));

        const { error } = await supabase
          .from("g_investigations")
          .insert(investigations);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "G-Investigations saved successfully",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to save G-Investigations",
        variant: "destructive",
      });
    }
  };

  const toggleGInvestigation = (code: string) => {
    setSelectedGInvestigations((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const saveApprovalWorkflow = async (
    departmentId: string,
    approverId: string
  ) => {
    if (!companyId) return;

    try {
      const { error } = await supabase.from("approval_workflows").upsert(
        {
          company_id: companyId,
          department_id: departmentId,
          approver_id: approverId,
        },
        {
          onConflict: "company_id,department_id",
        }
      );

      if (error) throw error;

      toast({
        title: "Success",
        description: "Approval workflow saved successfully",
      });

      fetchApprovalWorkflows();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const deleteApprovalWorkflow = async (id: string) => {
    if (!companyId) return;

    try {
      const { error } = await supabase
        .from("approval_workflows")
        .delete()
        .eq("id", id)
        .eq("company_id", companyId);

      if (error) throw error;

      fetchApprovalWorkflows();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const saveISOStandard = async (
    isoCode: string,
    isoName: string,
    isCustom: boolean
  ) => {
    if (!companyId) return;

    try {
      const { error } = await supabase.from("company_iso_standards").upsert(
        {
          company_id: companyId,
          iso_code: isoCode,
          iso_name: isoName,
          is_custom: isCustom,
          is_active: true,
        },
        {
          onConflict: "company_id,iso_code",
        }
      );

      if (error) throw error;
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const deleteISOStandard = async (isoCode: string) => {
    if (!companyId) return;

    try {
      const { error } = await supabase
        .from("company_iso_standards")
        .delete()
        .eq("company_id", companyId)
        .eq("iso_code", isoCode);

      if (error) throw error;
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleAddTeamMember = async () => {
    if (!companyId) return;

    if (
      !teamMemberForm.firstName ||
      !teamMemberForm.lastName ||
      !teamMemberForm.email ||
      !teamMemberForm.role
    ) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setIsAddingTeamMember(true);
    try {
      const { data, error } = await (supabase as any)
        .from("team_members")
        .insert([
          {
            company_id: companyId,
            first_name: teamMemberForm.firstName,
            last_name: teamMemberForm.lastName,
            email: teamMemberForm.email,
            role: teamMemberForm.role,
            status: "pending",
          },
        ])
        .select();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Team member added successfully",
      });

      // Reset form
      setTeamMemberForm({
        firstName: "",
        lastName: "",
        email: "",
        role: "",
      });

      // Refresh team members list
      fetchTeamMembers();
    } catch (err: unknown) {
      const e = err as { message?: string } | Error | null;
      const message =
        e && "message" in e && e.message ? e.message : String(err);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsAddingTeamMember(false);
    }
  };

  const getTableName = (title: string) => {
    const mapping: Record<string, string> = {
      Departments: "departments",
      "Job Roles": "job_roles",
      "Exposure Groups": "exposure_groups",
      "Hazard Categories": "risk_categories",
      "Training Types": "training_types",
      "Audit Categories": "audit_categories",
    };
    return mapping[title];
  };

  const onSubmit = async (data: unknown) => {
    console.log(
      "onSubmit called with data:",
      data,
      "currentTableName:",
      currentTableName
    );

    if (!companyId || !currentTableName) {
      toast({
        title: "Error",
        description: "Missing required data. Please try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      const tableName = currentTableName;
      const formData = data as { name: string; description?: string };

      // job_roles table uses 'title' field instead of 'name'
      const usesTitleField = tableName === "job_roles";
      const payload = usesTitleField
        ? { title: formData.name, description: formData.description }
        : { name: formData.name, description: formData.description };

      if (editingItem) {
        // Update existing item
        const { error } = await (supabase as any)
          .from(tableName)
          .update(payload)
          .eq("id", editingItem.id)
          .eq("company_id", companyId);

        if (error) throw error;
        toast({ title: "Success", description: "Item updated successfully" });
      } else {
        // Create new item
        const { error } = await (supabase as any).from(tableName).insert([
          {
            ...payload,
            company_id: companyId,
          },
        ]);

        if (error) throw error;
        toast({ title: "Success", description: "Item created successfully" });
      }

      setIsDialogOpen(false);
      setEditingItem(null);
      setCurrentTableName("");
      form.reset();
      fetchAllData();
    } catch (err: unknown) {
      const e = err as { message?: string } | Error | null;
      const message =
        e && "message" in e && e.message ? e.message : String(err);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    form.setValue("name", item.name || item.title || "");
    form.setValue("description", item.description || "");
    setForceDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteItem || !companyId) return;

    try {
      const tableName = deleteItem.tableName;
      if (!tableName) {
        toast({
          title: "Error",
          description: "Table name is missing. Please try again.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq("id", deleteItem.id)
        .eq("company_id", companyId);

      if (error) throw error;

      toast({ title: "Success", description: "Item deleted successfully" });
      setDeleteItem(null);
      fetchAllData();
    } catch (err: unknown) {
      const e = err as { message?: string } | Error | null;
      const message =
        e && "message" in e && e.message ? e.message : String(err);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setCurrentTableName("");
    form.reset();
  };

  // User Roles State
  interface RolePermissions {
    [key: string]: {
      dashboard: boolean;
      employees: boolean;
      healthCheckups: boolean;
      documents: boolean;
      reports: boolean;
      audits: boolean;
      settings: boolean;
    };
  }

  // Team Members State
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [teamMemberForm, setTeamMemberForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "",
  });
  const [isAddingTeamMember, setIsAddingTeamMember] = useState(false);

  const [roles, setRoles] = useState<RolePermissions>({
    Admin: {
      dashboard: true,
      employees: true,
      healthCheckups: true,
      documents: true,
      reports: true,
      audits: true,
      settings: true,
    },
    "Line Manager": {
      dashboard: true,
      employees: true,
      healthCheckups: true,
      documents: true,
      reports: true,
      audits: false,
      settings: false,
    },
    "HSE Manager": {
      dashboard: true,
      employees: true,
      healthCheckups: true,
      documents: true,
      reports: true,
      audits: true,
      settings: false,
    },
    Doctor: {
      dashboard: true,
      employees: false,
      healthCheckups: true,
      documents: true,
      reports: false,
      audits: false,
      settings: false,
    },
    Employee: {
      dashboard: true,
      employees: false,
      healthCheckups: false,
      documents: true,
      reports: false,
      audits: false,
      settings: false,
    },
    External: {
      dashboard: false,
      employees: false,
      healthCheckups: false,
      documents: true,
      reports: false,
      audits: false,
      settings: false,
    },
  });

  const [isAddingCustomRole, setIsAddingCustomRole] = useState(false);
  const [customRoleName, setCustomRoleName] = useState("");

  const permissions = [
    "dashboard",
    "employees",
    "healthCheckups",
    "documents",
    "reports",
    "audits",
    "settings",
  ] as const;

  const togglePermission = async (roleName: string, permission: string) => {
    const newPermissions = {
      ...roles[roleName],
      [permission]:
        !roles[roleName][permission as keyof (typeof roles)[typeof roleName]],
    };

    setRoles((prev) => ({
      ...prev,
      [roleName]: newPermissions,
    }));

    // Auto-save to database
    try {
      if (!companyId) return;

      const { error } = await (supabase as any).from("custom_roles").upsert(
        {
          company_id: companyId,
          role_name: roleName,
          permissions: newPermissions,
          is_predefined: [
            "Admin",
            "Line Manager",
            "HSE Manager",
            "Doctor",
            "Employee",
            "External",
          ].includes(roleName),
        },
        { onConflict: "company_id,role_name" }
      );

      if (error) throw error;

      toast({
        title: "Success",
        description: "Permission updated successfully",
      });
    } catch (error) {
      console.error("Error updating permission:", error);
      toast({
        title: "Error",
        description: "Failed to update permission",
        variant: "destructive",
      });
    }
  };

  const addCustomRole = async () => {
    if (!customRoleName.trim()) {
      toast({
        title: "Error",
        description: "Role name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    if (roles[customRoleName]) {
      toast({
        title: "Error",
        description: "Role already exists",
        variant: "destructive",
      });
      return;
    }

    if (!companyId) {
      toast({
        title: "Error",
        description: "Company ID not found",
        variant: "destructive",
      });
      return;
    }

    try {
      const newPermissions = {
        dashboard: false,
        employees: false,
        healthCheckups: false,
        documents: false,
        reports: false,
        audits: false,
        settings: false,
      };

      const { error } = await (supabase as any).from("custom_roles").insert([
        {
          company_id: companyId,
          role_name: customRoleName,
          permissions: newPermissions,
          is_predefined: false,
        },
      ]);

      if (error) throw error;

      setRoles((prev) => ({
        ...prev,
        [customRoleName]: newPermissions,
      }));

      setCustomRoleName("");
      setIsAddingCustomRole(false);
      toast({
        title: "Success",
        description: `Role "${customRoleName}" created successfully`,
      });
    } catch (err: unknown) {
      const e = err as { message?: string } | Error | null;
      const message =
        e && "message" in e && e.message ? e.message : String(err);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  const deleteCustomRole = async (roleName: string) => {
    const predefinedRoles = [
      "Admin",
      "Line Manager",
      "HSE Manager",
      "Doctor",
      "Employee",
      "External",
    ];

    if (predefinedRoles.includes(roleName)) {
      toast({
        title: "Error",
        description: "Cannot delete predefined roles",
        variant: "destructive",
      });
      return;
    }

    if (!companyId) return;

    try {
      const { error } = await supabase
        .from("custom_roles")
        .delete()
        .eq("company_id", companyId)
        .eq("role_name", roleName);

      if (error) throw error;

      setRoles((prev) => {
        const newRoles = { ...prev };
        delete newRoles[roleName];
        return newRoles;
      });

      toast({
        title: "Success",
        description: `Role "${roleName}" deleted successfully`,
      });
    } catch (err: unknown) {
      const e = err as { message?: string } | Error | null;
      const message =
        e && "message" in e && e.message ? e.message : String(err);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  const renderUserRolesTab = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t("settings.userRoles")}</CardTitle>
            <CardDescription>{t("settings.rolesDesc")}</CardDescription>
          </div>
          <Button onClick={() => setIsAddingCustomRole(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t("settings.addRole")}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Add Custom Role Dialog */}
        <Dialog open={isAddingCustomRole} onOpenChange={setIsAddingCustomRole}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("settings.createRole")}</DialogTitle>
              <DialogDescription>{t("settings.roleDesc")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Input
                  placeholder={t("settings.rolePlaceholder")}
                  value={customRoleName}
                  onChange={(e) => setCustomRoleName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      addCustomRole();
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddingCustomRole(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button onClick={addCustomRole}>
                {t("settings.createRole")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Permission Grid */}
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px] sticky left-0 bg-background z-10">
                  {t("settings.role")}
                </TableHead>
                <TableHead className="text-center">
                  {t("settings.dashboard")}
                </TableHead>
                <TableHead className="text-center">
                  {t("settings.employees")}
                </TableHead>
                <TableHead className="text-center">
                  {t("settings.healthCheckups")}
                </TableHead>
                <TableHead className="text-center">
                  {t("settings.documents")}
                </TableHead>
                <TableHead className="text-center">
                  {t("settings.reports")}
                </TableHead>
                <TableHead className="text-center">
                  {t("settings.audits")}
                </TableHead>
                <TableHead className="text-center">
                  {t("settings.settings")}
                </TableHead>
                <TableHead className="text-center">
                  {t("common.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(roles).map(([roleName, permissions]) => {
                const isPredefined = [
                  "Admin",
                  "Line Manager",
                  "HSE Manager",
                  "Doctor",
                  "Employee",
                  "External",
                ].includes(roleName);

                return (
                  <TableRow key={roleName}>
                    <TableCell className="font-medium sticky left-0 bg-background z-10">
                      <div className="flex items-center gap-2">
                        {roleName}
                        {isPredefined && (
                          <span className="text-xs text-muted-foreground">
                            (Predefined)
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <input
                        type="checkbox"
                        checked={permissions.dashboard}
                        onChange={() => togglePermission(roleName, "dashboard")}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <input
                        type="checkbox"
                        checked={permissions.employees}
                        onChange={() => togglePermission(roleName, "employees")}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <input
                        type="checkbox"
                        checked={permissions.healthCheckups}
                        onChange={() =>
                          togglePermission(roleName, "healthCheckups")
                        }
                        className="w-4 h-4 cursor-pointer"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <input
                        type="checkbox"
                        checked={permissions.documents}
                        onChange={() => togglePermission(roleName, "documents")}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <input
                        type="checkbox"
                        checked={permissions.reports}
                        onChange={() => togglePermission(roleName, "reports")}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <input
                        type="checkbox"
                        checked={permissions.audits}
                        onChange={() => togglePermission(roleName, "audits")}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <input
                        type="checkbox"
                        checked={permissions.settings}
                        onChange={() => togglePermission(roleName, "settings")}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      {!isPredefined && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteCustomRole(roleName)}
                              className="h-7 w-7"
                            >
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete role</TooltipContent>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  const renderTable = (data: any[], title: string) => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              Manage {title.toLowerCase()} - Used across the system in dropdown
              menus
            </CardDescription>
          </div>
          <Dialog
            open={forceDialogOpen || undefined}
            onOpenChange={(open) => {
              if (!open) {
                handleDialogClose();
                setForceDialogOpen(false);
              } else {
                setForceDialogOpen(true);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  const tableName = getTableName(title);
                  console.log(
                    "Opening dialog for table:",
                    tableName,
                    "with title:",
                    title
                  );
                  setCurrentTableName(tableName);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add {title.slice(0, -1)}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? "Edit" : "Add"} {title.slice(0, -1)}
                </DialogTitle>
                <DialogDescription>
                  {editingItem
                    ? "Update the details below to modify this item."
                    : "Create a new item that will be available in dropdown menus throughout the system."}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder={`Enter ${title
                              .slice(0, -1)
                              .toLowerCase()} name`}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={3}
                            placeholder="Add additional details or notes..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleDialogClose}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingItem ? "Update" : "Create"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No items found. Click "Add {title.slice(0, -1)}" to create
                    your first entry.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.name || item.title}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.description || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setCurrentTableName(getTableName(title));
                                handleEdit(item);
                              }}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                setDeleteItem({
                                  ...item,
                                  tableName: getTableName(title),
                                })
                              }
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "
              {deleteItem?.name || deleteItem?.title}". This action cannot be
              undone. Items assigned to employees or other records will be
              unlinked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">{t("settings.title")}</h1>
              <p className="text-xs text-muted-foreground">
                {t("settings.subtitle")}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-[1600px]">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Vertical Sidebar Navigation */}
          <div className="lg:w-64 flex-shrink-0">
            <Card className="sticky top-24">
              <CardContent className="p-4">
                <nav className="space-y-1">
                  <button
                    onClick={() => setActiveTab("team")}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === "team"
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <div className="text-left">
                      <div>{t("settings.team")}</div>
                      <div className="text-xs opacity-80">
                        {t("settings.teamDesc")}
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab("user-roles")}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === "user-roles"
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    <div className="text-left">
                      <div>{t("settings.userRoles")}</div>
                      <div className="text-xs opacity-80">
                        {t("settings.rolesDesc")}
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab("configuration")}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === "configuration"
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <SettingsIcon className="w-4 h-4" />
                    <div className="text-left">
                      <div>{t("settings.configuration")}</div>
                      <div className="text-xs opacity-80">
                        {t("settings.configDesc")}
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab("catalogs")}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === "catalogs"
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    <div className="text-left">
                      <div>{t("settings.catalogs")}</div>
                      <div className="text-xs opacity-80">
                        {t("settings.catalogsDesc")}
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab("intervals")}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === "intervals"
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    <div className="text-left">
                      <div>{t("settings.intervals")}</div>
                      <div className="text-xs opacity-80">
                        {t("settings.intervalsDesc")}
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab("medical-care")}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === "medical-care"
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <Stethoscope className="w-4 h-4" />
                    <div className="text-left">
                      <div>{t("settings.medicalCare")}</div>
                      <div className="text-xs opacity-80">
                        {t("settings.medicalDesc")}
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab("api-integration")}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === "api-integration"
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <Plug className="w-4 h-4" />
                    <div className="text-left">
                      <div>{t("settings.apiIntegration")}</div>
                      <div className="text-xs opacity-80">
                        {t("settings.apiIntegrationNav")}
                      </div>
                    </div>
                  </button>
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="flex-1">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              {/* Tab 1: Team Management */}
              <TabsContent value="team">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{t("settings.teamManagement")}</CardTitle>
                        <CardDescription>
                          {t("settings.teamManagementDesc")}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-4 gap-4 mb-4 p-4 border rounded-lg bg-muted/50">
                        <div>
                          <Label>{t("settings.firstName")}</Label>
                          <Input
                            placeholder={t("settings.enterFirstName")}
                            value={teamMemberForm.firstName}
                            onChange={(e) =>
                              setTeamMemberForm((prev) => ({
                                ...prev,
                                firstName: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label>{t("settings.lastName")}</Label>
                          <Input
                            placeholder={t("settings.enterLastName")}
                            value={teamMemberForm.lastName}
                            onChange={(e) =>
                              setTeamMemberForm((prev) => ({
                                ...prev,
                                lastName: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label>{t("common.email")}</Label>
                          <Input
                            type="email"
                            placeholder={t("settings.enterEmail")}
                            value={teamMemberForm.email}
                            onChange={(e) =>
                              setTeamMemberForm((prev) => ({
                                ...prev,
                                email: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label>{t("settings.userRole")}</Label>
                          <Select
                            value={teamMemberForm.role}
                            onValueChange={(value) =>
                              setTeamMemberForm((prev) => ({
                                ...prev,
                                role: value,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue
                                placeholder={t("settings.selectRole")}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.keys(roles).map((role) => (
                                <SelectItem key={role} value={role}>
                                  {role}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-4 flex justify-end">
                          <Button
                            onClick={handleAddTeamMember}
                            disabled={isAddingTeamMember}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            {isAddingTeamMember
                              ? "Adding..."
                              : t("settings.addTeamMember")}
                          </Button>
                        </div>
                      </div>

                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t("settings.name")}</TableHead>
                              <TableHead>{t("settings.email")}</TableHead>
                              <TableHead>{t("settings.role")}</TableHead>
                              <TableHead>{t("settings.status")}</TableHead>
                              <TableHead className="text-right">
                                {t("common.actions")}
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {teamMembers.length === 0 ? (
                              <TableRow>
                                <TableCell
                                  colSpan={5}
                                  className="text-center py-8 text-muted-foreground"
                                >
                                  {t("settings.noTeamMembers")}
                                </TableCell>
                              </TableRow>
                            ) : (
                              teamMembers.map((member) => (
                                <TableRow key={member.id}>
                                  <TableCell className="font-medium">
                                    {member.first_name} {member.last_name}
                                  </TableCell>
                                  <TableCell>{member.email}</TableCell>
                                  <TableCell>
                                    <Badge variant="secondary">
                                      {member.role}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant={
                                        member.status === "active"
                                          ? "default"
                                          : member.status === "pending"
                                          ? "secondary"
                                          : "outline"
                                      }
                                    >
                                      {member.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={async () => {
                                        try {
                                          const { error } = await supabase
                                            .from("team_members")
                                            .delete()
                                            .eq("id", member.id);

                                          if (error) throw error;

                                          toast({
                                            title: "Success",
                                            description:
                                              "Team member removed successfully",
                                          });
                                          fetchTeamMembers();
                                        } catch (err: any) {
                                          toast({
                                            title: "Error",
                                            description: err.message,
                                            variant: "destructive",
                                          });
                                        }
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab 2: User Roles (RBAC) */}
              <TabsContent value="user-roles">
                {renderUserRolesTab()}
              </TabsContent>

              {/* Tab 3: Configuration */}
              <TabsContent value="configuration">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="w-5 h-5" />
                        {t("settings.locations")}
                      </CardTitle>
                      <CardDescription>
                        {t("settings.locationsDesc")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Quick Add Location */}
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter location name..."
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                const input = e.currentTarget;
                                const value = input.value.trim();
                                if (value && companyId) {
                                  supabase
                                    .from("locations")
                                    .insert([
                                      { name: value, company_id: companyId },
                                    ])
                                    .then(({ error }) => {
                                      if (error) {
                                        toast({
                                          title: "Error",
                                          description: error.message,
                                          variant: "destructive",
                                        });
                                      } else {
                                        toast({
                                          title: "Success",
                                          description:
                                            "Location added successfully",
                                        });
                                        input.value = "";
                                        fetchAllData();
                                      }
                                    });
                                }
                              }
                            }}
                          />
                          <Button
                            onClick={(e) => {
                              const input = e.currentTarget
                                .previousElementSibling as HTMLInputElement;
                              const value = input?.value.trim();
                              if (value && companyId) {
                                supabase
                                  .from("locations")
                                  .insert([
                                    { name: value, company_id: companyId },
                                  ])
                                  .then(({ error }) => {
                                    if (error) {
                                      toast({
                                        title: "Error",
                                        description: error.message,
                                        variant: "destructive",
                                      });
                                    } else {
                                      toast({
                                        title: "Success",
                                        description:
                                          "Location added successfully",
                                      });
                                      if (input) input.value = "";
                                      fetchAllData();
                                    }
                                  });
                              }
                            }}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add
                          </Button>
                        </div>

                        {/* Locations List */}
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead className="text-right">
                                  Actions
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {locations.length === 0 ? (
                                <TableRow>
                                  <TableCell
                                    colSpan={2}
                                    className="text-center py-8 text-muted-foreground"
                                  >
                                    No locations found. Add your first location
                                    above.
                                  </TableCell>
                                </TableRow>
                              ) : (
                                locations.map((loc) => (
                                  <TableRow key={loc.id}>
                                    <TableCell className="font-medium">
                                      {loc.name}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex justify-end gap-2">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => {
                                            setCurrentTableName("locations");
                                            handleEdit(loc);
                                          }}
                                        >
                                          <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => {
                                            setCurrentTableName("locations");
                                            setDeleteItem({
                                              ...loc,
                                              tableName: "locations",
                                            });
                                          }}
                                        >
                                          <Trash2 className="w-4 h-4 text-destructive" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Departments - Inline Add */}
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("settings.departments")}</CardTitle>
                      <CardDescription>
                        Manage departments - Used across the system in dropdown
                        menus
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Quick Add Department */}
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter department name..."
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                const input = e.currentTarget;
                                const value = input.value.trim();
                                if (value && companyId) {
                                  supabase
                                    .from("departments")
                                    .insert([
                                      { name: value, company_id: companyId },
                                    ])
                                    .then(({ error }) => {
                                      if (error) {
                                        toast({
                                          title: "Error",
                                          description: error.message,
                                          variant: "destructive",
                                        });
                                      } else {
                                        toast({
                                          title: "Success",
                                          description:
                                            "Department added successfully",
                                        });
                                        input.value = "";
                                        fetchAllData();
                                      }
                                    });
                                }
                              }
                            }}
                          />
                          <Button
                            onClick={(e) => {
                              const input = e.currentTarget
                                .previousElementSibling as HTMLInputElement;
                              const value = input?.value.trim();
                              if (value && companyId) {
                                supabase
                                  .from("departments")
                                  .insert([
                                    { name: value, company_id: companyId },
                                  ])
                                  .then(({ error }) => {
                                    if (error) {
                                      toast({
                                        title: "Error",
                                        description: error.message,
                                        variant: "destructive",
                                      });
                                    } else {
                                      toast({
                                        title: "Success",
                                        description:
                                          "Department added successfully",
                                      });
                                      if (input) input.value = "";
                                      fetchAllData();
                                    }
                                  });
                              }
                            }}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add
                          </Button>
                        </div>

                        {/* Departments List */}
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead className="text-right">
                                  Actions
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {departments.length === 0 ? (
                                <TableRow>
                                  <TableCell
                                    colSpan={2}
                                    className="text-center py-8 text-muted-foreground"
                                  >
                                    No departments found. Add your first
                                    department above.
                                  </TableCell>
                                </TableRow>
                              ) : (
                                departments.map((dept) => (
                                  <TableRow key={dept.id}>
                                    <TableCell className="font-medium">
                                      {dept.name}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex justify-end gap-2">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => {
                                            setCurrentTableName("departments");
                                            handleEdit(dept);
                                          }}
                                        >
                                          <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => {
                                            setCurrentTableName("departments");
                                            setDeleteItem(dept);
                                          }}
                                        >
                                          <Trash2 className="w-4 h-4 text-destructive" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <GitBranch className="w-5 h-5" />
                        {t("settings.approvalProcess")}
                      </CardTitle>
                      <CardDescription>
                        {t("settings.approvalProcessDesc")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Add New Approval Workflow */}
                        <div className="p-4 border rounded-lg bg-muted/30">
                          <h4 className="font-medium mb-3">
                            {t("settings.addApprovalWorkflow")}
                          </h4>
                          <div className="flex gap-3">
                            <div className="flex-1">
                              <Label>{t("settings.department")}</Label>
                              <Select
                                onValueChange={(value) => {
                                  const dept = departments.find(
                                    (d) => d.id === value
                                  );
                                  if (
                                    dept &&
                                    !approvalWorkflows.find(
                                      (w) => w.department_id === value
                                    )
                                  ) {
                                    setApprovalWorkflows([
                                      ...approvalWorkflows,
                                      {
                                        id: Date.now().toString(),
                                        department_id: value,
                                        department_name: dept.name,
                                        approver_id: "",
                                        approver_name: "",
                                      },
                                    ]);
                                  }
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue
                                    placeholder={t("settings.selectDepartment")}
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  {departments
                                    .filter(
                                      (d) =>
                                        !approvalWorkflows.find(
                                          (w) => w.department_id === d.id
                                        )
                                    )
                                    .map((dept) => (
                                      <SelectItem key={dept.id} value={dept.id}>
                                        {dept.name}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>

                        {/* Approval Workflows List */}
                        {approvalWorkflows.length > 0 ? (
                          <div className="rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>
                                    {t("settings.department")}
                                  </TableHead>
                                  <TableHead>
                                    {t("settings.approver")}
                                  </TableHead>
                                  <TableHead className="text-right">
                                    {t("common.actions")}
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {approvalWorkflows.map((workflow) => (
                                  <TableRow key={workflow.id}>
                                    <TableCell className="font-medium">
                                      {workflow.department_name}
                                    </TableCell>
                                    <TableCell>
                                      <Select
                                        value={workflow.approver_id}
                                        onValueChange={(value) => {
                                          saveApprovalWorkflow(
                                            workflow.department_id,
                                            value
                                          );
                                        }}
                                      >
                                        <SelectTrigger className="w-[250px]">
                                          <SelectValue
                                            placeholder={t(
                                              "settings.selectApprover"
                                            )}
                                          />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {employees.map((emp) => (
                                            <SelectItem
                                              key={emp.id}
                                              value={emp.id}
                                            >
                                              {emp.full_name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                          deleteApprovalWorkflow(workflow.id);
                                        }}
                                      >
                                        <Trash2 className="w-4 h-4 text-destructive" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground border rounded-lg">
                            {t("settings.noApprovalWorkflows")}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Exposure Groups - Inline Add */}
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("settings.exposureGroups")}</CardTitle>
                      <CardDescription>
                        Manage exposure groups - Used across the system in
                        dropdown menus
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Quick Add Exposure Group */}
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter exposure group name..."
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                const input = e.currentTarget;
                                const value = input.value.trim();
                                if (value && companyId) {
                                  supabase
                                    .from("exposure_groups")
                                    .insert([
                                      { name: value, company_id: companyId },
                                    ])
                                    .then(({ error }) => {
                                      if (error) {
                                        toast({
                                          title: "Error",
                                          description: error.message,
                                          variant: "destructive",
                                        });
                                      } else {
                                        toast({
                                          title: "Success",
                                          description:
                                            "Exposure group added successfully",
                                        });
                                        input.value = "";
                                        fetchAllData();
                                      }
                                    });
                                }
                              }
                            }}
                          />
                          <Button
                            onClick={(e) => {
                              const input = e.currentTarget
                                .previousElementSibling as HTMLInputElement;
                              const value = input?.value.trim();
                              if (value && companyId) {
                                supabase
                                  .from("exposure_groups")
                                  .insert([
                                    { name: value, company_id: companyId },
                                  ])
                                  .then(({ error }) => {
                                    if (error) {
                                      toast({
                                        title: "Error",
                                        description: error.message,
                                        variant: "destructive",
                                      });
                                    } else {
                                      toast({
                                        title: "Success",
                                        description:
                                          "Exposure group added successfully",
                                      });
                                      if (input) input.value = "";
                                      fetchAllData();
                                    }
                                  });
                              }
                            }}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add
                          </Button>
                        </div>

                        {/* Exposure Groups List */}
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">
                                  Actions
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {exposureGroups.length === 0 ? (
                                <TableRow>
                                  <TableCell
                                    colSpan={3}
                                    className="text-center py-8 text-muted-foreground"
                                  >
                                    No exposure groups found. Add your first
                                    group above.
                                  </TableCell>
                                </TableRow>
                              ) : (
                                exposureGroups.map((group) => (
                                  <TableRow key={group.id}>
                                    <TableCell className="font-medium">
                                      {group.name}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                      {group.description || "-"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex justify-end gap-2">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => {
                                            setCurrentTableName(
                                              "exposure_groups"
                                            );
                                            handleEdit(group);
                                          }}
                                        >
                                          <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => {
                                            setCurrentTableName(
                                              "exposure_groups"
                                            );
                                            setDeleteItem(group);
                                          }}
                                        >
                                          <Trash2 className="w-4 h-4 text-destructive" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Tab 4: Catalogs & Content */}
              <TabsContent value="catalogs">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("settings.hazardCategories")}</CardTitle>
                      <CardDescription>
                        {t("settings.hazardCategoriesDesc")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Quick Add Custom Category */}
                        <div className="flex gap-2">
                          <Input
                            placeholder="Add custom category..."
                            onKeyDown={async (e) => {
                              if (e.key === "Enter") {
                                const input = e.currentTarget;
                                const value = input.value.trim();
                                if (value && companyId) {
                                  const { error } = await supabase
                                    .from("risk_categories")
                                    .insert([
                                      {
                                        name: value,
                                        company_id: companyId,
                                        is_predefined: false,
                                      },
                                    ]);
                                  if (error) {
                                    toast({
                                      title: "Error",
                                      description: error.message,
                                      variant: "destructive",
                                    });
                                  } else {
                                    toast({
                                      title: "Success",
                                      description:
                                        "Category added successfully",
                                    });
                                    input.value = "";
                                    fetchAllData();
                                  }
                                }
                              }
                            }}
                          />
                          <Button
                            onClick={async (e) => {
                              const input = e.currentTarget
                                .previousElementSibling as HTMLInputElement;
                              const value = input?.value.trim();
                              if (value && companyId) {
                                const { error } = await supabase
                                  .from("risk_categories")
                                  .insert([
                                    {
                                      name: value,
                                      company_id: companyId,
                                      is_predefined: false,
                                    },
                                  ]);
                                if (error) {
                                  toast({
                                    title: "Error",
                                    description: error.message,
                                    variant: "destructive",
                                  });
                                } else {
                                  toast({
                                    title: "Success",
                                    description: "Category added successfully",
                                  });
                                  if (input) input.value = "";
                                  fetchAllData();
                                }
                              }
                            }}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            {t("settings.add")}
                          </Button>
                        </div>

                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Category</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">
                                  Actions
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {/* Predefined Categories */}
                              {["Low", "Medium", "High", "Very High"].map(
                                (cat) => (
                                  <TableRow key={cat}>
                                    <TableCell className="font-medium">
                                      {cat}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="secondary">
                                        {t("settings.predefined")}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                      -
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground text-xs">
                                      Cannot delete
                                    </TableCell>
                                  </TableRow>
                                )
                              )}
                              {/* Custom Categories */}
                              {riskCategories
                                .filter(
                                  (c) =>
                                    ![
                                      "Low",
                                      "Medium",
                                      "High",
                                      "Very High",
                                    ].includes(c.name)
                                )
                                .map((cat) => (
                                  <TableRow key={cat.id}>
                                    <TableCell className="font-medium">
                                      {cat.name}
                                    </TableCell>
                                    <TableCell>
                                      <Badge>{t("settings.custom")}</Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                      {cat.description || "-"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex justify-end gap-2">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => {
                                            setCurrentTableName(
                                              "risk_categories"
                                            );
                                            handleEdit(cat);
                                          }}
                                        >
                                          <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() =>
                                            setDeleteItem({
                                              ...cat,
                                              tableName: "risk_categories",
                                            })
                                          }
                                        >
                                          <Trash2 className="w-4 h-4 text-destructive" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Measure Building Blocks - Inline Add */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5" />
                        {t("settings.measureBuildingBlocks")}
                      </CardTitle>
                      <CardDescription>
                        {t("settings.measureBuildingBlocksDesc")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Quick Add Measure Building Block */}
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter measure building block name..."
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                const input = e.currentTarget;
                                const value = input.value.trim();
                                if (value) {
                                  toast({
                                    title: "Success",
                                    description: `Measure building block "${value}" added`,
                                  });
                                  input.value = "";
                                }
                              }
                            }}
                          />
                          <Button
                            onClick={(e) => {
                              const input = e.currentTarget
                                .previousElementSibling as HTMLInputElement;
                              const value = input?.value.trim();
                              if (value) {
                                toast({
                                  title: "Success",
                                  description: `Measure building block "${value}" added`,
                                });
                                if (input) input.value = "";
                              }
                            }}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Add reusable measure templates like Elimination,
                          Substitution, Engineering Controls, etc.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Audit Categories - Moved from Intervals tab */}
                  {renderTable(auditCategories, t("settings.auditCategories"))}

                  {/* ISO Selection moved to Intervals tab */}
                </div>
              </TabsContent>

              {/* Tab 5: Intervals and Deadlines */}
              <TabsContent value="intervals">
                <div className="space-y-6">
                  {/* ISO Selection & Criteria - Moved from Catalogs */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Tag className="w-5 h-5" />
                        {t("settings.isoSelection")}
                      </CardTitle>
                      <CardDescription>
                        {t("settings.isoSelectionDesc")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {/* ISO Selection */}
                        <div className="space-y-4">
                          <h4 className="font-medium">
                            {t("settings.selectISOStandards")}
                          </h4>
                          <div className="grid grid-cols-2 gap-3">
                            {predefinedISOs.map((iso) => (
                              <div
                                key={iso.id}
                                className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/30"
                              >
                                <input
                                  type="checkbox"
                                  id={iso.id}
                                  checked={selectedISOs.includes(iso.id)}
                                  onChange={async (e) => {
                                    if (e.target.checked) {
                                      await saveISOStandard(
                                        iso.id,
                                        iso.name,
                                        false
                                      );
                                      setSelectedISOs([
                                        ...selectedISOs,
                                        iso.id,
                                      ]);
                                    } else {
                                      await deleteISOStandard(iso.id);
                                      setSelectedISOs(
                                        selectedISOs.filter(
                                          (id) => id !== iso.id
                                        )
                                      );
                                    }
                                  }}
                                  className="w-4 h-4 mt-0.5 cursor-pointer"
                                />
                                <label
                                  htmlFor={iso.id}
                                  className="cursor-pointer flex-1"
                                >
                                  <div className="font-medium">{iso.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {iso.description}
                                  </div>
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Custom ISOs */}
                        <div className="space-y-3">
                          <h4 className="font-medium">
                            {t("settings.customISOStandards")}
                          </h4>
                          <div className="flex gap-2">
                            <Input
                              placeholder={t("settings.enterISOName")}
                              value={newCustomISO}
                              onChange={(e) => setNewCustomISO(e.target.value)}
                              onKeyDown={async (e) => {
                                if (e.key === "Enter" && newCustomISO.trim()) {
                                  await saveISOStandard(
                                    newCustomISO.trim(),
                                    newCustomISO.trim(),
                                    true
                                  );
                                  setCustomISOs([
                                    ...customISOs,
                                    newCustomISO.trim(),
                                  ]);
                                  setSelectedISOs([
                                    ...selectedISOs,
                                    newCustomISO.trim(),
                                  ]);
                                  setNewCustomISO("");
                                }
                              }}
                            />
                            <Button
                              onClick={async () => {
                                if (newCustomISO.trim()) {
                                  await saveISOStandard(
                                    newCustomISO.trim(),
                                    newCustomISO.trim(),
                                    true
                                  );
                                  setCustomISOs([
                                    ...customISOs,
                                    newCustomISO.trim(),
                                  ]);
                                  setSelectedISOs([
                                    ...selectedISOs,
                                    newCustomISO.trim(),
                                  ]);
                                  setNewCustomISO("");
                                }
                              }}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              {t("settings.add")}
                            </Button>
                          </div>
                          {customISOs.length > 0 && (
                            <div className="space-y-2">
                              {customISOs.map((iso, index) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between p-2 border rounded"
                                >
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={selectedISOs.includes(iso)}
                                      onChange={async (e) => {
                                        if (e.target.checked) {
                                          await saveISOStandard(iso, iso, true);
                                          setSelectedISOs([
                                            ...selectedISOs,
                                            iso,
                                          ]);
                                        } else {
                                          await deleteISOStandard(iso);
                                          setSelectedISOs(
                                            selectedISOs.filter(
                                              (id) => id !== iso
                                            )
                                          );
                                        }
                                      }}
                                      className="w-4 h-4 cursor-pointer"
                                    />
                                    <span className="font-medium">{iso}</span>
                                    <Badge>{t("settings.custom")}</Badge>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={async () => {
                                      await deleteISOStandard(iso);
                                      setCustomISOs(
                                        customISOs.filter((_, i) => i !== index)
                                      );
                                      setSelectedISOs(
                                        selectedISOs.filter((id) => id !== iso)
                                      );
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Criteria Display */}
                        {selectedISOs.length > 0 && (
                          <div className="space-y-4 border-t pt-4">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">
                                {t("settings.criteriaForISOs")}
                              </h4>
                              <div className="flex gap-2">
                                <Button
                                  variant={
                                    criteriaView === "compact"
                                      ? "default"
                                      : "outline"
                                  }
                                  size="sm"
                                  onClick={() => setCriteriaView("compact")}
                                >
                                  {t("settings.compact")}
                                </Button>
                                <Button
                                  variant={
                                    criteriaView === "complete"
                                      ? "default"
                                      : "outline"
                                  }
                                  size="sm"
                                  onClick={() => setCriteriaView("complete")}
                                >
                                  {t("settings.complete")}
                                </Button>
                              </div>
                            </div>

                            <p className="text-sm text-muted-foreground mb-3">
                              {t("settings.criteriaNote")}
                            </p>

                            <div className="space-y-3">
                              {selectedISOs.map((isoId) => {
                                const iso = predefinedISOs.find(
                                  (i) => i.id === isoId
                                ) || { name: isoId, id: isoId };

                                // Get predefined criteria based on view mode
                                const baseCriteria = predefinedCriteria[isoId]
                                  ? predefinedCriteria[isoId][criteriaView]
                                  : [];

                                // Get custom criteria for this ISO
                                const isoCriteria = [
                                  ...baseCriteria,
                                  ...(customCriteria[isoId] || []),
                                ];

                                return (
                                  <div
                                    key={isoId}
                                    className="border rounded-lg p-4 bg-card"
                                  >
                                    <div className="flex items-center justify-between mb-3">
                                      <h5 className="font-medium text-base">
                                        {iso.name}
                                      </h5>
                                      <Badge
                                        variant="secondary"
                                        className="text-xs"
                                      >
                                        {isoCriteria.length}{" "}
                                        {t("settings.criteria")}
                                      </Badge>
                                    </div>
                                    <div className="space-y-2 mb-3">
                                      {isoCriteria.map((criterion, idx) => (
                                        <div
                                          key={idx}
                                          className="flex items-start gap-3 text-sm group hover:bg-muted/50 p-2 rounded"
                                        >
                                          <input
                                            type="checkbox"
                                            className="mt-0.5 w-4 h-4 cursor-pointer"
                                            id={`criterion-${isoId}-${idx}`}
                                          />
                                          <label
                                            htmlFor={`criterion-${isoId}-${idx}`}
                                            className="flex-1 cursor-pointer"
                                          >
                                            {criterion}
                                          </label>
                                          {/* Show delete button for custom criteria */}
                                          {idx >= baseCriteria.length && (
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                              onClick={() => {
                                                const newCustom = {
                                                  ...customCriteria,
                                                  [isoId]: (
                                                    customCriteria[isoId] || []
                                                  ).filter(
                                                    (_, i) =>
                                                      i !==
                                                      idx - baseCriteria.length
                                                  ),
                                                };
                                                setCustomCriteria(newCustom);
                                                toast({
                                                  title: "Criterion removed",
                                                  description:
                                                    "Custom criterion has been deleted.",
                                                });
                                              }}
                                            >
                                              <Trash2 className="w-3 h-3 text-destructive" />
                                            </Button>
                                          )}
                                        </div>
                                      ))}
                                    </div>

                                    {/* Add Custom Criterion */}
                                    {addingCriterionForISO === isoId ? (
                                      <div className="space-y-2 border-t pt-3">
                                        <Input
                                          placeholder={t(
                                            "settings.enterNewCriterion"
                                          )}
                                          value={newCriterionText}
                                          onChange={(e) =>
                                            setNewCriterionText(e.target.value)
                                          }
                                          onKeyDown={(e) => {
                                            if (
                                              e.key === "Enter" &&
                                              newCriterionText.trim()
                                            ) {
                                              const newCustom = {
                                                ...customCriteria,
                                                [isoId]: [
                                                  ...(customCriteria[isoId] ||
                                                    []),
                                                  newCriterionText.trim(),
                                                ],
                                              };
                                              setCustomCriteria(newCustom);
                                              setNewCriterionText("");
                                              setAddingCriterionForISO(null);
                                              toast({
                                                title: "Criterion added",
                                                description:
                                                  "Custom criterion has been added successfully.",
                                              });
                                            } else if (e.key === "Escape") {
                                              setNewCriterionText("");
                                              setAddingCriterionForISO(null);
                                            }
                                          }}
                                          autoFocus
                                        />
                                        <div className="flex gap-2">
                                          <Button
                                            size="sm"
                                            onClick={() => {
                                              if (newCriterionText.trim()) {
                                                const newCustom = {
                                                  ...customCriteria,
                                                  [isoId]: [
                                                    ...(customCriteria[isoId] ||
                                                      []),
                                                    newCriterionText.trim(),
                                                  ],
                                                };
                                                setCustomCriteria(newCustom);
                                                setNewCriterionText("");
                                                setAddingCriterionForISO(null);
                                                toast({
                                                  title: "Criterion added",
                                                  description:
                                                    "Custom criterion has been added successfully.",
                                                });
                                              }
                                            }}
                                          >
                                            <Save className="w-3 h-3 mr-1" />
                                            {t("common.save")}
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                              setNewCriterionText("");
                                              setAddingCriterionForISO(null);
                                            }}
                                          >
                                            <X className="w-3 h-3 mr-1" />
                                            {t("common.cancel")}
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <Button
                                        variant="link"
                                        size="sm"
                                        className="px-0 text-primary"
                                        onClick={() =>
                                          setAddingCriterionForISO(isoId)
                                        }
                                      >
                                        <Plus className="w-3 h-3 mr-1" />
                                        {t("settings.add")}
                                      </Button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                              <AlertTriangle className="w-4 h-4 text-muted-foreground mt-0.5" />
                              <p className="text-xs text-muted-foreground">
                                <strong>{t("common.note")}:</strong>{" "}
                                {t("settings.criteriaInfoNote")}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="w-5 h-5" />
                        Risikomatrix-Labels
                      </CardTitle>
                      <CardDescription>
                        Passe Achsen- und Ergebnisbeschriftungen an eure
                        Nomenklatur an.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6 p-6 bg-white rounded-lg border">
                        <div className="grid grid-cols-3 gap-6">
                          {/* Likelihood Column */}
                          <div>
                            <h4 className="font-medium mb-3">Likelihood</h4>
                            <div className="space-y-2">
                              <Input
                                defaultValue="Very unlikely"
                                className="bg-white border-gray-300"
                              />
                              <Input
                                defaultValue="unlikely"
                                className="bg-white border-gray-300"
                              />
                              <Input
                                defaultValue="possible"
                                className="bg-white border-gray-300"
                              />
                              <Input
                                defaultValue="probably"
                                className="bg-white border-gray-300"
                              />
                              <Input
                                defaultValue="very probably"
                                className="bg-white border-gray-300"
                              />
                            </div>
                          </div>

                          {/* Severity Column */}
                          <div>
                            <h4 className="font-medium mb-3">Severity</h4>
                            <div className="space-y-2">
                              <Input
                                defaultValue="very low"
                                className="bg-white border-gray-300"
                              />
                              <Input
                                defaultValue="low"
                                className="bg-white border-gray-300"
                              />
                              <Input
                                defaultValue="medium"
                                className="bg-white border-gray-300"
                              />
                              <Input
                                defaultValue="high"
                                className="bg-white border-gray-300"
                              />
                              <Input
                                defaultValue="very high"
                                className="bg-white border-gray-300"
                              />
                            </div>
                          </div>

                          {/* Result Column */}
                          <div>
                            <h4 className="font-medium mb-3">Result</h4>
                            <div className="space-y-2">
                              <Input
                                defaultValue="low"
                                className="bg-white border-gray-300"
                              />
                              <Input
                                defaultValue="medium"
                                className="bg-white border-gray-300"
                              />
                              <Input
                                defaultValue="high"
                                className="bg-white border-gray-300"
                              />
                              <Input
                                defaultValue="very high"
                                className="bg-white border-gray-300"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Color Configuration */}
                        <div className="grid grid-cols-4 gap-4 pt-4 border-t">
                          <div>
                            <label className="text-sm mb-2 block">
                              Farbe: Niedrig{" "}
                              <span className="text-red-600">low</span>
                            </label>
                            <div className="h-12 bg-green-500 rounded border-2 border-gray-300"></div>
                          </div>
                          <div>
                            <label className="text-sm mb-2 block">
                              Farbe: Mittel{" "}
                              <span className="text-red-600">medium</span>
                            </label>
                            <div className="h-12 bg-orange-500 rounded border-2 border-gray-300"></div>
                          </div>
                          <div>
                            <label className="text-sm mb-2 block">
                              Farbe: Hoch{" "}
                              <span className="text-red-600">high</span>
                            </label>
                            <div className="h-12 bg-red-500 rounded border-2 border-gray-300"></div>
                          </div>
                          <div>
                            <label className="text-sm mb-2 block">
                              Farbe: Sehr hoch{" "}
                              <span className="text-red-600">very high</span>
                            </label>
                            <div className="h-12 bg-red-800 rounded border-2 border-gray-300"></div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        Risk Assessment Intervals
                      </CardTitle>
                      <CardDescription>
                        Set up recurring risk assessment schedules
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-3">
                            Prüfintervalle & Fälligkeiten
                          </h4>
                          <p className="text-sm text-muted-foreground mb-4">
                            Define one or more interval options for GBU and
                            Audits.
                          </p>

                          {/* GBU Intervals */}
                          <div className="mb-4">
                            <Label className="mb-2 block">
                              GBU intervals (months)
                            </Label>
                            <div className="flex gap-2 mb-2">
                              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md">
                                <span className="text-sm">24 mo</span>
                                <button className="text-muted-foreground hover:text-foreground">
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Input
                                placeholder="e.g. 12"
                                className="max-w-[200px]"
                              />
                              <Button size="sm">
                                <Plus className="w-4 h-4 mr-1" />
                                Add
                              </Button>
                            </div>
                          </div>

                          {/* Audit Intervals */}
                          <div>
                            <Label className="mb-2 block">
                              Audit intervals (months)
                            </Label>
                            <div className="flex gap-2 mb-2">
                              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md">
                                <span className="text-sm">12 mo</span>
                                <button className="text-muted-foreground hover:text-foreground">
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Input
                                placeholder="e.g. 12"
                                className="max-w-[200px]"
                              />
                              <Button size="sm">
                                <Plus className="w-4 h-4 mr-1" />
                                Add
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Bell className="w-5 h-5" />
                        Notification Logic
                      </CardTitle>
                      <CardDescription>
                        Set up automated notifications and reminders
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-3">
                            Benachrichtigungslogik
                          </h4>
                          <p className="text-sm text-muted-foreground mb-4">
                            Define reminders in days before due dates
                          </p>

                          <div className="grid grid-cols-2 gap-6">
                            {/* Examinations */}
                            <div>
                              <Label className="mb-2 block">
                                Examinations (days before)
                              </Label>
                              <Input defaultValue="60" type="number" />
                            </div>

                            {/* Measures */}
                            <div>
                              <Label className="mb-2 block">
                                Measures (days before)
                              </Label>
                              <Input defaultValue="14" type="number" />
                            </div>

                            {/* Qualifications */}
                            <div>
                              <Label className="mb-2 block">
                                Qualifications (days before)
                              </Label>
                              <Input defaultValue="30" type="number" />
                            </div>

                            {/* Audits */}
                            <div>
                              <Label className="mb-2 block">
                                Audits (days before)
                              </Label>
                              <Input defaultValue="30" type="number" />
                            </div>

                            {/* GBU review */}
                            <div>
                              <Label className="mb-2 block">
                                GBU review (days before)
                              </Label>
                              <Input defaultValue="60" type="number" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Tab 6: Occupational Medical Care */}
              <TabsContent value="medical-care">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Stethoscope className="w-5 h-5" />
                      {t("gcode.title")}
                    </CardTitle>
                    <CardDescription>{t("gcode.description")}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                          { code: "G 1.1", key: "G1.1" },
                          { code: "G 1.2", key: "G1.2" },
                          { code: "G 1.3", key: "G1.3" },
                          { code: "G 1.4", key: "G1.4" },
                          { code: "G 2", key: "G2" },
                          { code: "G 3", key: "G3" },
                          { code: "G 4", key: "G4" },
                          { code: "G 5", key: "G5" },
                          { code: "G 6", key: "G6" },
                          { code: "G 7", key: "G7" },
                          { code: "G 8", key: "G8" },
                          { code: "G 9", key: "G9" },
                          { code: "G 10", key: "G10" },
                          { code: "G 11", key: "G11" },
                          { code: "G 12", key: "G12" },
                          { code: "G 13", key: "G13" },
                          { code: "G 14", key: "G14" },
                          { code: "G 15", key: "G15" },
                          { code: "G 16", key: "G16" },
                          { code: "G 17", key: "G17" },
                          { code: "G 18", key: "G18" },
                          { code: "G 19", key: "G19" },
                          { code: "G 20", key: "G20" },
                          { code: "G 21", key: "G21" },
                          { code: "G 22", key: "G22" },
                          { code: "G 23", key: "G23" },
                          { code: "G 24", key: "G24" },
                          { code: "G 25", key: "G25" },
                          { code: "G 26", key: "G26" },
                          { code: "G 27", key: "G27" },
                          { code: "G 28", key: "G28" },
                          { code: "G 29", key: "G29" },
                          { code: "G 30", key: "G30" },
                          { code: "G 31", key: "G31" },
                          { code: "G 32", key: "G32" },
                          { code: "G 33", key: "G33" },
                          { code: "G 34", key: "G34" },
                          { code: "G 35", key: "G35" },
                          { code: "G 36", key: "G36" },
                          { code: "G 37", key: "G37" },
                          { code: "G 38", key: "G38" },
                          { code: "G 39", key: "G39" },
                          { code: "G 40", key: "G40" },
                          { code: "G 41", key: "G41" },
                          { code: "G 42", key: "G42" },
                          { code: "G 43", key: "G43" },
                          { code: "G 44", key: "G44" },
                          { code: "G 45", key: "G45" },
                          { code: "G 46", key: "G46" },
                        ].map((item) => (
                          <div
                            key={item.code}
                            className="flex items-start space-x-3 p-2 hover:bg-muted/30 rounded"
                          >
                            <input
                              type="checkbox"
                              id={item.code.replace(/\s/g, "-")}
                              className="w-4 h-4 cursor-pointer mt-1 flex-shrink-0"
                              checked={selectedGInvestigations.includes(
                                item.code
                              )}
                              onChange={() => toggleGInvestigation(item.code)}
                            />
                            <label
                              htmlFor={item.code.replace(/\s/g, "-")}
                              className="text-sm cursor-pointer flex-1"
                            >
                              <span className="font-medium">{item.code}</span>{" "}
                              {t(`gcode.${item.key}`)}
                            </label>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-end pt-4 border-t">
                        <Button onClick={saveGInvestigations}>
                          <CheckSquare className="w-4 h-4 mr-2" />
                          {t("gcode.saveButton")}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab 7: API Integration */}
              <TabsContent value="api-integration">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Plug className="w-5 h-5" />
                      {t("settings.apiIntegration")}
                    </CardTitle>
                    <CardDescription>
                      {t("settings.apiIntegrationDesc")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="api-token">
                            {t("settings.apiToken")}
                          </Label>
                          <div className="flex gap-2 mt-2">
                            <Input
                              id="api-token"
                              type="password"
                              value="••••••••••••••••••••••••••••••••"
                              readOnly
                              className="font-mono"
                            />
                            <Button variant="outline">
                              <Plus className="w-4 h-4 mr-2" />
                              {t("settings.generateNewToken")}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {t("settings.apiTokenDesc")}
                          </p>
                        </div>

                        <div>
                          <Label>{t("settings.apiDocumentation")}</Label>
                          <div className="p-4 border rounded-lg mt-2">
                            <p className="text-sm mb-2">
                              {t("settings.baseUrl")}{" "}
                              <code className="bg-muted px-2 py-1 rounded">
                                https://api.hsehub.com/v1
                              </code>
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {t("settings.apiDocsDesc")}
                            </p>
                            <Button variant="link" className="px-0 mt-2">
                              {t("settings.viewApiDocs")}
                            </Button>
                          </div>
                        </div>

                        <div>
                          <Label>{t("settings.connectedSystems")}</Label>
                          <div className="rounded-md border mt-2">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>
                                    {t("settings.systemName")}
                                  </TableHead>
                                  <TableHead>{t("common.status")}</TableHead>
                                  <TableHead>
                                    {t("settings.lastSync")}
                                  </TableHead>
                                  <TableHead className="text-right">
                                    {t("common.actions")}
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                <TableRow>
                                  <TableCell
                                    colSpan={4}
                                    className="text-center py-8 text-muted-foreground"
                                  >
                                    {t("settings.noSystemsConnected")}
                                  </TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Add External System
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}
