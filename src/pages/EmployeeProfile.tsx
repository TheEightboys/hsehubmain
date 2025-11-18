import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
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
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface EmployeeData {
  id: string;
  employee_number: string;
  full_name: string;
  email: string;
  hire_date: string | null;
  department_id: string | null;
  job_role_id: string | null;
  is_active: boolean;
  departments?: { id: string; name: string } | null;
  job_roles?: { id: string; title: string } | null;
}

interface HealthCheckup {
  id: string;
  checkup_date: string;
  status: string;
  notes: string | null;
  next_checkup_date: string | null;
}

interface Document {
  id: string;
  name: string;
  file_url: string;
  uploaded_at: string;
  file_type: string;
}

interface ActivityLog {
  id: string;
  action: string;
  changed_by: string;
  changed_at: string;
  details: string | null;
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
  const { companyId } = useAuth();

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
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);

  // Custom input states
  const [customDepartment, setCustomDepartment] = useState("");
  const [customJobRole, setCustomJobRole] = useState("");

  useEffect(() => {
    if (id && companyId) {
      fetchEmployeeData();
      fetchDropdownData();
      fetchHealthCheckups();
      fetchDocuments();
      fetchActivityLogs();
      fetchTrainings();
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
          job_roles (id, title)
        `
        )
        .eq("id", id)
        .single();

      if (error) throw error;

      setEmployee(data as any);
      setFormData(data as any);

      // Split full_name into first and last name
      if (data.full_name) {
        const nameParts = data.full_name.trim().split(" ");
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
      const [depts, roles] = await Promise.all([
        supabase
          .from("departments")
          .select("id, name")
          .eq("company_id", companyId),
        supabase
          .from("job_roles")
          .select("id, title")
          .eq("company_id", companyId),
      ]);

      setDepartments(depts.data || []);
      setJobRoles(roles.data || []);
    } catch (error) {
      console.error("Error fetching dropdown data:", error);
    }
  };

  const fetchHealthCheckups = async () => {
    try {
      const { data, error } = await supabase
        .from("medical_records")
        .select("*")
        .eq("employee_id", id)
        .order("checkup_date", { ascending: false });

      if (error) throw error;
      setHealthCheckups((data as any) || []);
    } catch (error) {
      console.error("Error fetching health checkups:", error);
    }
  };

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("employee_documents")
        .select("*")
        .eq("employee_id", id)
        .order("uploaded_at", { ascending: false });

      if (error) throw error;
      setDocuments((data as any) || []);
    } catch (error) {
      console.error("Error fetching documents:", error);
    }
  };

  const fetchActivityLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("employee_activity_logs")
        .select("*")
        .eq("employee_id", id)
        .order("changed_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setActivityLogs((data as any) || []);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
    }
  };

  const fetchTrainings = async () => {
    try {
      const { data, error } = await supabase
        .from("training_records")
        .select(
          `
          *,
          training_types (name)
        `
        )
        .eq("employee_id", id)
        .order("assigned_date", { ascending: false });

      if (error) throw error;
      setTrainings((data as any) || []);
    } catch (error) {
      console.error("Error fetching trainings:", error);
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
      }
      // Handle custom inputs
      else if (field === "department_id" && customDepartment) {
        // Create new department
        const { data: newDept, error: deptError } = await supabase
          .from("departments")
          .insert({ name: customDepartment, company_id: companyId })
          .select()
          .single();

        if (deptError) throw deptError;
        updateData.department_id = newDept.id;
        setCustomDepartment("");
      } else if (field === "job_role_id" && customJobRole) {
        // Create new job role
        const { data: newRole, error: roleError } = await supabase
          .from("job_roles")
          .insert({ title: customJobRole, company_id: companyId })
          .select()
          .single();

        if (roleError) throw roleError;
        updateData.job_role_id = newRole.id;
        setCustomJobRole("");
      } else {
        updateData[field] = formData[field as keyof EmployeeData];
      }

      const { error } = await supabase
        .from("employees")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;

      // Log the change
      await supabase.from("employee_activity_logs").insert({
        employee_id: id,
        action: `Updated ${field}`,
        changed_by: "Current User",
        changed_at: new Date().toISOString(),
        details: `Changed ${field} to ${updateData[field]}`,
      });

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
    setCustomDepartment("");
    setCustomJobRole("");
  };

  const handleDocumentUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${id}/${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("employee-documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("employee-documents").getPublicUrl(fileName);

      // Save document record
      const { error: dbError } = await supabase
        .from("employee_documents")
        .insert({
          employee_id: id,
          name: file.name,
          file_url: publicUrl,
          file_type: file.type,
          uploaded_at: new Date().toISOString(),
        });

      if (dbError) throw dbError;

      toast.success("Document uploaded successfully");
      fetchDocuments();
    } catch (error) {
      console.error("Error uploading document:", error);
      toast.error("Failed to upload document");
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
        <div className="flex items-center justify-between">
          <Label className="text-sm text-muted-foreground">{label}</Label>
          {!isEditing ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFieldEdit(field)}
              className="h-6 px-2"
            >
              <Edit2 className="w-3 h-3" />
            </Button>
          ) : (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleFieldSave(field)}
                className="h-6 px-2"
              >
                <Save className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleFieldCancel(field)}
                className="h-6 px-2"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>

        {!isEditing ? (
          <p className="font-medium">{displayValue || "-"}</p>
        ) : type === "select" && options ? (
          <div className="space-y-2">
            <Select
              value={formData[field as keyof EmployeeData] as string}
              onValueChange={(val) =>
                setFormData({ ...formData, [field]: val })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={`Select ${label}`} />
              </SelectTrigger>
              <SelectContent>
                {options.map((opt) => (
                  <SelectItem key={opt.id || opt} value={opt.id || opt}>
                    {opt.name || opt.title || opt.full_name || opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(field === "department_id" || field === "job_role_id") && (
              <div>
                <Label className="text-xs">Or enter manually:</Label>
                <Input
                  placeholder={`Type custom ${label.toLowerCase()}`}
                  value={
                    field === "department_id" ? customDepartment : customJobRole
                  }
                  onChange={(e) => {
                    if (field === "department_id")
                      setCustomDepartment(e.target.value);
                    else if (field === "job_role_id")
                      setCustomJobRole(e.target.value);
                  }}
                  className="mt-1"
                />
              </div>
            )}
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
          />
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-[1400px]">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/employees")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{employee.full_name}</h1>
              <p className="text-muted-foreground">
                Employee #{employee.employee_number}
              </p>
            </div>
          </div>
          <Badge variant={employee.is_active ? "default" : "secondary"}>
            {employee.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="info" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="info">Info</TabsTrigger>
            <TabsTrigger value="risk-profile">Risk Profile</TabsTrigger>
            <TabsTrigger value="training">Training</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
          </TabsList>

          {/* Info Tab - Enhanced */}
          <TabsContent value="info" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Personal Info */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Employee Details & Records</CardTitle>
                  <CardDescription>
                    Every field is easily changeable by click
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {renderEditableField("employee_number", "Employee #", employee.employee_number)}
                    {renderEditableField("email", "Email", employee.email)}
                    {renderEditableField("first_name", "First Name", firstName)}
                    {renderEditableField("last_name", "Last Name", lastName)}
                    {renderEditableField("hire_date", "Hire Date", employee.hire_date, "date")}
                    {renderEditableField("department_id", "Department", employee.departments?.name, "select", departments)}
                    {renderEditableField("job_role_id", "Job Title", employee.job_roles?.title, "select", jobRoles)}
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Line Manager</Label>
                      <p className="font-medium">-</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Location</Label>
                      <p className="font-medium">-</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Position</Label>
                      <p className="font-medium">-</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Right Column - Activity & Documents */}
              <div className="space-y-6">
                {/* Activity Log */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Activity</CardTitle>
                    <CardDescription className="text-xs">
                      Track all changes made to this employee
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[200px] pr-4">
                      {activityLogs.length === 0 ? (
                        <p className="text-center text-muted-foreground text-sm py-4">
                          No activity logs
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {activityLogs.slice(0, 5).map((log) => (
                            <div key={log.id} className="border-l-2 border-primary pl-3 pb-3">
                              <p className="text-sm font-medium">{log.action}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(log.changed_at).toLocaleDateString()} by {log.changed_by}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Health Check-Ups */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">Health Check-Ups</CardTitle>
                        <CardDescription className="text-xs">
                          Medical examination records
                        </CardDescription>
                      </div>
                      <Button size="sm" variant="outline">
                        <Heart className="w-3 h-3 mr-1" />
                        Add
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {healthCheckups.length === 0 ? (
                      <p className="text-center text-muted-foreground text-sm py-4">
                        No health check-ups
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {healthCheckups.slice(0, 3).map((checkup) => (
                          <div key={checkup.id} className="p-2 border rounded text-sm">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">
                                {new Date(checkup.checkup_date).toLocaleDateString()}
                              </span>
                              <Badge variant="secondary" className="text-xs">{checkup.status}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Documents */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">Documents</CardTitle>
                        <CardDescription className="text-xs">
                          Can be uploaded to the employee
                        </CardDescription>
                      </div>
                      <Button size="sm" variant="outline" asChild>
                        <label htmlFor="file-upload-small" className="cursor-pointer">
                          <Upload className="w-3 h-3 mr-1" />
                          Upload
                          <input
                            id="file-upload-small"
                            type="file"
                            className="hidden"
                            onChange={handleDocumentUpload}
                          />
                        </label>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {documents.length === 0 ? (
                      <p className="text-center text-muted-foreground text-sm py-4">
                        No documents
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {documents.slice(0, 3).map((doc) => (
                          <div key={doc.id} className="flex items-center gap-2 p-2 border rounded text-sm hover:bg-muted/50">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <span className="flex-1 truncate">{doc.name}</span>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" asChild>
                              <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                                <Download className="w-3 h-3" />
                              </a>
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Risk Profile Tab */}
          <TabsContent value="risk-profile">
            <Card>
              <CardHeader>
                <CardTitle>Risk Assessment Profile</CardTitle>
                <CardDescription>
                  Risk assessments and safety measures assigned to this employee
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground py-8">
                  Risk profile data will be displayed here
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Training Tab */}
          <TabsContent value="training">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Training Records</CardTitle>
                    <CardDescription>
                      Assigned and completed trainings
                    </CardDescription>
                  </div>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Assign Training
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-3">Assigned Trainings</h3>
                    {trainings.filter((t) => t.status === "assigned").length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        No assigned trainings
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Training</TableHead>
                            <TableHead>Assigned</TableHead>
                            <TableHead>Expiry</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {trainings
                            .filter((t) => t.status === "assigned")
                            .map((training) => (
                              <TableRow key={training.id}>
                                <TableCell>
                                  {(training as any).training_types?.name || training.training_type}
                                </TableCell>
                                <TableCell>
                                  {new Date(training.assigned_date).toLocaleDateString()}
                                </TableCell>
                                <TableCell>
                                  {training.expiry_date
                                    ? new Date(training.expiry_date).toLocaleDateString()
                                    : "-"}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary">{training.status}</Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Completed Trainings</h3>
                    {trainings.filter((t) => t.status === "completed").length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        No completed trainings
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Training</TableHead>
                            <TableHead>Completed</TableHead>
                            <TableHead>Expiry</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {trainings
                            .filter((t) => t.status === "completed")
                            .map((training) => (
                              <TableRow key={training.id}>
                                <TableCell>
                                  {(training as any).training_types?.name || training.training_type}
                                </TableCell>
                                <TableCell>
                                  {training.completion_date
                                    ? new Date(training.completion_date).toLocaleDateString()
                                    : "-"}
                                </TableCell>
                                <TableCell>
                                  {training.expiry_date
                                    ? new Date(training.expiry_date).toLocaleDateString()
                                    : "-"}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="default">{training.status}</Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Tasks</CardTitle>
                    <CardDescription>
                      You write tasks which will be displayed in the dashboard of the employee
                    </CardDescription>
                  </div>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Task
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Task</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No tasks assigned yet. Create tasks to track employee responsibilities.
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
