import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Building2,
  AlertTriangle,
  Clock,
  Shield,
  CheckSquare,
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
import { Switch } from "@/components/ui/switch";

const baseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

export default function Settings() {
  const { user, loading, companyId, userRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loadingData, setLoadingData] = useState(false);
  const [activeTab, setActiveTab] = useState("departments");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteItem, setDeleteItem] = useState<any>(null);
  const [currentTableName, setCurrentTableName] = useState("");
  const [forceDialogOpen, setForceDialogOpen] = useState(false);

  // State for each master data type
  const [departments, setDepartments] = useState<any[]>([]);
  const [jobRoles, setJobRoles] = useState<any[]>([]);
  const [exposureGroups, setExposureGroups] = useState<any[]>([]);
  const [riskCategories, setRiskCategories] = useState<any[]>([]);
  const [trainingTypes, setTrainingTypes] = useState<any[]>([]);
  const [auditCategories, setAuditCategories] = useState<any[]>([]);

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
    }
  }, [user, loading, navigate, companyId]);

  const fetchAllData = async () => {
    if (!companyId) return;

    setLoadingData(true);
    try {
      const [depts, roles, exposure, risk, training, audit] = await Promise.all(
        [
          supabase.from("departments").select("*").eq("company_id", companyId),
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
        ]
      );

      setDepartments(depts.data || []);
      setJobRoles(roles.data || []);
      setExposureGroups(exposure.data || []);
      setRiskCategories(risk.data || []);
      setTrainingTypes(training.data || []);
      setAuditCategories(audit.data || []);
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
        const { error } = await supabase
          .from(tableName)
          .update(payload)
          .eq("id", editingItem.id)
          .eq("company_id", companyId);

        if (error) throw error;
        toast({ title: "Success", description: "Item updated successfully" });
      } else {
        // Create new item
        const { error } = await supabase.from(tableName).insert([
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

  const saveRolePermissions = async () => {
    try {
      toast({
        title: "Success",
        description: "Role permissions saved successfully",
      });
      console.log("Saved role permissions:", roles);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save role permissions",
        variant: "destructive",
      });
    }
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

  const togglePermission = (roleName: string, permission: string) => {
    setRoles((prev) => ({
      ...prev,
      [roleName]: {
        ...prev[roleName],
        [permission]:
          !prev[roleName][permission as keyof (typeof prev)[typeof roleName]],
      },
    }));
  };

  const toggleAllPermissions = (roleName: string, value: boolean) => {
    setRoles((prev) => ({
      ...prev,
      [roleName]: {
        dashboard: value,
        employees: value,
        healthCheckups: value,
        documents: value,
        reports: value,
        audits: value,
        settings: value,
      },
    }));
  };

  const addCustomRole = () => {
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

    setRoles((prev) => ({
      ...prev,
      [customRoleName]: {
        dashboard: false,
        employees: false,
        healthCheckups: false,
        documents: false,
        reports: false,
        audits: false,
        settings: false,
      },
    }));

    setCustomRoleName("");
    setIsAddingCustomRole(false);
    toast({
      title: "Success",
      description: `Role "${customRoleName}" created successfully`,
    });
  };

  const deleteCustomRole = (roleName: string) => {
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

    setRoles((prev) => {
      const newRoles = { ...prev };
      delete newRoles[roleName];
      return newRoles;
    });

    toast({
      title: "Success",
      description: `Role "${roleName}" deleted successfully`,
    });
  };

  const renderUserRolesTab = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>User Roles & Permissions (RBAC)</CardTitle>
            <CardDescription>
              Define roles and their access permissions across the system
            </CardDescription>
          </div>
          <Button onClick={() => setIsAddingCustomRole(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Custom Role
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Add Custom Role Dialog */}
        <Dialog open={isAddingCustomRole} onOpenChange={setIsAddingCustomRole}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Custom Role</DialogTitle>
              <DialogDescription>
                Enter a name for the new role. You can configure permissions
                after creation.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Input
                  placeholder="Role name (e.g., Project Manager)"
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
                Cancel
              </Button>
              <Button onClick={addCustomRole}>Create Role</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Permission Grid */}
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px] sticky left-0 bg-background z-10">
                  Role
                </TableHead>
                <TableHead className="text-center">Dashboard</TableHead>
                <TableHead className="text-center">Employees</TableHead>
                <TableHead className="text-center">Health Check-Ups</TableHead>
                <TableHead className="text-center">Documents</TableHead>
                <TableHead className="text-center">Reports</TableHead>
                <TableHead className="text-center">Audits</TableHead>
                <TableHead className="text-center">Settings</TableHead>
                <TableHead className="text-center">Actions</TableHead>
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
                const allEnabled = Object.values(permissions).every((p) => p);
                const allDisabled = Object.values(permissions).every((p) => !p);

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
                      <div className="flex items-center justify-center gap-4">
                        <div className="flex items-center gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Switch
                                checked={allEnabled}
                                onCheckedChange={(val) =>
                                  toggleAllPermissions(roleName, !!val)
                                }
                                className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-gray-200"
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              Toggle all permissions for {roleName}
                            </TooltipContent>
                          </Tooltip>
                          <span
                            className={`text-sm font-medium ${
                              allEnabled
                                ? "text-blue-600"
                                : "text-muted-foreground"
                            }`}
                          >
                            {allEnabled ? "All ON" : "All OFF"}
                          </span>
                        </div>

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
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={saveRolePermissions}>
            <Save className="w-4 h-4 mr-2" />
            Save All Changes
          </Button>
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
              <h1 className="text-xl font-bold">Settings</h1>
              <p className="text-xs text-muted-foreground">
                System Configuration
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-8 mb-8">
            <TabsTrigger value="departments">Departments</TabsTrigger>
            <TabsTrigger value="job-roles">Job Roles</TabsTrigger>
            <TabsTrigger value="exposure-groups">Exposure Groups</TabsTrigger>
            <TabsTrigger value="risk-categories">Risk Categories</TabsTrigger>
            <TabsTrigger value="training-types">Training Types</TabsTrigger>
            <TabsTrigger value="audit-categories">Audit Categories</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="user-roles" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              User Roles
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Departments */}
          <TabsContent value="departments" className="mt-6">
            {renderTable(departments, "Departments")}
          </TabsContent>

          {/* Tab 2: Job Roles */}
          <TabsContent value="job-roles" className="mt-6">
            {renderTable(jobRoles, "Job Roles")}
          </TabsContent>

          {/* Tab 3: Exposure Groups */}
          <TabsContent value="exposure-groups" className="mt-6">
            {renderTable(exposureGroups, "Exposure Groups")}
          </TabsContent>

          {/* Tab 4: Risk Categories */}
          <TabsContent value="risk-categories" className="mt-6">
            {renderTable(riskCategories, "Risk Categories")}
          </TabsContent>

          {/* Tab 5: Training Types */}
          <TabsContent value="training-types" className="mt-6">
            {renderTable(trainingTypes, "Training Types")}
          </TabsContent>

          {/* Tab 6: Audit Categories */}
          <TabsContent value="audit-categories" className="mt-6">
            {renderTable(auditCategories, "Audit Categories")}
          </TabsContent>

          {/* Tab 7: Team Management */}
          <TabsContent value="team" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Team Management</CardTitle>
                    <CardDescription>
                      Direct employees to this software - Manage team members, their access, and user roles
                    </CardDescription>
                  </div>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Team Member
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div>
                      <Label>First Name</Label>
                      <Input placeholder="Enter first name" />
                    </div>
                    <div>
                      <Label>Last Name</Label>
                      <Input placeholder="Enter last name" />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input type="email" placeholder="Enter email" />
                    </div>
                    <div>
                      <Label>User Role</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="line_manager">Line Manager</SelectItem>
                          <SelectItem value="hse_manager">HSE Manager</SelectItem>
                          <SelectItem value="doctor">Doctor</SelectItem>
                          <SelectItem value="employee">Employee</SelectItem>
                          <SelectItem value="external">External</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No team members found. Add team members to invite them to the platform.
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 8: User Roles (RBAC) */}
          <TabsContent value="user-roles" className="mt-6">
            {renderUserRolesTab()}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
