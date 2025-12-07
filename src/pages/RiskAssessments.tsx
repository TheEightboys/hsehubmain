import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Search,
  Shield,
  AlertTriangle,
  AlertOctagon,
  Info,
  X,
  Upload,
  Check,
  Save,
  Grid3x3,
  FileDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

// Types
type Risk = any;
type Location = { id: string; name: string };
type Department = { id: string; name: string };
type ExposureGroup = { id: string; name: string };
type Employee = { id: string; full_name: string };
type Measure = {
  id?: string;
  measure_building_block: string;
  responsible_person: string;
  responsible_person_name?: string;
  due_date: string;
  progress_status: string;
  notes?: string;
};

// Constants
const HAZARD_CATEGORIES = [
  "Mechanical",
  "Electrical",
  "Chemical",
  "Biological",
  "Ergonomic",
  "Physical",
  "Psychosocial",
  "Fire/Explosion",
  "Environmental",
  "Other",
];

const RISK_MATRIX_LABELS = [
  "Negligible",
  "Minor",
  "Moderate",
  "Major",
  "Catastrophic",
];

const MEASURE_BUILDING_BLOCKS = [
  "Elimination",
  "Substitution",
  "Engineering Controls",
  "Administrative Controls",
  "Personal Protective Equipment (PPE)",
  "Training",
  "Supervision",
  "Maintenance",
  "Emergency Procedures",
  "Other",
];

const PROBABILITY_LABELS = [
  { value: 1, de: "Sehr unwahrscheinlich", en: "Very Unlikely" },
  { value: 2, de: "Unwahrscheinlich", en: "Unlikely" },
  { value: 3, de: "Möglich", en: "Possible" },
  { value: 4, de: "Wahrscheinlich", en: "Probable" },
  { value: 5, de: "Sehr wahrscheinlich", en: "Very Probable" },
];

const DAMAGE_EXTENT_LABELS = [
  { value: 1, de: "Sehr gering", en: "Very Low" },
  { value: 2, de: "Gering", en: "Low" },
  { value: 3, de: "Mittel", en: "Medium" },
  { value: 4, de: "Hoch", en: "High" },
  { value: 5, de: "Sehr hoch", en: "Very High" },
];

