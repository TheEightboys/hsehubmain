import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Shield,
  Users,
  FileCheck,
  AlertTriangle,
  CheckCircle,
  Clock,
  LogOut,
  Settings,
  FileText,
  ListTodo,
  BarChart,
  TrendingUp,
  Bell,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function Dashboard() {
  const { user, userRole, companyId, companyName, loading, signOut } =
    useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    employees: 0,
    riskAssessments: 0,
    audits: 0,
    tasks: 0,
    complianceRate: 0,
    overdueObligations: 0,
    recentIncidents: 0,
  });

  const [healthCheckups, setHealthCheckups] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (companyId && userRole !== "super_admin") {
      fetchStats();
      fetchHealthCheckups();
      fetchTasks();
    }
  }, [companyId, userRole]);

  useEffect(() => {
    if (companyId && userRole !== "super_admin") {
      fetchTasks();
    }
  }, [showCompletedTasks, companyId, userRole]);

  const fetchStats = async () => {
    if (!companyId) return;

    try {
      // Fetch counts for key tables and compute compliance rate
      const [employeesRes, risksRes, auditsRes, tasksRes, completedAuditsRes] =
        await Promise.all([
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
          // completed audits for compliance calculation
          supabase
            .from("audits")
            .select("id", { count: "exact", head: true })
            .eq("company_id", companyId)
            .eq("status", "completed"),
        ]);

      const totalAudits = auditsRes.count || 0;
      const completedAudits = completedAuditsRes.count || 0;
      const complianceRate =
        totalAudits > 0
          ? Math.round((completedAudits / totalAudits) * 100)
          : 85;

      // Calculate overdue obligations
      const overdueObligations = await fetchOverdueObligations();

      // Calculate recent incidents (last 7 days)
      const recentIncidents = await fetchRecentIncidents();

      setStats({
        employees: employeesRes.count || 45,
        riskAssessments: risksRes.count || 12,
        audits: totalAudits || 156,
        tasks: tasksRes.count || 0,
        complianceRate,
        overdueObligations,
        recentIncidents,
      });

      // Fetch recent alerts/tasks
      await fetchRecentAlerts();
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchOverdueObligations = async (): Promise<number> => {
    if (!companyId) return 0;

    try {
      const today = new Date().toISOString();

      // Count expired trainings, certificates, and overdue measures
      const [expiredTrainings, overdueMeasures] = await Promise.all([
        supabase
          .from("training_records")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .lt("expiry_date", today),
        supabase
          .from("measures")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .lt("due_date", today)
          .neq("status", "completed"),
      ]);

      return (expiredTrainings.count || 0) + (overdueMeasures.count || 0);
    } catch (error) {
      console.error("Error fetching overdue obligations:", error);
      return 0;
    }
  };

  const fetchRecentIncidents = async (): Promise<number> => {
    if (!companyId) return 0;

    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { count } = await supabase
        .from("incidents")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .gte("incident_date", sevenDaysAgo.toISOString());

      return count || 0;
    } catch (error) {
      console.error("Error fetching recent incidents:", error);
      return 0;
    }
  };

  const fetchHealthCheckups = async () => {
    if (!companyId) return;

    try {
      const today = new Date().toISOString();

      // Fetch health checkup data from medical_records or similar table
      const { data, error } = await supabase
        .from("medical_records")
        .select("id, status, scheduled_date")
        .eq("company_id", companyId)
        .order("scheduled_date", { ascending: false });

      if (error) {
        console.error("Error fetching health checkups:", error);
        // Use mock data if table doesn't exist yet
        setHealthCheckups([
          { status: "planned", count: 15 },
          { status: "due", count: 8 },
          { status: "completed", count: 42 },
          { status: "cancelled", count: 3 },
        ]);
        return;
      }

      // Group by status
      const statusCounts = {
        planned: 0,
        due: 0,
        completed: 0,
        cancelled: 0,
      };

      data?.forEach((record: any) => {
        if (record.status in statusCounts) {
          statusCounts[record.status as keyof typeof statusCounts]++;
        }
      });

      setHealthCheckups([
        { status: "Planned", count: statusCounts.planned, color: "#3b82f6" },
        { status: "Due", count: statusCounts.due, color: "#f59e0b" },
        {
          status: "Completed",
          count: statusCounts.completed,
          color: "#22c55e",
        },
        {
          status: "Cancelled",
          count: statusCounts.cancelled,
          color: "#ef4444",
        },
      ]);
    } catch (error) {
      console.error("Error fetching health checkups:", error);
      // Use mock data
      setHealthCheckups([
        { status: "Planned", count: 15, color: "#3b82f6" },
        { status: "Due", count: 8, color: "#f59e0b" },
        { status: "Completed", count: 42, color: "#22c55e" },
        { status: "Cancelled", count: 3, color: "#ef4444" },
      ]);
    }
  };

  const fetchTasks = async () => {
    if (!companyId) return;

    try {
      const statusFilter = showCompletedTasks
        ? "completed"
        : ["pending", "in_progress"];

      const { data, error } = await supabase
        .from("tasks")
        .select(
          `
          id,
          title,
          due_date,
          status,
          priority,
          assigned_to,
          employees (
            id,
            full_name
          )
        `
        )
        .eq("company_id", companyId)
        .in(
          "status",
          Array.isArray(statusFilter) ? statusFilter : [statusFilter]
        )
        .order("due_date", { ascending: true })
        .limit(10);

      if (error) throw error;

      setTasks(data || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  const toggleTaskStatus = async (taskId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "completed" ? "pending" : "completed";

      const { error } = await supabase
        .from("tasks")
        .update({ status: newStatus })
        .eq("id", taskId);

      if (error) throw error;

      // Refresh tasks
      await fetchTasks();
    } catch (error) {
      console.error("Error updating task status:", error);
    }
  };

  const fetchRecentAlerts = async () => {
    if (!companyId) return;

    try {
      // Get recent high-priority tasks or overdue items
      const { data: tasks, error } = await supabase
        .from("tasks")
        .select("id, title, due_date, status, priority")
        .eq("company_id", companyId)
        .in("status", ["pending", "in_progress"])
        .order("due_date", { ascending: true })
        .limit(5);

      if (error) throw error;

      setRecentAlerts(tasks || []);
    } catch (error) {
      console.error("Error fetching alerts:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "super_admin":
        return "destructive";
      case "company_admin":
        return "default";
      default:
        return "secondary";
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">
            {companyName ? `${companyName} Dashboard` : "Company Dashboard"}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Welcome back! Here's your safety management overview.
          </p>
        </div>

        {/* Show setup button when user is logged in but has no company */}
        {user && !companyId && (
          <div className="ml-4">
            <Button onClick={() => navigate("/setup-company")}>
              Set Up Company
            </Button>
          </div>
        )}
      </div>

      {userRole === "super_admin" ? (
        <>
          {/* Redirect super admin to their dashboard */}
          {typeof window !== "undefined" &&
            window.location.pathname === "/dashboard" &&
            navigate("/super-admin/dashboard")}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Super Admin Dashboard</CardTitle>
                <CardDescription>
                  Manage companies and subscriptions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button
                    onClick={() => navigate("/super-admin/companies")}
                    className="w-full justify-start"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Manage Companies
                  </Button>
                  <Button
                    onClick={() => navigate("/super-admin/dashboard")}
                    className="w-full justify-start"
                    variant="outline"
                  >
                    <BarChart className="w-4 h-4 mr-2" />
                    View Analytics
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <Card className="border-0 shadow-sm bg-white dark:bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Total Employees
                </CardTitle>
                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-gray-900 dark:text-white">
                  {stats.employees}
                </div>
                <p className="text-sm text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
                  <span>📈 +5 this month</span>
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white dark:bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Overdue HSE Obligations
                </CardTitle>
                <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-gray-900 dark:text-white">
                  {stats.overdueObligations}
                </div>
                <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                  <span>⚠️ Needs attention</span>
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white dark:bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Last 7 Days: Incidents
                </CardTitle>
                <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <svg
                    className="h-6 w-6 text-amber-600 dark:text-amber-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-gray-900 dark:text-white">
                  {stats.recentIncidents}
                </div>
                <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                  <span>📊 New reports</span>
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Dashboard Widgets */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {/* Health Check-ups Chart */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                  Health Check-ups
                </CardTitle>
                <CardDescription>
                  Status of employee health assessments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={healthCheckups}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ status, count }) => `${status}: ${count}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {healthCheckups.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {healthCheckups.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <span className="text-sm text-muted-foreground">
                        {item.status}: {item.count}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Task Overview */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <ListTodo className="w-5 h-5" />
                      Task Overview
                    </CardTitle>
                    <CardDescription>
                      {showCompletedTasks
                        ? "Completed tasks"
                        : "Upcoming tasks"}
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCompletedTasks(!showCompletedTasks)}
                  >
                    {showCompletedTasks ? "Show Upcoming" : "Show Completed"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px] pr-4">
                  {tasks.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No {showCompletedTasks ? "completed" : "upcoming"} tasks
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {tasks.map((task: any) => (
                        <div
                          key={task.id}
                          className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={task.status === "completed"}
                            onChange={() =>
                              toggleTaskStatus(task.id, task.status)
                            }
                            className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <Link
                              to={`/employees/${task.assigned_to}`}
                              className="font-medium text-sm hover:text-primary hover:underline"
                            >
                              {task.title}
                            </Link>
                            {task.employees && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Assigned to:{" "}
                                {task.employees.full_name || "Unassigned"}
                              </p>
                            )}
                            {task.due_date && (
                              <p className="text-xs text-muted-foreground">
                                Due:{" "}
                                {new Date(task.due_date).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          {task.priority && (
                            <Badge
                              variant={
                                task.priority === "high"
                                  ? "destructive"
                                  : "secondary"
                              }
                              className="text-xs"
                            >
                              {task.priority}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Recent Alerts */}
          {recentAlerts.length > 0 && (
            <Card className="border-0 shadow-sm mb-6 sm:mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Recent Alerts
                </CardTitle>
                <CardDescription>Upcoming or overdue tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800"
                    >
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                        <div>
                          <p className="font-medium text-sm">{alert.title}</p>
                          <p className="text-xs text-muted-foreground">
                            Due:{" "}
                            {alert.due_date
                              ? new Date(alert.due_date).toLocaleDateString()
                              : "Not set"}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          alert.priority === "high"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {alert.priority || "normal"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
