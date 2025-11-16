import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Users,
  TrendingUp,
  DollarSign,
  AlertCircle,
} from "lucide-react";
import { Link } from "react-router-dom";

interface DashboardStats {
  totalCompanies: number;
  activeCompanies: number;
  trialCompanies: number;
  totalRevenue: number;
  totalUsers: number;
}

export default function SuperAdminDashboard() {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalCompanies: 0,
    activeCompanies: 0,
    trialCompanies: 0,
    totalRevenue: 0,
    totalUsers: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [recentCompanies, setRecentCompanies] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && (!user || userRole !== "super_admin")) {
      navigate("/dashboard");
    }
  }, [user, userRole, loading, navigate]);

  useEffect(() => {
    if (user && userRole === "super_admin") {
      fetchStats();
      fetchRecentCompanies();
    }
  }, [user, userRole]);

  const fetchStats = async () => {
    try {
      setLoadingStats(true);

      // Fetch total companies
      const { count: totalCompanies } = await supabase
        .from("companies")
        .select("id", { count: "exact", head: true });

      // Fetch active companies
      const { count: activeCompanies } = await supabase
        .from("companies")
        .select("id", { count: "exact", head: true })
        .eq("subscription_status", "active");

      // Fetch trial companies
      const { count: trialCompanies } = await supabase
        .from("companies")
        .select("id", { count: "exact", head: true })
        .eq("subscription_status", "trial");

      // Fetch total users
      const { count: totalUsers } = await supabase
        .from("user_roles")
        .select("id", { count: "exact", head: true });

      // Calculate revenue (simplified - sum of active subscriptions)
      const { data: activeSubscriptions } = await supabase
        .from("companies")
        .select("subscription_tier")
        .eq("subscription_status", "active");

      const tierPrices: Record<string, number> = {
        basic: 29.99,
        standard: 79.99,
        premium: 149.99,
      };

      const totalRevenue =
        activeSubscriptions?.reduce((sum, company) => {
          return sum + (tierPrices[company.subscription_tier] || 0);
        }, 0) || 0;

      setStats({
        totalCompanies: totalCompanies || 0,
        activeCompanies: activeCompanies || 0,
        trialCompanies: trialCompanies || 0,
        totalRevenue,
        totalUsers: totalUsers || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchRecentCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentCompanies(data || []);
    } catch (error) {
      console.error("Error fetching recent companies:", error);
    }
  };

  if (loading || loadingStats) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Super Admin Dashboard</h2>
        <p className="text-muted-foreground">
          Manage companies, subscriptions, and system-wide settings
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <Card className="border-0 shadow-sm bg-white dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Total Companies
            </CardTitle>
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-gray-900 dark:text-white">
              {stats.totalCompanies}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              All registered tenants
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Active Subscriptions
            </CardTitle>
            <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-gray-900 dark:text-white">
              {stats.activeCompanies}
            </div>
            <p className="text-sm text-green-600 dark:text-green-400 mt-2">
              Paying customers
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Trial Accounts
            </CardTitle>
            <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-gray-900 dark:text-white">
              {stats.trialCompanies}
            </div>
            <p className="text-sm text-orange-600 dark:text-orange-400 mt-2">
              Evaluation phase
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Monthly Revenue
            </CardTitle>
            <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-gray-900 dark:text-white">
              ${stats.totalRevenue.toFixed(0)}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              From active plans
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Total Users
            </CardTitle>
            <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <Users className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-gray-900 dark:text-white">
              {stats.totalUsers}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Across all companies
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Companies */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Companies</CardTitle>
              <CardDescription>
                Latest registered organizations
              </CardDescription>
            </div>
            <Link
              to="/super-admin/companies"
              className="text-sm text-primary hover:underline"
            >
              View All →
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentCompanies.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No companies registered yet
              </p>
            ) : (
              recentCompanies.map((company) => (
                <div
                  key={company.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{company.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {company.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge
                      variant={
                        company.subscription_status === "active"
                          ? "default"
                          : company.subscription_status === "trial"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {company.subscription_tier}
                    </Badge>
                    <Badge
                      variant={
                        company.subscription_status === "active"
                          ? "default"
                          : company.subscription_status === "trial"
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {company.subscription_status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
