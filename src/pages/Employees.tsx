import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
// Removed unused import for Tables
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Plus, Search } from "lucide-react";
import { RefreshAuthButton } from "@/components/RefreshAuthButton";

interface Employee {
  id: string;
  employee_number: string;
  full_name: string;
  email: string;
  department_id: string | null;
  hire_date: string | null;
  is_active: boolean;
  departments: { id: string; name: string } | null;
  job_roles: { title: string } | null;
  exposure_groups: { name: string } | null;
}

export default function Employees() {
  const { companyId, userRole, loading, user } = useAuth();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null
  );
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    employee_number: "",
    first_name: "",
    last_name: "",
    email: "",
    hire_date: "",
    department_id: "",
    job_role: "",
  });

  // Filters
  const [filterActive, setFilterActive] = useState<string>("all");
  const [filterDepartment, setFilterDepartment] = useState<string>("all");
  const [departments, setDepartments] = useState<any[]>([]);

  useEffect(() => {
    // Debug logging
    console.log("Employees page - Auth state:", {
      loading,
      user: user?.email,
      userId: user?.id,
      userRole,
      companyId,
    });

    if (!loading && !user) {
      navigate("/auth");
      return;
    }

    if (companyId) {
      fetchEmployees();
      fetchDepartments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, loading, user, navigate]);

  const fetchDepartments = async () => {
    if (!companyId) return;
    const { data, error } = await supabase
      .from("departments")
      .select("id, name")
      .eq("company_id", companyId);

    if (!error && data) {
      setDepartments(data);
    }
  };

  const fetchEmployees = async () => {
    if (!companyId) return;
    const { data, error } = await supabase
      .from("employees")
      .select(
        `
        *,
        departments(name),
        job_roles(title),
        exposure_groups(name)
      `
      )
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load employees");
      console.error(error);
    } else {
      setEmployees((data as Employee[]) || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log("Submit - Auth state:", {
      user: user?.email,
      userRole,
      companyId,
    });

    if (!companyId) {
      toast.error(
        "No company ID found. You need to be assigned to a company first."
      );
      console.error("Missing companyId. User:", user?.email, "Role:", userRole);
      console.error(
        "Please check user_roles table in Supabase for user_id:",
        user?.id
      );
      return;
    }

    setIsSubmitting(true);
    try {
      // If job role is provided, try to find or create it
      let jobRoleId: string | null = null;
      if (formData.job_role && formData.job_role.trim()) {
        const jobRoleTitle = formData.job_role.trim();

        // Check if job role exists
        const { data: existingRole } = await supabase
          .from("job_roles")
          .select("id")
          .eq("company_id", companyId)
          .eq("title", jobRoleTitle)
          .maybeSingle();

        if (existingRole) {
          jobRoleId = existingRole.id;
        } else {
          // Create new job role
          const { data: newRole, error: roleError } = await supabase
            .from("job_roles")
            .insert({
              company_id: companyId,
              title: jobRoleTitle,
            })
            .select("id")
            .single();

          if (roleError) {
            console.error("Error creating job role:", roleError);
            toast.error("Failed to create job role: " + roleError.message);
            return;
          }

          jobRoleId = newRole.id;
        }
      }

      // Insert employee (combine first_name and last_name into full_name for DB)
      const fullName = `${formData.first_name.trim()} ${formData.last_name.trim()}`;

      const { data, error } = await supabase.from("employees").insert({
        employee_number: formData.employee_number,
        full_name: fullName,
        email: formData.email || null,
        hire_date: formData.hire_date || null,
        job_role_id: jobRoleId,
        department_id: formData.department_id || null,
        exposure_group_id: null,
        is_active: true,
        company_id: companyId,
      });

      if (error) {
        const details =
          (error && (error.message || (error as any).details)) ||
          "Unknown error";
        toast.error("Failed to add employee: " + details);
        console.error("Add employee error:", error);
        return;
      }

      toast.success("Employee added successfully");
      setIsDialogOpen(false);
      setFormData({
        employee_number: "",
        first_name: "",
        last_name: "",
        email: "",
        hire_date: "",
        department_id: "",
        job_role: "",
      });
      fetchEmployees();
      return data;
    } catch (err) {
      console.error("Unexpected error adding employee:", err);
      toast.error("Failed to add employee");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewEmployee = async (employee: Employee) => {
    const { data } = await supabase
      .from("employees")
      .select(
        `
        *,
        departments(name),
        job_roles(title),
        exposure_groups(name)
      `
      )
      .eq("id", employee.id)
      .single();

    setSelectedEmployee((data as Employee) || null);
    setIsSheetOpen(true);
  };

  const filteredEmployees = employees.filter((emp) => {
    // Search filter
    const matchesSearch =
      emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.email &&
        emp.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      emp.employee_number.toLowerCase().includes(searchTerm.toLowerCase());

    // Active status filter
    const matchesActive =
      filterActive === "all" ||
      (filterActive === "active" && emp.is_active) ||
      (filterActive === "inactive" && !emp.is_active);

    // Department filter
    const matchesDepartment =
      filterDepartment === "all" || emp.department_id === filterDepartment;

    return matchesSearch && matchesActive && matchesDepartment;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>

        {/* Setup warning */}
        {!companyId && user && !loading && (
          <Card className="mb-4 border-orange-500 bg-orange-50 dark:bg-orange-950">
            <CardHeader>
              <CardTitle className="text-orange-700 dark:text-orange-300">
                ⚠️ Company Setup Required
              </CardTitle>
              <CardDescription className="text-orange-600 dark:text-orange-400">
                Your account is not linked to a company. If you just created a
                company, please <strong>sign out and sign back in</strong> to
                refresh your session.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <RefreshAuthButton />
                <Button
                  onClick={() => {
                    console.log("Signing out to refresh auth state...");
                    navigate("/auth");
                    window.location.href = "/auth"; // Force reload
                  }}
                  variant="default"
                  size="sm"
                >
                  Sign Out & Refresh
                </Button>
                <Button
                  onClick={() => navigate("/setup-company")}
                  variant="outline"
                  size="sm"
                  className="border-orange-600 text-orange-700"
                >
                  Set Up Company
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Logged in as: {user.email}
              </p>
              <p className="text-xs text-orange-600 dark:text-orange-400 font-mono">
                Debug: User ID: {user.id?.substring(0, 8)}... | Company ID:{" "}
                {companyId?.substring(0, 8) || "null"} | Role:{" "}
                {userRole || "null"}
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Employees</CardTitle>
                <CardDescription>
                  Manage your company's employee records
                </CardDescription>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Employee
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Employee</DialogTitle>
                    <DialogDescription>
                      Enter employee details below
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4 p-4">
                    <div className="space-y-2">
                      <Label htmlFor="employee_number">Employee Number *</Label>
                      <Input
                        id="employee_number"
                        value={formData.employee_number}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            employee_number: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="first_name">First Name *</Label>
                      <Input
                        id="first_name"
                        value={formData.first_name}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            first_name: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">Last Name *</Label>
                      <Input
                        id="last_name"
                        value={formData.last_name}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            last_name: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email (Optional)</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="job_role">Job Role</Label>
                      <Input
                        id="job_role"
                        placeholder="Enter job role (e.g., Safety Officer)"
                        value={formData.job_role}
                        onChange={(e) =>
                          setFormData({ ...formData, job_role: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="department">Department</Label>
                      <Select
                        value={formData.department_id}
                        onValueChange={(value) =>
                          setFormData({ ...formData, department_id: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Hire Date</Label>
                      <Input
                        type="date"
                        value={formData.hire_date}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            hire_date: e.target.value,
                          })
                        }
                      />
                    </div>

                    <DialogFooter className="pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Adding..." : "Add Employee"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="flex-1">
                <Label className="text-xs mb-1">Status Filter</Label>
                <Select value={filterActive} onValueChange={setFilterActive}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    <SelectItem value="active">Active Only</SelectItem>
                    <SelectItem value="inactive">Inactive Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label className="text-xs mb-1">Department Filter</Label>
                <Select
                  value={filterDepartment}
                  onValueChange={setFilterDepartment}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Search Bar */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search employees..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee #</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Job Role</TableHead>
                    <TableHead>Hire Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No employees found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEmployees.map((employee) => (
                      <TableRow
                        key={employee.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => navigate(`/employees/${employee.id}`)}
                      >
                        <TableCell>{employee.employee_number}</TableCell>
                        <TableCell className="font-medium">
                          {employee.full_name}
                        </TableCell>
                        <TableCell>{employee.email || "-"}</TableCell>
                        <TableCell>
                          {employee.departments?.name || "-"}
                        </TableCell>
                        <TableCell>
                          {employee.job_roles?.title || "-"}
                        </TableCell>
                        <TableCell>{employee.hire_date || "-"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              employee.is_active ? "default" : "secondary"
                            }
                          >
                            {employee.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{selectedEmployee?.full_name}</SheetTitle>
              <SheetDescription>Employee Details & Records</SheetDescription>
            </SheetHeader>

            <Tabs defaultValue="info" className="mt-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="info">Info</TabsTrigger>
                <TabsTrigger value="risk">Risk Profile</TabsTrigger>
                <TabsTrigger value="training">Training</TabsTrigger>
                <TabsTrigger value="tasks">Tasks</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Employee #</p>
                    <p className="font-medium">
                      {selectedEmployee?.employee_number}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedEmployee?.email}</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Hire Date</p>
                    <p className="font-medium">
                      {selectedEmployee?.hire_date || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Department</p>
                    <p className="font-medium">
                      {selectedEmployee?.departments?.name || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Job Role</p>
                    <p className="font-medium">
                      {selectedEmployee?.job_roles?.title || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Exposure Group
                    </p>
                    <p className="font-medium">
                      {selectedEmployee?.exposure_groups?.name || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge
                      variant={
                        selectedEmployee?.is_active ? "default" : "secondary"
                      }
                    >
                      {selectedEmployee?.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="risk" className="mt-4">
                <p className="text-sm text-muted-foreground">
                  Risk assessments assigned to this employee will appear here.
                </p>
              </TabsContent>

              <TabsContent value="training" className="mt-4">
                <p className="text-sm text-muted-foreground">
                  Training records for this employee will appear here.
                </p>
              </TabsContent>

              <TabsContent value="tasks" className="mt-4">
                <p className="text-sm text-muted-foreground">
                  Tasks assigned to this employee will appear here.
                </p>
              </TabsContent>
            </Tabs>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