export default function RiskAssessments() {
  const { user, loading, companyId } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  // State
  const [risks, setRisks] = useState<Risk[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [exposureGroups, setExposureGroups] = useState<ExposureGroup[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isMatrixDialogOpen, setIsMatrixDialogOpen] = useState(false);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [approvalComment, setApprovalComment] = useState("");
  const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [formStep, setFormStep] = useState(1);
  const [editableNotes, setEditableNotes] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    department_id: "",
    location_id: "",
    exposure_group_id: "",
    line_manager_id: "",
    hazard_category: "",
    probability_before: 3,
    probability_after: 2,
    extent_damage_before: 3,
    extent_damage_after: 2,
    risk_matrix_label: "",
    mitigation_measures: "",
    notes: "",
    assessment_date: new Date().toISOString().split("T")[0],
  });

  const [measures, setMeasures] = useState<Measure[]>([
    {
      measure_building_block: "",
      responsible_person: "",
      due_date: "",
      progress_status: "not_started",
      notes: "",
    },
  ]);

  const [uploadedDocuments, setUploadedDocuments] = useState<string[]>([]);

  // Calculated risk scores
  const riskScoreBefore =
    formData.probability_before * formData.extent_damage_before;
  const riskScoreAfter =
    formData.probability_after * formData.extent_damage_after;

  const getRiskLevel = (score: number) => {
    if (score >= 20) return "critical";
    if (score >= 15) return "high";
    if (score >= 8) return "medium";
    return "low";
  };

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
    if (user && companyId) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, navigate, companyId]);

  const fetchData = async () => {
    if (!companyId) return;

    setLoadingData(true);
    try {
      const [
        risksRes,
        locationsRes,
        departmentsRes,
        exposureGroupsRes,
        employeesRes,
      ] = await Promise.all([
        supabase
          .from("risk_assessments")
          .select(
            "*, departments(name), locations(name), exposure_groups(name), employees!risk_assessments_line_manager_id_fkey(full_name)"
          )
          .eq("company_id", companyId)
          .order("assessment_date", { ascending: false }),
        supabase
          .from("locations")
          .select("id, name")
          .eq("company_id", companyId)
          .order("name"),
        supabase
          .from("departments")
          .select("id, name")
          .eq("company_id", companyId)
          .order("name"),
        supabase
          .from("exposure_groups")
          .select("id, name")
          .eq("company_id", companyId)
          .order("name"),
        supabase
          .from("employees")
          .select("id, full_name")
          .eq("company_id", companyId)
          .order("full_name"),
      ]);

      if (risksRes.error) throw risksRes.error;
      if (locationsRes.error) throw locationsRes.error;
      if (departmentsRes.error) throw departmentsRes.error;
      if (exposureGroupsRes.error) throw exposureGroupsRes.error;
      if (employeesRes.error) throw employeesRes.error;

      // Fetch measures for each risk assessment
      const risksWithMeasures = await Promise.all(
        (risksRes.data || []).map(async (risk) => {
          const { data: measures } = await supabase
            .from("risk_assessment_measures")
            .select("*, employees(full_name)")
            .eq("risk_assessment_id", risk.id);

          return {
            ...risk,
            measures: measures || [],
          };
        })
      );

      setRisks(risksWithMeasures);
      setLocations(locationsRes.data || []);
      setDepartments(departmentsRes.data || []);
      setExposureGroups(exposureGroupsRes.data || []);
      setEmployees(employeesRes.data || []);
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

  const onSubmit = async () => {
    if (!companyId) {
      toast({
        title: "No company found",
        description:
          "You need to set up a company before creating assessments.",
        variant: "destructive",
      });
      navigate("/setup-company");
      return;
    }

    try {
      // Calculate risk levels
      const riskScoreBefore =
        formData.probability_before * formData.extent_damage_before;
      const riskScoreAfter =
        formData.probability_after * formData.extent_damage_after;
      const riskLevelBefore = getRiskLevel(riskScoreBefore);
      const riskLevelAfter = getRiskLevel(riskScoreAfter);

      // Insert risk assessment
      const { data: created, error } = await supabase
        .from("risk_assessments")
        .insert([
          {
            title: formData.title,
            description: formData.description,
            department_id: formData.department_id || null,
            location_id: formData.location_id || null,
            exposure_group_id: formData.exposure_group_id || null,
            line_manager_id: formData.line_manager_id || null,
            hazard_category: formData.hazard_category || null,
            probability_before: formData.probability_before,
            probability_after: formData.probability_after,
            extent_damage_before: formData.extent_damage_before,
            extent_damage_after: formData.extent_damage_after,
            risk_level: riskLevelAfter,
            risk_matrix_label: formData.risk_matrix_label || null,
            mitigation_measures: formData.mitigation_measures || null,
            notes: formData.notes || null,
            assessment_date: formData.assessment_date,
            document_paths:
              uploadedDocuments.length > 0 ? uploadedDocuments : null,
            approval_status: "draft",
            status: "open",
            company_id: companyId,
          },
        ])
        .select("id")
        .single();

      if (error) {
        console.error("Risk create error:", error);
        toast({
          title: "Error creating risk assessment",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      // Insert measures
      if (
        created &&
        measures.length > 0 &&
        measures[0].measure_building_block
      ) {
        const measuresData = measures
          .filter((m) => m.measure_building_block)
          .map((m) => ({
            risk_assessment_id: created.id,
            company_id: companyId,
            measure_building_block: m.measure_building_block,
            responsible_person: m.responsible_person || null,
            due_date: m.due_date || null,
            progress_status: m.progress_status || "not_started",
            notes: m.notes || null,
          }));

        const { error: measuresError } = await supabase
          .from("risk_assessment_measures")
          .insert(measuresData);

        if (measuresError) {
          console.error("Measures create error:", measuresError);
          toast({
            title: "Warning",
            description:
              "Risk assessment created but some measures failed to save.",
            variant: "destructive",
          });
        }
      }

      toast({
        title: "Success",
        description: "Risk assessment created successfully",
      });
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (err: unknown) {
      console.error("Unexpected error creating risk assessment:", err);
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

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      department_id: "",
      location_id: "",
      exposure_group_id: "",
      line_manager_id: "",
      hazard_category: "",
      probability_before: 3,
      probability_after: 2,
      extent_damage_before: 3,
      extent_damage_after: 2,
      risk_matrix_label: "",
      mitigation_measures: "",
      notes: "",
      assessment_date: new Date().toISOString().split("T")[0],
    });
    setMeasures([
      {
        measure_building_block: "",
        responsible_person: "",
        due_date: "",
        progress_status: "not_started",
        notes: "",
      },
    ]);
    setUploadedDocuments([]);
  };

  const filteredRisks = risks.filter((risk) =>
    risk.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleApproveRisk = async () => {
    if (!selectedRisk) return;

    try {
      // Update approval status and add comment to notes if provided
      const updateData: any = {
        approval_status: "approved",
      };

      // Append approval comment to notes if provided
      if (approvalComment) {
        const existingNotes = selectedRisk.notes || "";
        const approvalNote = `\n\n[Approval Comment - ${new Date().toLocaleDateString()}]: ${approvalComment}`;
        updateData.notes = existingNotes + approvalNote;
      }

      const { error } = await supabase
        .from("risk_assessments")
        .update(updateData)
        .eq("id", selectedRisk.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Risk assessment approved successfully",
      });

      setIsApprovalDialogOpen(false);
      setApprovalComment("");
      setSelectedRisk(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case "critical":
        return "destructive";
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "secondary";
    }
  };

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
              <h1 className="text-xl font-bold">{t("risks.title")}</h1>
              <p className="text-xs text-muted-foreground">
                {t("risks.subtitle")}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl">{t("risks.title")}</CardTitle>
                  <CardDescription className="text-sm">
                    {t("risks.subtitle")}
                  </CardDescription>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  className="whitespace-nowrap"
                  onClick={() => {
                    toast({
                      title:
                        language === "de" ? "PDF exportieren" : "Export PDF",
                      description:
                        language === "de"
                          ? "PDF-Export-Funktion kommt bald"
                          : "PDF export functionality coming soon",
                    });
                  }}
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  {language === "de" ? "PDF Export" : "Export PDF"}
                </Button>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="whitespace-nowrap">
                      <Plus className="w-4 h-4 mr-2" />
                      {language === "de"
                        ? "Neue Bewertung"
                        : "New Risk Assessment"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{t("risks.new")}</DialogTitle>
                      <DialogDescription>
                        {t("risks.subtitle")}
                      </DialogDescription>
                    </DialogHeader>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        onSubmit();
                      }}
                      className="space-y-6"
                    >
                      {/* Step Indicator */}
                      <div className="flex items-center justify-center gap-2 mb-6 pb-4 border-b">
                        <Button
                          type="button"
                          variant={formStep === 1 ? "default" : "outline"}
                          size="sm"
                          onClick={() => setFormStep(1)}
                        >
                          {t("risks.step1")}
                        </Button>
                        <Button
                          type="button"
                          variant={formStep === 2 ? "default" : "outline"}
                          size="sm"
                          onClick={() => setFormStep(2)}
                        >
                          {t("risks.step2")}
                        </Button>
                        <Button
                          type="button"
                          variant={formStep === 3 ? "default" : "outline"}
                          size="sm"
                          onClick={() => setFormStep(3)}
                        >
                          {t("risks.step3")}
                        </Button>
                      </div>

                      {/* Step 1: Basic Information */}
                      {formStep === 1 && (
                        <div className="space-y-4">
                          <h3 className="font-semibold text-lg">
                            {t("risks.basicInformation")}
                          </h3>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="title">
                                {t("risks.riskTitle")} *
                              </Label>
                              <Input
                                id="title"
                                value={formData.title}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    title: e.target.value,
                                  })
                                }
                                required
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="assessment_date">
                                {t("risks.assessmentDate")} *
                              </Label>
                              <Input
                                id="assessment_date"
                                type="date"
                                value={formData.assessment_date}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    assessment_date: e.target.value,
                                  })
                                }
                                required
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="description">
                              {t("risks.description")}
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
                              rows={3}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="department_id">
                                {t("risks.department")}
                              </Label>
                              <Select
                                value={formData.department_id}
                                onValueChange={(val) =>
                                  setFormData({
                                    ...formData,
                                    department_id: val,
                                  })
                                }
                              >
                                <SelectTrigger id="department_id">
                                  <SelectValue
                                    placeholder={t("risks.selectDepartment")}
                                  />
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
                              <Label htmlFor="location_id">
                                {t("risks.location")}
                              </Label>
                              <Select
                                value={formData.location_id}
                                onValueChange={(val) =>
                                  setFormData({ ...formData, location_id: val })
                                }
                              >
                                <SelectTrigger id="location_id">
                                  <SelectValue
                                    placeholder={t("risks.selectLocation")}
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  {locations.map((loc) => (
                                    <SelectItem key={loc.id} value={loc.id}>
                                      {loc.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="exposure_group_id">
                                {t("risks.exposureGroup")}
                              </Label>
                              <Select
                                value={formData.exposure_group_id}
                                onValueChange={(val) =>
                                  setFormData({
                                    ...formData,
                                    exposure_group_id: val,
                                  })
                                }
                              >
                                <SelectTrigger id="exposure_group_id">
                                  <SelectValue
                                    placeholder={t("risks.selectExposureGroup")}
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  {exposureGroups.map((group) => (
                                    <SelectItem key={group.id} value={group.id}>
                                      {group.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="line_manager_id">
                                {t("risks.lineManager")}
                              </Label>
                              <Select
                                value={formData.line_manager_id}
                                onValueChange={(val) =>
                                  setFormData({
                                    ...formData,
                                    line_manager_id: val,
                                  })
                                }
                              >
                                <SelectTrigger id="line_manager_id">
                                  <SelectValue
                                    placeholder={t("risks.selectLineManager")}
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  {employees.map((emp) => (
                                    <SelectItem key={emp.id} value={emp.id}>
                                      {emp.full_name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="flex justify-end">
                            <Button
                              type="button"
                              onClick={() => setFormStep(2)}
                            >
                              {t("risks.nextSlide")}
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Step 2: Risk Assessment */}
                      {formStep === 2 && (
                        <div className="space-y-4">
                          <h3 className="font-semibold text-lg">
                            {t("risks.hazardAssessment")}
                          </h3>

                          <div className="space-y-2">
                            <Label htmlFor="hazard_category">
                              {t("risks.hazardCategory")}
                            </Label>
                            <Select
                              value={formData.hazard_category}
                              onValueChange={(val) =>
                                setFormData({
                                  ...formData,
                                  hazard_category: val,
                                })
                              }
                            >
                              <SelectTrigger id="hazard_category">
                                <SelectValue
                                  placeholder={t("risks.selectHazardCategory")}
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {HAZARD_CATEGORIES.map((cat) => (
                                  <SelectItem key={cat} value={cat}>
                                    {cat}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="description2">
                              {t("risks.shortDescription")}
                            </Label>
                            <Textarea
                              id="description2"
                              value={formData.description}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  description: e.target.value,
                                })
                              }
                              rows={2}
                              placeholder={t(
                                "risks.shortDescriptionPlaceholder"
                              )}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-3 p-4 border rounded-lg bg-red-50">
                              <h4 className="font-medium text-sm">
                                {t("risks.primaBefore")}
                              </h4>
                              <div className="space-y-3">
                                <div className="space-y-2">
                                  <Label htmlFor="probability_before">
                                    {t("risks.probabilityBefore")}
                                  </Label>
                                  <Select
                                    value={formData.probability_before.toString()}
                                    onValueChange={(val) =>
                                      setFormData({
                                        ...formData,
                                        probability_before: parseInt(val),
                                      })
                                    }
                                  >
                                    <SelectTrigger id="probability_before">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {PROBABILITY_LABELS.map((item) => (
                                        <SelectItem
                                          key={item.value}
                                          value={item.value.toString()}
                                        >
                                          {language === "de"
                                            ? item.de
                                            : item.en}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="extent_damage_before">
                                    {t("risks.damageExtentBefore")}
                                  </Label>
                                  <Select
                                    value={formData.extent_damage_before.toString()}
                                    onValueChange={(val) =>
                                      setFormData({
                                        ...formData,
                                        extent_damage_before: parseInt(val),
                                      })
                                    }
                                  >
                                    <SelectTrigger id="extent_damage_before">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {DAMAGE_EXTENT_LABELS.map((item) => (
                                        <SelectItem
                                          key={item.value}
                                          value={item.value.toString()}
                                        >
                                          {language === "de"
                                            ? item.de
                                            : item.en}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div className="text-center p-3 bg-white rounded border mt-2">
                                <p className="text-xs text-muted-foreground mb-1">
                                  Risk Score (calculated)
                                </p>
                                <p className="text-3xl font-bold text-red-600">
                                  {riskScoreBefore}
                                </p>
                                <Badge
                                  variant={getRiskLevelColor(
                                    getRiskLevel(riskScoreBefore)
                                  )}
                                  className="mt-2"
                                >
                                  {getRiskLevel(riskScoreBefore)}
                                </Badge>
                              </div>
                            </div>

                            <div className="space-y-3 p-4 border rounded-lg bg-green-50">
                              <h4 className="font-medium text-sm">
                                {t("risks.postAfter")}
                              </h4>
                              <div className="space-y-3">
                                <div className="space-y-2">
                                  <Label htmlFor="probability_after">
                                    {t("risks.probabilityAfter")}
                                  </Label>
                                  <Select
                                    value={formData.probability_after.toString()}
                                    onValueChange={(val) =>
                                      setFormData({
                                        ...formData,
                                        probability_after: parseInt(val),
                                      })
                                    }
                                  >
                                    <SelectTrigger id="probability_after">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {PROBABILITY_LABELS.map((item) => (
                                        <SelectItem
                                          key={item.value}
                                          value={item.value.toString()}
                                        >
                                          {language === "de"
                                            ? item.de
                                            : item.en}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="extent_damage_after">
                                    {t("risks.damageExtentAfter")}
                                  </Label>
                                  <Select
                                    value={formData.extent_damage_after.toString()}
                                    onValueChange={(val) =>
                                      setFormData({
                                        ...formData,
                                        extent_damage_after: parseInt(val),
                                      })
                                    }
                                  >
                                    <SelectTrigger id="extent_damage_after">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {DAMAGE_EXTENT_LABELS.map((item) => (
                                        <SelectItem
                                          key={item.value}
                                          value={item.value.toString()}
                                        >
                                          {language === "de"
                                            ? item.de
                                            : item.en}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div className="text-center p-3 bg-white rounded border mt-2">
                                <p className="text-xs text-muted-foreground mb-1">
                                  {t("risks.riskScoreCalculated")}
                                </p>
                                <p className="text-3xl font-bold text-green-600">
                                  {riskScoreAfter}
                                </p>
                                <Badge
                                  variant={getRiskLevelColor(
                                    getRiskLevel(riskScoreAfter)
                                  )}
                                  className="mt-2"
                                >
                                  {getRiskLevel(riskScoreAfter)}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-between mt-4">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setFormStep(1)}
                            >
                              {t("risks.back")}
                            </Button>
                            <Button
                              type="button"
                              onClick={() => setFormStep(3)}
                            >
                              {t("risks.nextSlide")}
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Step 3: Measures and Documents */}
                      {formStep === 3 && (
                        <div className="space-y-4">
                          <h3 className="font-semibold text-lg">
                            {t("risks.measures")}
                          </h3>

                          {/* Additional Information */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="department_id">
                                {t("risks.department")}
                              </Label>
                              <Select
                                value={formData.department_id}
                                onValueChange={(val) =>
                                  setFormData({
                                    ...formData,
                                    department_id: val,
                                  })
                                }
                              >
                                <SelectTrigger id="department_id">
                                  <SelectValue
                                    placeholder={t("risks.selectDepartment")}
                                  />
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
                              <Label htmlFor="location_id">
                                {t("risks.location")}
                              </Label>
                              <Select
                                value={formData.location_id}
                                onValueChange={(val) =>
                                  setFormData({ ...formData, location_id: val })
                                }
                              >
                                <SelectTrigger id="location_id">
                                  <SelectValue
                                    placeholder={t("risks.selectLocation")}
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  {locations.map((loc) => (
                                    <SelectItem key={loc.id} value={loc.id}>
                                      {loc.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="line_manager_id">
                                {t("risks.responsiblePerson")}
                              </Label>
                              <Select
                                value={formData.line_manager_id}
                                onValueChange={(val) =>
                                  setFormData({
                                    ...formData,
                                    line_manager_id: val,
                                  })
                                }
                              >
                                <SelectTrigger id="line_manager_id">
                                  <SelectValue
                                    placeholder={t("risks.selectManager")}
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  {employees.map((emp) => (
                                    <SelectItem key={emp.id} value={emp.id}>
                                      {emp.full_name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="assessment_date">
                                {t("risks.dueDate")}
                              </Label>
                              <Input
                                id="assessment_date"
                                type="date"
                                value={formData.assessment_date}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    assessment_date: e.target.value,
                                  })
                                }
                              />
                            </div>
                          </div>

                          {/* Document Upload */}
                          <div className="space-y-2 border-t pt-4">
                            <Label>{t("risks.uploadDocuments")}</Label>
                            <div className="border-2 border-dashed rounded-lg p-6 text-center">
                              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground mb-2">
                                {t("risks.chooseFile")}
                              </p>
                              <Input
                                type="file"
                                multiple
                                className="max-w-xs mx-auto"
                                onChange={(e) => {
                                  if (e.target.files) {
                                    const files = Array.from(
                                      e.target.files
                                    ).map((f) => f.name);
                                    setUploadedDocuments(files);
                                    toast({
                                      title: "Files selected",
                                      description: `${files.length} file(s) selected`,
                                    });
                                  }
                                }}
                              />
                              {uploadedDocuments.length > 0 && (
                                <div className="mt-2 text-sm">
                                  <p className="font-medium">Selected files:</p>
                                  {uploadedDocuments.map((doc, idx) => (
                                    <p
                                      key={idx}
                                      className="text-muted-foreground"
                                    >
                                      {doc}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Measures Section */}
                          <div className="space-y-4 border-t pt-4">
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold text-lg">
                                {t("risks.addMeasure")}
                              </h3>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setMeasures([
                                    ...measures,
                                    {
                                      measure_building_block: "",
                                      responsible_person: "",
                                      due_date: "",
                                      progress_status: "not_started",
                                      notes: "",
                                    },
                                  ])
                                }
                              >
                                <Plus className="w-4 h-4 mr-1" />
                                {t("risks.addMeasureButton")}
                              </Button>
                            </div>

                            {measures.map((measure, index) => (
                              <div
                                key={index}
                                className="p-4 border rounded-lg space-y-3 bg-muted/20"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">
                                    Measure {index + 1}
                                  </span>
                                  {measures.length > 1 && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        setMeasures(
                                          measures.filter((_, i) => i !== index)
                                        )
                                      }
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-2">
                                    <Label>Building Block</Label>
                                    <Select
                                      value={measure.measure_building_block}
                                      onValueChange={(val) => {
                                        const updated = [...measures];
                                        updated[index].measure_building_block =
                                          val;
                                        setMeasures(updated);
                                      }}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select building block" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {MEASURE_BUILDING_BLOCKS.map(
                                          (block) => (
                                            <SelectItem
                                              key={block}
                                              value={block}
                                            >
                                              {block}
                                            </SelectItem>
                                          )
                                        )}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="space-y-2">
                                    <Label>Responsible Person</Label>
                                    <Select
                                      value={measure.responsible_person}
                                      onValueChange={(val) => {
                                        const updated = [...measures];
                                        updated[index].responsible_person = val;
                                        setMeasures(updated);
                                      }}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select responsible person" />
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
                                  </div>

                                  <div className="space-y-2">
                                    <Label>Due Date</Label>
                                    <Input
                                      type="date"
                                      value={measure.due_date}
                                      onChange={(e) => {
                                        const updated = [...measures];
                                        updated[index].due_date =
                                          e.target.value;
                                        setMeasures(updated);
                                      }}
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <Label>Progress Status</Label>
                                    <Select
                                      value={measure.progress_status}
                                      onValueChange={(val) => {
                                        const updated = [...measures];
                                        updated[index].progress_status = val;
                                        setMeasures(updated);
                                      }}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="not_started">
                                          Not Started
                                        </SelectItem>
                                        <SelectItem value="in_progress">
                                          In Progress
                                        </SelectItem>
                                        <SelectItem value="completed">
                                          Completed
                                        </SelectItem>
                                        <SelectItem value="blocked">
                                          Blocked
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label>Notes</Label>
                                  <Textarea
                                    value={measure.notes || ""}
                                    onChange={(e) => {
                                      const updated = [...measures];
                                      updated[index].notes = e.target.value;
                                      setMeasures(updated);
                                    }}
                                    rows={2}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="flex justify-between mt-4">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setFormStep(2)}
                            >
                              {t("risks.back")}
                            </Button>
                            <Button type="submit">
                              <Save className="w-4 h-4 mr-2" />
                              {t("common.create")}
                            </Button>
                          </div>
                        </div>
                      )}

                      {formStep !== 3 && (
                        <div className="flex justify-end gap-2 border-t pt-4 opacity-50 pointer-events-none">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setIsDialogOpen(false);
                              resetForm();
                              setFormStep(1);
                            }}
                          >
                            {t("common.cancel")}
                          </Button>
                          <Button type="submit" disabled>
                            <Save className="w-4 h-4 mr-2" />
                            {t("common.create")}
                          </Button>
                        </div>
                      )}
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  placeholder={t("risks.search")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-12 border-2 focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">
                      {language === "de" ? "Risikotitel" : "Risk Title"}
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      {language === "de" ? "Abteilung" : "Department"}
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      {language === "de" ? "Standort" : "Location"}
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      {language === "de" ? "Expo-Gruppe" : "Exposure Group"}
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      {language === "de" ? "Gefahr" : "Hazard"}
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      {language === "de"
                        ? "Risiko Vorher/Nachher"
                        : "Risk Before/After"}
                    </TableHead>
                    <TableHead>Matrix</TableHead>
                    <TableHead>
                      {language === "de" ? "Fortschritt" : "Progress"}
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      {language === "de" ? "Genehmigung" : "Approval"}
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      {language === "de"
                        ? "Bewertungsdatum"
                        : "Assessment Date"}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRisks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-12">
                        <div className="flex flex-col items-center justify-center">
                          <Shield className="w-16 h-16 text-muted-foreground/20 mb-4" />
                          <p className="text-lg font-medium text-muted-foreground mb-1">
                            No risk assessments found
                          </p>
                          <p className="text-sm text-muted-foreground/60">
                            Create your first risk assessment to get started
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRisks.map((risk) => (
                      <TableRow
                        key={risk.id}
                        className="hover:bg-muted/70 transition-all duration-200 border-b border-border/50 hover:shadow-sm group"
                      >
                        <TableCell className="font-medium">
                          {risk.title}
                        </TableCell>
                        <TableCell>{risk.departments?.name || "-"}</TableCell>
                        <TableCell>{risk.locations?.name || "-"}</TableCell>
                        <TableCell>
                          {risk.exposure_groups?.name || "-"}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs px-2 py-1 rounded bg-muted">
                            {risk.hazard_category || "-"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={getRiskLevelColor(
                                getRiskLevel(risk.risk_score_before || 0)
                              )}
                              className="text-xs"
                            >
                              {risk.risk_score_before || 0}
                            </Badge>
                            <span className="text-muted-foreground">→</span>
                            <Badge
                              variant={getRiskLevelColor(
                                getRiskLevel(risk.risk_score_after || 0)
                              )}
                              className="text-xs"
                            >
                              {risk.risk_score_after || 0}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedRisk(risk);
                              setIsMatrixDialogOpen(true);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Grid3x3 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress
                              value={risk.progress || 0}
                              className="w-16 h-2"
                            />
                            <span className="text-xs text-muted-foreground">
                              {risk.progress || 0}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              risk.approval_status === "approved"
                                ? "default"
                                : risk.approval_status === "pending_approval"
                                ? "secondary"
                                : "outline"
                            }
                            className="text-xs"
                          >
                            {risk.approval_status === "approved" && (
                              <Check className="w-3 h-3 mr-1" />
                            )}
                            {risk.approval_status || "draft"}
                          </Badge>
                        </TableCell>
                        <TableCell>{risk.assessment_date}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Risk Matrix Dialog */}
        <Dialog
          open={isMatrixDialogOpen}
          onOpenChange={(open) => {
            setIsMatrixDialogOpen(open);
            if (open && selectedRisk) {
              setEditableNotes(selectedRisk.notes || "");
            }
          }}
        >
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-xl">
                    Risk Matrix - {selectedRisk?.title}
                  </DialogTitle>
                  <DialogDescription className="text-sm mt-1">
                    {language === "de"
                      ? "Schritt-für-Schritt: Analyse, Bewertung, Maßnahmen, Revision"
                      : "Step-by-step: Analysis, Assessment, Measures, Revision"}
                  </DialogDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    toast({
                      title: language === "de" ? "PDF exportieren" : "Export PDF",
                      description:
                        language === "de"
                          ? "PDF-Bericht wird erstellt..."
                          : "Generating PDF report...",
                    });
                    window.print();
                  }}
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  {language === "de" ? "PDF Export" : "Export PDF"}
                </Button>
              </div>
            </DialogHeader>


            {selectedRisk && (
              <>
                {/* Risk Legend - At the top */}
                <div className="flex gap-6 text-xs justify-center items-center mt-4 pb-4 border-b bg-muted/30 -mx-6 px-6 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-green-400 rounded shadow-sm"></div>
                    <span className="font-medium">{language === "de" ? "Niedrig" : "Low"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-yellow-400 rounded shadow-sm"></div>
                    <span className="font-medium">{language === "de" ? "Mittel" : "Medium"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-orange-400 rounded shadow-sm"></div>
                    <span className="font-medium">{language === "de" ? "Hoch" : "High"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-red-500 rounded shadow-sm"></div>
                    <span className="font-medium">{language === "de" ? "Kritisch" : "Critical"}</span>
                  </div>
                </div>

                <div className="flex flex-row gap-6 mt-6 overflow-x-auto pb-4">
                {/* PRIMA (Before Mitigation) */}
                <div className="space-y-3 min-w-[300px] flex-shrink-0">
                  <div className="bg-muted/20 p-3 rounded-lg border">
                    <h4 className="font-semibold text-sm mb-2">
                      PRIMA ({language === "de" ? "vor Maßnahmen" : "Before Mitigation"})
                    </h4>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>
                        {language === "de"
                          ? "P x Schadensausmaß"
                          : "P x Damage Extent"}
                      </div>
                      <div className="font-medium text-foreground">
                        P-{selectedRisk.probability_before || 0} × E-{selectedRisk.extent_damage_before || 0} = {(selectedRisk.probability_before || 0) * (selectedRisk.extent_damage_before || 0)}
                      </div>
                    </div>
                  </div>

                  {/* Matrix Grid with Axis Labels */}
                  <div className="relative pl-8">
                    {/* Y-axis label (Probability) */}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 text-xs font-semibold text-muted-foreground whitespace-nowrap origin-center">
                      {language === "de" ? "Wahrscheinlichkeit" : "Probability"}
                    </div>
                    
                    {/* Y-axis values */}
                    <div className="flex gap-2">
                      <div className="flex flex-col justify-between text-xs font-semibold text-muted-foreground pr-2 py-1">
                        <div className="h-12 flex items-center justify-center">5</div>
                        <div className="h-12 flex items-center justify-center">4</div>
                        <div className="h-12 flex items-center justify-center">3</div>
                        <div className="h-12 flex items-center justify-center">2</div>
                        <div className="h-12 flex items-center justify-center">1</div>
                      </div>
                      
                      {/* Matrix */}
                      <div className="flex-1">
                        <div className="grid grid-cols-5 gap-1">
                          {[5, 4, 3, 2, 1].map((prob) => (
                            <div key={`before-${prob}`} className="contents">
                              {[1, 2, 3, 4, 5].map((damage) => {
                                const score = prob * damage;
                                const isSelected =
                                  prob === selectedRisk.probability_before &&
                                  damage === selectedRisk.extent_damage_before;
                                return (
                                  <div
                                    key={`${prob}-${damage}`}
                                    className={`h-12 flex items-center justify-center text-sm font-bold rounded shadow-sm transition-all ${
                                      score >= 15
                                        ? "bg-red-500 text-white"
                                        : score >= 8
                                        ? "bg-orange-400 text-white"
                                        : score >= 4
                                        ? "bg-yellow-400 text-black"
                                        : "bg-green-400 text-black"
                                    } ${isSelected ? "ring-4 ring-blue-600 scale-105" : ""}`}
                                  >
                                    {isSelected && "●"}
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                        
                        {/* X-axis values */}
                        <div className="grid grid-cols-5 gap-1 mt-2">
                          {[1, 2, 3, 4, 5].map((val) => (
                            <div key={val} className="text-center text-xs font-semibold text-muted-foreground">
                              {val}
                            </div>
                          ))}
                        </div>
                        
                        {/* X-axis label (Damage Extent) */}
                        <div className="text-center text-xs font-semibold text-muted-foreground mt-2">
                          {language === "de" ? "Schadensausmaß" : "Damage Extent"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* POST (After Mitigation) */}
                <div className="space-y-3 min-w-[300px] flex-shrink-0">
                  <div className="bg-muted/20 p-3 rounded-lg border">
                    <h4 className="font-semibold text-sm mb-2">
                      POST ({language === "de" ? "nach Maßnahmen" : "After Mitigation"})
                    </h4>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>
                        {language === "de"
                          ? "P x Schadensausmaß"
                          : "P x Damage Extent"}
                      </div>
                      <div className="font-medium text-foreground">
                        P-{selectedRisk.probability_after || 0} × E-{selectedRisk.extent_damage_after || 0} = {(selectedRisk.probability_after || 0) * (selectedRisk.extent_damage_after || 0)}
                      </div>
                    </div>
                  </div>

                  {/* Matrix Grid with Axis Labels */}
                  <div className="relative pl-8">
                    {/* Y-axis label (Probability) */}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 text-xs font-semibold text-muted-foreground whitespace-nowrap origin-center">
                      {language === "de" ? "Wahrscheinlichkeit" : "Probability"}
                    </div>
                    
                    {/* Y-axis values */}
                    <div className="flex gap-2">
                      <div className="flex flex-col justify-between text-xs font-semibold text-muted-foreground pr-2 py-1">
                        <div className="h-12 flex items-center justify-center">5</div>
                        <div className="h-12 flex items-center justify-center">4</div>
                        <div className="h-12 flex items-center justify-center">3</div>
                        <div className="h-12 flex items-center justify-center">2</div>
                        <div className="h-12 flex items-center justify-center">1</div>
                      </div>
                      
                      {/* Matrix */}
                      <div className="flex-1">
                        <div className="grid grid-cols-5 gap-1">
                          {[5, 4, 3, 2, 1].map((prob) => (
                            <div key={`after-${prob}`} className="contents">
                              {[1, 2, 3, 4, 5].map((damage) => {
                                const score = prob * damage;
                                const isSelected =
                                  prob === selectedRisk.probability_after &&
                                  damage === selectedRisk.extent_damage_after;
                                return (
                                  <div
                                    key={`${prob}-${damage}`}
                                    className={`h-12 flex items-center justify-center text-sm font-bold rounded shadow-sm transition-all ${
                                      score >= 15
                                        ? "bg-red-500 text-white"
                                        : score >= 8
                                        ? "bg-orange-400 text-white"
                                        : score >= 4
                                        ? "bg-yellow-400 text-black"
                                        : "bg-green-400 text-black"
                                    } ${isSelected ? "ring-4 ring-blue-600 scale-105" : ""}`}
                                  >
                                    {isSelected && "●"}
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                        
                        {/* X-axis values */}
                        <div className="grid grid-cols-5 gap-1 mt-2">
                          {[1, 2, 3, 4, 5].map((val) => (
                            <div key={val} className="text-center text-xs font-semibold text-muted-foreground">
                              {val}
                            </div>
                          ))}
                        </div>
                        
                        {/* X-axis label (Damage Extent) */}
                        <div className="text-center text-xs font-semibold text-muted-foreground mt-2">
                          {language === "de" ? "Schadensausmaß" : "Damage Extent"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hazards and Notes Section - Stacked Vertically */}
                <div className="flex flex-col gap-4 min-w-[320px] flex-shrink-0">
                  {/* Hazards Section */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      {language === "de" ? "Gefährdungen" : "Hazards"}
                    </h4>
                    <div className="p-4 border rounded-lg bg-muted/20">
                      <div className="text-sm mb-2">
                        <span className="font-medium text-muted-foreground">
                          {language === "de" ? "Kategorie:" : "Category:"}
                        </span>
                        <span className="ml-2 font-semibold">
                          {selectedRisk.hazard_category || "-"}
                        </span>
                      </div>
                      {selectedRisk.description && (
                        <div className="text-sm text-muted-foreground mt-3 pt-3 border-t">
                          {selectedRisk.description}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notes Section */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm">
                        {language === "de" ? "Notizen" : "Notes"}
                      </h4>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          if (!selectedRisk) return;
                          const { error } = await supabase
                            .from("risk_assessments")
                            .update({ notes: editableNotes })
                            .eq("id", selectedRisk.id);

                          if (error) {
                            toast({
                              title: language === "de" ? "Fehler" : "Error",
                              description:
                                language === "de"
                                  ? "Notizen konnten nicht gespeichert werden"
                                  : "Failed to save notes",
                              variant: "destructive",
                            });
                          } else {
                            toast({
                              title: language === "de" ? "Erfolg" : "Success",
                              description:
                                language === "de"
                                  ? "Notizen erfolgreich gespeichert"
                                  : "Notes saved successfully",
                            });
                            fetchData();
                          }
                        }}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {language === "de" ? "Speichern" : "Save Notes"}
                      </Button>
                    </div>
                    <Textarea
                      placeholder={
                        language === "de"
                          ? "Notizen zu dieser Risikobewertung hinzufügen..."
                          : "Add notes about this risk assessment..."
                      }
                      value={editableNotes}
                      onChange={(e) => setEditableNotes(e.target.value)}
                      rows={5}
                      className="w-full resize-none"
                    />
                  </div>
                </div>
              </div>
              </>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsMatrixDialogOpen(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Approval Dialog */}
        <Dialog
          open={isApprovalDialogOpen}
          onOpenChange={setIsApprovalDialogOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve Risk Assessment</DialogTitle>
              <DialogDescription>
                Leave an optional comment and approve this risk assessment
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="approval-comment">Comment (optional)</Label>
                <Textarea
                  id="approval-comment"
                  placeholder="Add your approval comment here..."
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  rows={4}
                  className="mt-2"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsApprovalDialogOpen(false);
                  setApprovalComment("");
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleApproveRisk}>
                <Check className="w-4 h-4 mr-2" />
                Approve
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
