import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
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
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, FileDown, Calendar, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Investigation {
  id: string;
  investigation_id: string;
  related_incident_id: string | null;
  start_date: string;
  assigned_to_id: string | null;
  status: "due" | "planned" | "completed";
  priority: "low" | "medium" | "high" | "critical";
  description: string | null;
  findings: string | null;
  recommendations: string | null;
  g_code: string | null;
  appointment_date: string | null;
  due_date: string | null;
  doctor: string | null;
  assigned_to?: {
    full_name: string;
    employee_number: string;
    departments?: { name: string };
    exposure_groups?: { name: string };
  };
}

interface Employee {
  id: string;
  full_name: string;
  employee_number: string;
  departments?: { id: string; name: string } | null;
  exposure_groups?: { id: string; name: string } | null;
}

interface Department {
  id: string;
  name: string;
}

interface ExposureGroup {
  id: string;
  name: string;
}

type ViewMode = "employee" | "date";

export default function Investigations() {
  const { user, loading, companyId } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>("employee");

  // Data states
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [exposureGroups, setExposureGroups] = useState<ExposureGroup[]>([]);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDepartment, setFilterDepartment] = useState<string>("all");
  const [filterLocation, setFilterLocation] = useState<string>("all");
  const [filterGroup, setFilterGroup] = useState<string>("all");
  const [filterCheckUpType, setFilterCheckUpType] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInvestigation, setEditingInvestigation] =
    useState<Investigation | null>(null);

  const [formData, setFormData] = useState({
    investigation_id: "",
    g_code: "",
    start_date: "",
    due_date: "",
    appointment_date: "",
    assigned_to_id: "",
    doctor: "",
    status: "planned" as "due" | "planned" | "completed",
    priority: "medium" as "low" | "medium" | "high" | "critical",
    description: "",
    findings: "",
    recommendations: "",
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (companyId) {
      fetchInvestigations();
      fetchEmployees();
      fetchDepartments();
      fetchExposureGroups();
    }
  }, [companyId]);

  const fetchInvestigations = async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from("investigations" as any)
        .select(
          `
          *,
          assigned_to:employees!assigned_to_id(
            full_name,
            employee_number,
            departments(name),
            exposure_groups(name)
          )
        `
        )
        .eq("company_id", companyId)
        .order("start_date", { ascending: false });

      if (error) throw error;
      setInvestigations((data as any) || []);
    } catch (error: any) {
      console.error("Error fetching investigations:", error);
    }
  };

  const fetchEmployees = async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from("employees")
        .select(
          `
          id,
          full_name,
          employee_number,
          departments(id, name),
          exposure_groups(id, name)
        `
        )
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("full_name");

      if (error) throw error;
      setEmployees((data as any) || []);
    } catch (error: any) {
      console.error("Error fetching employees:", error);
    }
  };

  const fetchDepartments = async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name")
        .eq("company_id", companyId)
        .order("name");

      if (error) throw error;
      setDepartments(data || []);
    } catch (error: any) {
      console.error("Error fetching departments:", error);
    }
  };

  const fetchExposureGroups = async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from("exposure_groups")
        .select("id, name")
        .eq("company_id", companyId)
        .order("name");

      if (error) throw error;
      setExposureGroups(data || []);
    } catch (error: any) {
      console.error("Error fetching exposure groups:", error);
    }
  };

  const generateInvestigationId = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    return `G-${year}${month}-${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;

    try {
      const investigationData = {
        company_id: companyId,
        investigation_id:
          formData.investigation_id || generateInvestigationId(),
        g_code: formData.g_code || null,
        start_date: formData.start_date || new Date().toISOString(),
        due_date: formData.due_date || null,
        appointment_date: formData.appointment_date || null,
        assigned_to_id:
          formData.assigned_to_id === "none"
            ? null
            : formData.assigned_to_id || null,
        doctor: formData.doctor || null,
        status: formData.status,
        priority: formData.priority,
        description: formData.description || null,
        findings: formData.findings || null,
        recommendations: formData.recommendations || null,
      };

      if (editingInvestigation) {
        const { error } = await (supabase as any)
          .from("investigations")
          .update(investigationData)
          .eq("id", editingInvestigation.id);

        if (error) throw error;
        toast({
          title: t("common.success"),
          description: t("investigations.updated"),
        });
      } else {
        const { error } = await supabase
          .from("investigations" as any)
          .insert(investigationData as any);

        if (error) throw error;
        toast({
          title: t("common.success"),
          description: t("investigations.created"),
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchInvestigations();
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message || t("common.savingError"),
        variant: "destructive",
      });
    }
  };

  const handleEdit = (investigation: Investigation) => {
    setEditingInvestigation(investigation);
    setFormData({
      investigation_id: investigation.investigation_id,
      g_code: investigation.g_code || "",
      start_date: investigation.start_date,
      due_date: investigation.due_date || "",
      appointment_date: investigation.appointment_date || "",
      assigned_to_id: investigation.assigned_to_id || "none",
      doctor: investigation.doctor || "",
      status: investigation.status,
      priority: investigation.priority,
      description: investigation.description || "",
      findings: investigation.findings || "",
      recommendations: investigation.recommendations || "",
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      investigation_id: "",
      g_code: "",
      start_date: "",
      due_date: "",
      appointment_date: "",
      assigned_to_id: "none",
      doctor: "",
      status: "planned",
      priority: "medium",
      description: "",
      findings: "",
      recommendations: "",
    });
    setEditingInvestigation(null);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; labelKey: string }> = {
      due: {
        className: "bg-red-100 text-red-800",
        labelKey: "dashboard.dueStatus",
      },
      planned: {
        className: "bg-blue-100 text-blue-800",
        labelKey: "investigations.planned",
      },
      completed: {
        className: "bg-green-100 text-green-800",
        labelKey: "investigations.completed",
      },
    };
    const config = variants[status] || variants.planned;
    return <Badge className={config.className}>{t(config.labelKey)}</Badge>;
  };

  // Filter investigations for both views
  const filteredInvestigations = investigations.filter((investigation) => {
    const matchesSearch =
      investigation.investigation_id
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      investigation.assigned_to?.full_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      investigation.g_code?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterCheckUpType === "all" || investigation.status === filterCheckUpType;

    const matchesDepartment =
      filterDepartment === "all" ||
      investigation.assigned_to?.departments?.name === filterDepartment;

    const matchesGroup =
      filterGroup === "all" ||
      investigation.assigned_to?.exposure_groups?.name === filterGroup;

    const matchesDateFrom =
      !filterDateFrom ||
      (investigation.due_date && investigation.due_date >= filterDateFrom);

    const matchesDateTo =
      !filterDateTo ||
      (investigation.due_date && investigation.due_date <= filterDateTo);

    return (
      matchesSearch &&
      matchesStatus &&
      matchesDepartment &&
      matchesGroup &&
      matchesDateFrom &&
      matchesDateTo
    );
  });

  // Group investigations by employee for Employee View (using filtered investigations)
  const groupedByEmployee = employees
    .map((employee) => {
      const employeeInvestigations = filteredInvestigations.filter(
        (inv) => inv.assigned_to_id === employee.id
      );
      return {
        employee,
        investigations: employeeInvestigations,
        gCodes: employeeInvestigations
          .map((inv) => inv.g_code || inv.investigation_id)
          .join(", "),
      };
    })
    .filter((item) => item.investigations.length > 0);

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(t("investigations.overview"), 14, 22);
    doc.setFontSize(11);
    doc.text(
      `${t("common.createdOn")} ${format(new Date(), "dd.MM.yyyy")}`,
      14,
      30
    );

    if (viewMode === "employee") {
      const tableData = groupedByEmployee.map((item) => [
        item.employee.full_name,
        item.employee.employee_number,
        item.employee.departments?.name || "—",
        item.employee.exposure_groups?.name || "—",
        item.gCodes,
      ]);

      autoTable(doc, {
        head: [
          [
            t("common.lastName"),
            t("common.firstName"),
            t("common.department"),
            t("common.group"),
            t("investigations.gCode"),
          ],
        ],
        body: tableData,
        startY: 35,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [37, 99, 235] },
      });
    } else {
      const tableData = filteredInvestigations.map((inv) => [
        inv.assigned_to?.full_name || "—",
        inv.g_code || inv.investigation_id,
        inv.due_date ? format(new Date(inv.due_date), "dd.MM.yyyy") : "—",
        inv.appointment_date
          ? format(new Date(inv.appointment_date), "dd.MM.yyyy")
          : "—",
        inv.doctor || "—",
        inv.status,
      ]);

      autoTable(doc, {
        head: [
          [
            t("common.employee"),
            t("investigations.gCode"),
            t("dueDate"),
            t("appointmentDate"),
            t("investigations.doctor"),
            t("common.status"),
          ],
        ],
        body: tableData,
        startY: 35,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [37, 99, 235] },
      });
    }

    doc.save(
      `untersuchungen_${viewMode}_${format(new Date(), "yyyy-MM-dd")}.pdf`
    );
    toast({
      title: t("common.success"),
      description: t("common.pdfExported"),
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">{t("investigations.title")}</h2>
          <p className="text-muted-foreground">
            {t("investigations.overview")}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div>
              <CardTitle>{t("investigations.allInvestigations")}</CardTitle>
              <CardDescription>
                {t("investigations.employeesWithInvestigations")}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportToPDF}>
                <FileDown className="w-4 h-4 mr-2" />
                {t("investigations.exportPDF")}
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t("investigations.newInvestigation")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingInvestigation
                        ? t("investigations.editInvestigation")
                        : t("investigations.newInvestigation")}
                    </DialogTitle>
                    <DialogDescription>
                      {t("investigations.investigationDetails")}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="g_code">
                          {t("investigations.gCode")} *
                        </Label>
                        <Input
                          id="g_code"
                          value={formData.g_code}
                          onChange={(e) =>
                            setFormData({ ...formData, g_code: e.target.value })
                          }
                          placeholder="z.B. G37, G11, G7"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="assigned_to">
                          {t("investigations.employee")} *
                        </Label>
                        <Select
                          value={formData.assigned_to_id}
                          onValueChange={(value) =>
                            setFormData({ ...formData, assigned_to_id: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t("investigations.selectEmployee")}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              {t("investigations.none")}
                            </SelectItem>
                            {employees.map((emp) => (
                              <SelectItem key={emp.id} value={emp.id}>
                                {emp.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="start_date">
                          {t("investigations.startDate")}
                        </Label>
                        <Input
                          id="start_date"
                          type="date"
                          value={formData.start_date}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              start_date: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="due_date">
                          {t("investigations.dueDate")}
                        </Label>
                        <Input
                          id="due_date"
                          type="date"
                          value={formData.due_date}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              due_date: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="appointment_date">
                          {t("investigations.appointmentDate")}
                        </Label>
                        <Input
                          id="appointment_date"
                          type="date"
                          value={formData.appointment_date}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              appointment_date: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="doctor">
                          {t("investigations.doctor")}
                        </Label>
                        <Input
                          id="doctor"
                          value={formData.doctor}
                          onChange={(e) =>
                            setFormData({ ...formData, doctor: e.target.value })
                          }
                          placeholder={t("investigations.doctorName")}
                        />
                      </div>
                      <div>
                        <Label htmlFor="status">{t("common.status")} *</Label>
                        <Select
                          value={formData.status}
                          onValueChange={(value: any) =>
                            setFormData({ ...formData, status: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="planned">
                              {t("investigations.planned")}
                            </SelectItem>
                            <SelectItem value="due">
                              {t("dashboard.dueStatus")}
                            </SelectItem>
                            <SelectItem value="completed">
                              {t("investigations.completed")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="description">
                        {t("investigations.description")}
                      </Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                        placeholder={t(
                          "investigations.investigationDescription"
                        )}
                        rows={3}
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsDialogOpen(false);
                          resetForm();
                        }}
                      >
                        {t("investigations.cancel")}
                      </Button>
                      <Button type="submit">
                        {editingInvestigation
                          ? t("investigations.update")
                          : t("investigations.create")}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={viewMode === "employee" ? "default" : "outline"}
              onClick={() => setViewMode("employee")}
              className="flex-1"
            >
              <Users className="w-4 h-4 mr-2" />
              {t("investigations.employeeView")}
            </Button>
            <Button
              variant={viewMode === "date" ? "default" : "outline"}
              onClick={() => setViewMode("date")}
              className="flex-1"
            >
              <Calendar className="w-4 h-4 mr-2" />
              {t("investigations.dateView")}
            </Button>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder={t("investigations.search")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select
              value={filterCheckUpType}
              onValueChange={setFilterCheckUpType}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("investigations.filterStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                <SelectItem value="planned">
                  {t("investigations.planned")}
                </SelectItem>
                <SelectItem value="due">{t("dashboard.dueStatus")}</SelectItem>
                <SelectItem value="completed">
                  {t("investigations.completed")}
                </SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filterDepartment}
              onValueChange={setFilterDepartment}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("common.allDepartments")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("common.allDepartments")}
                </SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.name}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterGroup} onValueChange={setFilterGroup}>
              <SelectTrigger>
                <SelectValue placeholder={t("common.allGroups")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.allGroups")}</SelectItem>
                {exposureGroups.map((group) => (
                  <SelectItem key={group.id} value={group.name}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              placeholder={t("common.fromDate")}
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
            />

            <Input
              type="date"
              placeholder={t("common.toDate")}
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
            />
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-md border">
            {viewMode === "employee" ? (
              // Employee View
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("common.lastName")}</TableHead>
                    <TableHead>{t("common.firstName")}</TableHead>
                    <TableHead>{t("common.department")}</TableHead>
                    <TableHead>{t("common.location")}</TableHead>
                    <TableHead>{t("common.group")}</TableHead>
                    <TableHead>{t("investigations.gCode")}</TableHead>
                    <TableHead className="text-right">
                      {t("common.actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedByEmployee.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-8 text-muted-foreground"
                      >
                        {t("investigations.noInvestigations")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    groupedByEmployee
                      .filter((item) => {
                        const matchesSearch =
                          item.employee.full_name
                            ?.toLowerCase()
                            .includes(searchTerm.toLowerCase()) ||
                          item.employee.employee_number
                            ?.toLowerCase()
                            .includes(searchTerm.toLowerCase()) ||
                          item.gCodes
                            ?.toLowerCase()
                            .includes(searchTerm.toLowerCase());

                        const matchesDepartment =
                          filterDepartment === "all" ||
                          item.employee.departments?.name === filterDepartment;

                        const matchesGroup =
                          filterGroup === "all" ||
                          item.employee.exposure_groups?.name === filterGroup;

                        return (
                          matchesSearch && matchesDepartment && matchesGroup
                        );
                      })
                      .map((item) => {
                        const nameParts = item.employee.full_name.split(" ");
                        const lastName = nameParts[nameParts.length - 1];
                        const firstName = nameParts.slice(0, -1).join(" ");

                        return (
                          <TableRow key={item.employee.id}>
                            <TableCell className="font-medium">
                              {lastName}
                            </TableCell>
                            <TableCell>{firstName}</TableCell>
                            <TableCell>
                              {item.employee.departments?.name || "—"}
                            </TableCell>
                            <TableCell>—</TableCell>
                            <TableCell>
                              {item.employee.exposure_groups?.name || "—"}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {item.investigations.map((inv) => (
                                  <Badge
                                    key={inv.id}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {inv.g_code || inv.investigation_id}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  navigate(`/employees/${item.employee.id}`)
                                }
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                {t("common.edit")}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                  )}
                </TableBody>
              </Table>
            ) : (
              // Date View
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("common.employee")}</TableHead>
                    <TableHead>{t("investigations.gCode")}</TableHead>
                    <TableHead>{t("dueDate")}</TableHead>
                    <TableHead>{t("appointmentDate")}</TableHead>
                    <TableHead>{t("investigations.doctor")}</TableHead>
                    <TableHead>{t("common.status")}</TableHead>
                    <TableHead className="text-right">
                      {t("common.actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvestigations.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-8 text-muted-foreground"
                      >
                        {t("investigations.noInvestigations")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInvestigations.map((investigation) => (
                      <TableRow key={investigation.id}>
                        <TableCell className="font-medium">
                          {investigation.assigned_to?.full_name || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {investigation.g_code ||
                              investigation.investigation_id}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {investigation.due_date
                            ? format(
                                new Date(investigation.due_date),
                                "dd.MM.yyyy"
                              )
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {investigation.appointment_date
                            ? format(
                                new Date(investigation.appointment_date),
                                "dd.MM.yyyy"
                              )
                            : "—"}
                        </TableCell>
                        <TableCell>{investigation.doctor || "—"}</TableCell>
                        <TableCell>
                          {getStatusBadge(investigation.status)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(investigation)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
