import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  FileText,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  ClipboardCheck,
  Shield,
  Stethoscope,
  ListChecks,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ReportStats {
  totalEmployees: number;
  totalRiskAssessments: number;
  totalAudits: number;
  totalTasks: number;
  totalIncidents: number;
  totalMeasures: number;
  totalTrainings: number;
  totalCheckUps: number;
  completedAudits: number;
  completedTasks: number;
  completedMeasures: number;
  openIncidents: number;
  trainingCompliance: number;
}

interface TrainingStatus {
  employee_name: string;
  total_required: number;
  completed: number;
  expired: number;
  compliance_rate: number;
}

interface CategoryCard {
  id: string;
  title: string;
  icon: React.ReactNode;
  count: number;
  subtitle: string;
  color: string;
  bgColor: string;
  hoverColor: string;
  tabValue?: string;
}

export default function Reports() {
  const { user, companyId, loading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [stats, setStats] = useState<ReportStats>({
    totalEmployees: 0,
    totalRiskAssessments: 0,
    totalAudits: 0,
    totalTasks: 0,
    totalIncidents: 0,
    totalMeasures: 0,
    totalTrainings: 0,
    totalCheckUps: 0,
    completedAudits: 0,
    completedTasks: 0,
    completedMeasures: 0,
    openIncidents: 0,
    trainingCompliance: 0,
  });

  const [trainingMatrix, setTrainingMatrix] = useState<TrainingStatus[]>([]);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (companyId) {
      fetchReportData();
    }
  }, [companyId]);

  const fetchReportData = async () => {
    if (!companyId) return;

    try {
      // Fetch all stats in parallel
      const [
        employeesRes,
        risksRes,
        auditsRes,
        tasksRes,
        incidentsRes,
        measuresRes,
        trainingsRes,
        checkUpsRes,
        completedAuditsRes,
        completedTasksRes,
        completedMeasuresRes,
        openIncidentsRes,
        trainingRes,
      ] = await Promise.all([
        supabase
          .from("employees")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId),
        supabase
          .from("risk_assessments")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId),
        supabase
          .from("audits")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId),
        supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId),
        supabase
          .from("incidents" as any)
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId),
        supabase
          .from("measures" as any)
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId),
        supabase
          .from("courses")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId),
        supabase
          .from("employee_checkups")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId),
        supabase
          .from("audits")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .eq("status", "completed"),
        supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .eq("status", "completed"),
        supabase
          .from("measures" as any)
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .eq("status", "completed"),
        supabase
          .from("incidents" as any)
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .eq("investigation_status", "open"),
        supabase
          .from("training_records")
          .select("*")
          .eq("company_id", companyId),
      ]);

      const totalTraining = trainingRes.data?.length || 0;
      const completedTraining =
        trainingRes.data?.filter((t) => t.status === "completed").length || 0;
      const trainingComplianceRate =
        totalTraining > 0
          ? Math.round((completedTraining / totalTraining) * 100)
          : 0;

      setStats({
        totalEmployees: employeesRes.count || 0,
        totalRiskAssessments: risksRes.count || 0,
        totalAudits: auditsRes.count || 0,
        totalTasks: tasksRes.count || 0,
        totalIncidents: incidentsRes.count || 0,
        totalMeasures: measuresRes.count || 0,
        totalTrainings: trainingsRes.count || 0,
        totalCheckUps: checkUpsRes.count || 0,
        completedAudits: completedAuditsRes.count || 0,
        completedTasks: completedTasksRes.count || 0,
        completedMeasures: completedMeasuresRes.count || 0,
        openIncidents: openIncidentsRes.count || 0,
        trainingCompliance: trainingComplianceRate,
      });

      // Build training matrix
      await fetchTrainingMatrix();
    } catch (error: any) {
      console.error("Error fetching report data:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch report data",
        variant: "destructive",
      });
    }
  };

  const fetchTrainingMatrix = async () => {
    if (!companyId) return;

    try {
      const { data: employees, error: empError } = await supabase
        .from("employees")
        .select("id, full_name")
        .eq("company_id", companyId)
        .eq("is_active", true);

      if (empError) throw empError;

      const matrix: TrainingStatus[] = [];

      for (const emp of employees || []) {
        const { data: trainings, error: trainError } = await supabase
          .from("training_records")
          .select("*")
          .eq("employee_id", emp.id);

        if (trainError) throw trainError;

        const total = trainings?.length || 0;
        const completed =
          trainings?.filter((t) => t.status === "completed").length || 0;
        const expired =
          trainings?.filter((t) => t.status === "expired").length || 0;
        const compliance =
          total > 0 ? Math.round((completed / total) * 100) : 0;

        matrix.push({
          employee_name: emp.full_name,
          total_required: total,
          completed,
          expired,
          compliance_rate: compliance,
        });
      }

      setTrainingMatrix(matrix);
    } catch (error: any) {
      console.error("Error fetching training matrix:", error);
    }
  };

  const exportReport = () => {
    toast({
      title: "Coming Soon",
      description: "PDF export functionality will be available soon",
    });
  };

  // Define category cards
  const categoryCards: CategoryCard[] = [
    {
      id: "risk-assessments",
      title: t("reports.riskAssessments"),
      icon: <Shield className="w-8 h-8" />,
      count: stats.totalRiskAssessments,
      subtitle: t("reports.totalGBU"),
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      hoverColor: "hover:bg-orange-100",
      tabValue: "overview",
    },
    {
      id: "audits",
      title: t("reports.safetyAudits"),
      icon: <ClipboardCheck className="w-8 h-8" />,
      count: stats.totalAudits,
      subtitle: `${stats.completedAudits} ${t("reports.completed")}`,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      hoverColor: "hover:bg-blue-100",
      tabValue: "overview",
    },
    {
      id: "incidents",
      title: t("reports.incidents"),
      icon: <AlertTriangle className="w-8 h-8" />,
      count: stats.totalIncidents,
      subtitle: `${stats.openIncidents} Open Cases`,
      color: "text-red-600",
      bgColor: "bg-red-50",
      hoverColor: "hover:bg-red-100",
      tabValue: "incidents",
    },
    {
      id: "trainings",
      title: "Trainings",
      icon: <GraduationCap className="w-8 h-8" />,
      count: stats.totalTrainings,
      subtitle: `${stats.trainingCompliance}% Compliance`,
      color: "text-green-600",
      bgColor: "bg-green-50",
      hoverColor: "hover:bg-green-100",
      tabValue: "training",
    },
    {
      id: "measures",
      title: t("reports.measures"),
      icon: <CheckCircle className="w-8 h-8" />,
      count: stats.totalMeasures,
      subtitle: `${stats.completedMeasures} ${t("reports.completed")}`,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      hoverColor: "hover:bg-purple-100",
      tabValue: "measures",
    },
    {
      id: "tasks",
      title: "Tasks",
      icon: <ListChecks className="w-8 h-8" />,
      count: stats.totalTasks,
      subtitle: `${stats.completedTasks} ${t("reports.completed")}`,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      hoverColor: "hover:bg-indigo-100",
      tabValue: "overview",
    },
    {
      id: "checkups",
      title: "Check-Ups",
      icon: <Stethoscope className="w-8 h-8" />,
      count: stats.totalCheckUps,
      subtitle: "Health Monitoring",
      color: "text-teal-600",
      bgColor: "bg-teal-50",
      hoverColor: "hover:bg-teal-100",
      tabValue: "overview",
    },
  ];

  const handleCategoryClick = (card: CategoryCard) => {
    if (card.tabValue) {
      setActiveTab(card.tabValue);
      // Scroll to tabs section
      setTimeout(() => {
        document.getElementById("reports-tabs")?.scrollIntoView({ 
          behavior: "smooth",
          block: "start"
        });
      }, 100);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Clean Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/dashboard")}
                className="hover:bg-primary/10"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <BarChart3 className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">
                    HSE Reports & Analytics
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Comprehensive compliance and performance dashboards
                  </p>
                </div>
              </div>
            </div>
            <Button onClick={exportReport} size="lg" className="shadow-md">
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-8 py-12 max-w-[1600px]">
        {/* Overview Section - Single Card */}
        <section className="mb-20">
          <div className="mb-10">
            <h2 className="text-2xl font-bold mb-3">Overview</h2>
            <p className="text-muted-foreground text-base">
              Key metrics and statistics at a glance
            </p>
          </div>

          <div className="max-w-xl">
            <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-br from-card to-card/80">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
                <div>
                  <CardTitle className="text-lg font-semibold mb-1">
                    Training Compliance
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">Overall compliance rate</p>
                </div>
                <div className="w-14 h-14 rounded-xl bg-green-50 flex items-center justify-center shadow-sm">
                  <CheckCircle className="h-7 w-7 text-green-600" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-5xl font-bold text-green-600">
                  {stats.trainingCompliance}%
                </div>
                <Progress 
                  value={stats.trainingCompliance} 
                  className="h-3" 
                />
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Reporting Categories Section */}
        <section className="mb-20">
          <div className="mb-10">
            <h2 className="text-2xl font-bold mb-3">Reporting Categories</h2>
            <p className="text-muted-foreground text-base">
              Click on a category to view detailed reports
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {categoryCards.map((card) => (
              <Card
                key={card.id}
                className={`border-0 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group ${card.hoverColor}`}
                onClick={() => handleCategoryClick(card)}
              >
                <CardContent className="p-8">
                  <div className="flex items-start justify-between mb-6">
                    <div
                      className={`w-16 h-16 rounded-2xl ${card.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-md`}
                    >
                      <div className={card.color}>{card.icon}</div>
                    </div>
                    <TrendingUp className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all duration-300" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-3 group-hover:text-primary transition-colors">
                      {card.title}
                    </h3>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-4xl font-bold">{card.count}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {card.subtitle}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Detailed Reports with Tabs */}
        <section id="reports-tabs">
          <div className="mb-10">
            <h2 className="text-2xl font-bold mb-3">Detailed Reports</h2>
            <p className="text-muted-foreground text-base">
              In-depth analysis and data tables
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-10">
            <TabsList className="bg-card border shadow-md p-1.5 gap-1">
              <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6 py-2.5 font-medium">
                Overview
              </TabsTrigger>
              <TabsTrigger value="training" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6 py-2.5 font-medium">
                Training Matrix
              </TabsTrigger>
              <TabsTrigger value="incidents" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6 py-2.5 font-medium">
                Incidents
              </TabsTrigger>
              <TabsTrigger value="measures" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6 py-2.5 font-medium">
                Measures
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="border-0 shadow-xl hover:shadow-2xl transition-shadow duration-300">
                  <CardHeader className="pb-6">
                    <CardTitle className="text-xl font-bold">Audit Completion</CardTitle>
                    <CardDescription className="text-base">Safety audit metrics and progress</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-muted-foreground">
                        Total Audits
                      </span>
                      <Badge className="text-base px-4 py-1.5 font-semibold">{stats.totalAudits}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-muted-foreground">Completed</span>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-base px-4 py-1.5 font-semibold">
                        {stats.completedAudits}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Completion Rate</span>
                      <span className="text-lg font-bold">
                        {stats.totalAudits > 0
                          ? Math.round(
                              (stats.completedAudits / stats.totalAudits) * 100
                            )
                          : 0}
                        %
                      </span>
                    </div>
                    <Progress
                      value={
                        stats.totalAudits > 0
                          ? (stats.completedAudits / stats.totalAudits) * 100
                          : 0
                      }
                      className="h-3 mt-3"
                    />
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-xl hover:shadow-2xl transition-shadow duration-300">
                  <CardHeader className="pb-6">
                    <CardTitle className="text-xl font-bold">Task Completion Status</CardTitle>
                    <CardDescription className="text-base">Corrective action tracking</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Total Tasks</span>
                      <Badge className="text-base px-3 py-1">{stats.totalTasks}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Completed</span>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-base px-3 py-1">
                        {stats.completedTasks}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Completion Rate</span>
                      <span className="text-lg font-bold">
                        {stats.totalTasks > 0
                          ? Math.round(
                              (stats.completedTasks / stats.totalTasks) * 100
                            )
                          : 0}
                        %
                      </span>
                    </div>
                    <Progress
                      value={
                        stats.totalTasks > 0
                          ? (stats.completedTasks / stats.totalTasks) * 100
                          : 0
                      }
                      className="h-3 mt-3"
                    />
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-xl hover:shadow-2xl transition-shadow duration-300">
                  <CardHeader className="pb-6">
                    <CardTitle className="text-xl font-bold">Incident Overview</CardTitle>
                    <CardDescription className="text-base">Workplace incident statistics</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Total Incidents</span>
                      <Badge className="text-base px-3 py-1">{stats.totalIncidents}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        Under Investigation
                      </span>
                      <Badge variant="destructive" className="text-base px-3 py-1">{stats.openIncidents}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Closed</span>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-base px-3 py-1">
                        {stats.totalIncidents - stats.openIncidents}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-xl hover:shadow-2xl transition-shadow duration-300">
                  <CardHeader className="pb-6">
                    <CardTitle className="text-xl font-bold">Measures Status</CardTitle>
                    <CardDescription className="text-base">
                      Corrective & preventive measures
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Total Measures</span>
                      <Badge className="text-base px-3 py-1">{stats.totalMeasures}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Completed</span>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-base px-3 py-1">
                        {stats.completedMeasures}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Completion Rate</span>
                      <span className="text-lg font-bold">
                        {stats.totalMeasures > 0
                          ? Math.round(
                              (stats.completedMeasures / stats.totalMeasures) * 100
                            )
                          : 0}
                        %
                      </span>
                    </div>
                    <Progress
                      value={
                        stats.totalMeasures > 0
                          ? (stats.completedMeasures / stats.totalMeasures) * 100
                          : 0
                      }
                      className="h-3 mt-3"
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Training Matrix Tab */}
            <TabsContent value="training">
              <Card className="border-0 shadow-xl hover:shadow-2xl transition-shadow duration-300">
                <CardHeader className="pb-6">
                  <CardTitle className="text-xl font-bold">Employee Training Compliance Matrix</CardTitle>
                  <CardDescription className="text-base">
                    Complete overview of training status for all employees
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="rounded-lg border-2 shadow-sm overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="font-bold text-base py-4">Employee Name</TableHead>
                          <TableHead className="font-bold text-base py-4">Total Required</TableHead>
                          <TableHead className="font-bold text-base py-4">Completed</TableHead>
                          <TableHead className="font-bold text-base py-4">Expired</TableHead>
                          <TableHead className="font-bold text-base py-4">Compliance Rate</TableHead>
                          <TableHead className="font-bold text-base py-4">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {trainingMatrix.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={6}
                              className="text-center py-12 text-muted-foreground"
                            >
                              No training data available
                            </TableCell>
                          </TableRow>
                        ) : (
                          trainingMatrix.map((item, idx) => (
                            <TableRow key={idx} className="hover:bg-muted/30 transition-colors">
                              <TableCell className="font-semibold py-4">
                                {item.employee_name}
                              </TableCell>
                              <TableCell className="py-4">{item.total_required}</TableCell>
                              <TableCell className="py-4">
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  {item.completed}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-4">
                                {item.expired > 0 ? (
                                  <Badge variant="destructive">
                                    {item.expired}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">0</span>
                                )}
                              </TableCell>
                              <TableCell className="font-semibold py-4">{item.compliance_rate}%</TableCell>
                              <TableCell className="py-4">
                                {item.compliance_rate >= 80 ? (
                                  <Badge className="bg-green-100 text-green-800 border-green-200">
                                    Compliant
                                  </Badge>
                                ) : item.compliance_rate >= 50 ? (
                                  <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                                    Needs Attention
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive">Non-Compliant</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Incidents Tab */}
            <TabsContent value="incidents">
              <Card className="border-0 shadow-xl hover:shadow-2xl transition-shadow duration-300">
                <CardHeader className="pb-6">
                  <CardTitle className="text-xl font-bold">Incident Analytics</CardTitle>
                  <CardDescription className="text-base">
                    Detailed incident reporting and trends
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="border shadow-sm">
                      <CardContent className="pt-8 pb-8">
                        <div className="text-center">
                          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="h-8 w-8 text-red-600" />
                          </div>
                          <div className="text-4xl font-bold mb-2">
                            {stats.totalIncidents}
                          </div>
                          <p className="text-sm text-muted-foreground font-medium">
                            Total Incidents
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border shadow-sm">
                      <CardContent className="pt-8 pb-8">
                        <div className="text-center">
                          <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-4">
                            <BarChart3 className="h-8 w-8 text-orange-600" />
                          </div>
                          <div className="text-4xl font-bold mb-2">
                            {stats.openIncidents}
                          </div>
                          <p className="text-sm text-muted-foreground font-medium">
                            Under Investigation
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border shadow-sm">
                      <CardContent className="pt-8 pb-8">
                        <div className="text-center">
                          <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                          </div>
                          <div className="text-4xl font-bold mb-2">
                            {stats.totalIncidents - stats.openIncidents}
                          </div>
                          <p className="text-sm text-muted-foreground font-medium">
                            Closed Cases
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Measures Tab */}
            <TabsContent value="measures">
              <Card className="border-0 shadow-xl hover:shadow-2xl transition-shadow duration-300">
                <CardHeader className="pb-6">
                  <CardTitle className="text-xl font-bold">Measures & Controls Overview</CardTitle>
                  <CardDescription className="text-base">
                    Tracking of all corrective and preventive actions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="border shadow-sm">
                      <CardContent className="pt-8 pb-8">
                        <div className="text-center">
                          <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                            <FileText className="h-8 w-8 text-blue-600" />
                          </div>
                          <div className="text-4xl font-bold mb-2">
                            {stats.totalMeasures}
                          </div>
                          <p className="text-sm text-muted-foreground font-medium">
                            Total Measures
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border shadow-sm">
                      <CardContent className="pt-8 pb-8">
                        <div className="text-center">
                          <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-4">
                            <TrendingUp className="h-8 w-8 text-orange-600" />
                          </div>
                          <div className="text-4xl font-bold mb-2">
                            {stats.totalMeasures - stats.completedMeasures}
                          </div>
                          <p className="text-sm text-muted-foreground font-medium">
                            In Progress
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border shadow-sm">
                      <CardContent className="pt-8 pb-8">
                        <div className="text-center">
                          <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                          </div>
                          <div className="text-4xl font-bold mb-2">
                            {stats.completedMeasures}
                          </div>
                          <p className="text-sm text-muted-foreground font-medium">
                            Completed
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </section>
      </main>
    </div>
  );
}
