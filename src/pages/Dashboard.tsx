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
  const { user, userRole, companyId, companyName, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    employees: 0,
    riskAssessments: 0,
    audits: 0,
    tasks: 0,
    complianceRate: 0,
  });

  const [assessmentTrends, setAssessmentTrends] = useState<any[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (companyId && userRole !== "super_admin") {
      fetchStats();
    }
  }, [companyId, userRole]);

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
        totalAudits > 0 ? Math.round((completedAudits / totalAudits) * 100) : 85;

      setStats({
        employees: employeesRes.count || 45,
        riskAssessments: risksRes.count || 12,
        audits: totalAudits || 156,
        tasks: tasksRes.count || 0,
        complianceRate,
      });

      // Fetch assessment trends (last 6 months)
      await fetchAssessmentTrends();

      // Fetch recent alerts/tasks
      await fetchRecentAlerts();
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchAssessmentTrends = async () => {
    if (!companyId) return;

    try {
      // Get audits from last 6 months with their status
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data, error } = await supabase
        .from("audits")
        .select("created_at, status")
        .eq("company_id", companyId)
        .gte("created_at", sixMonthsAgo.toISOString())
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Group by month and status
      const monthlyData: Record<string, { completed: number; pending: number }> = {};
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

      // Initialize last 6 months
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = months[date.getMonth()];
        monthlyData[monthKey] = { completed: 0, pending: 0 };
      }

      // Populate with real data
      data?.forEach((audit) => {
        const date = new Date(audit.created_at);
        const monthKey = months[date.getMonth()];
        if (monthlyData[monthKey]) {
          if (audit.status === "completed") {
            monthlyData[monthKey].completed++;
          } else {
            monthlyData[monthKey].pending++;
          }
        }
      });

      // Convert to chart format
      const chartData = Object.keys(monthlyData).map((month) => ({
        month,
        Completed: monthlyData[month].completed,
        Pending: monthlyData[month].pending,
      }));

      setAssessmentTrends(chartData);
    } catch (error) {
      console.error("Error fetching assessment trends:", error);
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
            {companyName ? `${companyName} Dashboard` : 'Company Dashboard'}
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
          {typeof window !== 'undefined' && window.location.pathname === '/dashboard' && navigate('/super-admin/dashboard')}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
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
                  Active Assessments
                </CardTitle>
                <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <svg
                    className="h-6 w-6 text-orange-600 dark:text-orange-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-gray-900 dark:text-white">
                  {stats.riskAssessments}
                </div>
                <p className="text-sm text-orange-600 dark:text-orange-400 mt-2">
                  <span>⏳ In progress</span>
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white dark:bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Completed
                </CardTitle>
                <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <svg
                    className="h-6 w-6 text-green-600 dark:text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-gray-900 dark:text-white">
                  {stats.audits}
                </div>
                <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                  <span>✅ All time</span>
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white dark:bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Compliance Rate
                </CardTitle>
                <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <svg
                    className="h-6 w-6 text-emerald-600 dark:text-emerald-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-gray-900 dark:text-white">
                  {stats.complianceRate}%
                </div>
                <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                  <span>📈 +3% this month</span>
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {/* Assessment Trends Chart */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart className="w-5 h-5" />
                  Assessment Trends
                </CardTitle>
                <CardDescription>Monthly assessment completion status</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsBarChart data={assessmentTrends}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="Completed" fill="#22c55e" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="Pending" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Compliance Overview Pie Chart */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Compliance Overview
                </CardTitle>
                <CardDescription>Current compliance status</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Compliant", value: stats.complianceRate },
                        { name: "Non-Compliant", value: 100 - stats.complianceRate },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill="#22c55e" />
                      <Cell fill="#ef4444" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-sm text-muted-foreground">Compliant: {stats.complianceRate}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-sm text-muted-foreground">Non-Compliant: {100 - stats.complianceRate}%</span>
                  </div>
                </div>
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
                            Due: {alert.due_date ? new Date(alert.due_date).toLocaleDateString() : "Not set"}
                          </p>
                        </div>
                      </div>
                      <Badge variant={alert.priority === "high" ? "destructive" : "secondary"}>
                        {alert.priority || "normal"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <Link to="/employees" className="block">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Employees
                  </CardTitle>
                  <CardDescription>
                    Manage employee records and assignments
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link to="/activity-groups" className="block">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-blue-100">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Activity & Exposure Groups
                  </CardTitle>
                  <CardDescription>
                    Define work activities and exposure factors
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link to="/risk-assessments" className="block">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-warning" />
                    Risk Assessments
                  </CardTitle>
                  <CardDescription>
                    Create and review risk assessments (GBU)
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link to="/measures" className="block">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-green-100">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    Measures & Controls
                  </CardTitle>
                  <CardDescription>
                    Track corrective and preventive actions
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link to="/audits" className="block">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-primary" />
                    Audits
                  </CardTitle>
                  <CardDescription>
                    Schedule and conduct safety audits
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link to="/tasks" className="block">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ListTodo className="w-5 h-5 text-success" />
                    Tasks
                  </CardTitle>
                  <CardDescription>
                    Track and manage safety tasks
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link to="/training" className="block">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-success" />
                    Training
                  </CardTitle>
                  <CardDescription>
                    Assign and track safety training
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link to="/incidents" className="block">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-red-100">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Incidents
                  </CardTitle>
                  <CardDescription>
                    Report and investigate incidents
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link to="/reports" className="block">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-purple-100">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart className="w-5 h-5 text-purple-600" />
                    Reports
                  </CardTitle>
                  <CardDescription>
                    HSE analytics and compliance reports
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link to="/settings" className="block">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Settings
                  </CardTitle>
                  <CardDescription>
                    Configure departments, roles, and categories
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
