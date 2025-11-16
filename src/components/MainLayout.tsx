import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Shield,
  Users,
  FileCheck,
  AlertTriangle,
  FileText,
  ListTodo,
  Settings,
  LogOut,
  MessageSquare,
  CheckCircle,
  BarChart,
  Building2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import NotificationBell from "@/components/NotificationBell";

type Props = {
  children: ReactNode;
};

export default function MainLayout({ children }: Props) {
  const { userRole, signOut } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const getLinkClasses = (path: string) => {
    return isActive(path)
      ? "flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-medium"
      : "flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800";
  };

  const getSuperAdminLinkClasses = (path: string) => {
    return isActive(path)
      ? "flex items-center gap-3 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 font-medium border-2 border-red-300 dark:border-red-700"
      : "flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-950 border-2 border-red-200 dark:border-red-800";
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col h-screen sticky top-0">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                SafetyHub
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                HSE Management
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-1">
            <li>
              <Link
                to="/dashboard"
                className={getLinkClasses("/dashboard")}
              >
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
                    d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z"
                  />
                </svg>
                <span>Dashboard</span>
              </Link>
            </li>

            {/* Super Admin Section */}
            {userRole === "super_admin" && (
              <>
                <li className="pt-4 pb-2">
                  <div className="px-4 flex items-center gap-2">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-red-500 to-transparent"></div>
                    <Badge variant="destructive" className="text-xs font-bold">
                      SUPER ADMIN
                    </Badge>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-red-500 to-transparent"></div>
                  </div>
                </li>
                <li>
                  <Link
                    to="/super-admin/dashboard"
                    className={getSuperAdminLinkClasses("/super-admin/dashboard")}
                  >
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span className="font-medium">Super Dashboard</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/super-admin/companies"
                    className={getSuperAdminLinkClasses("/super-admin/companies")}
                  >
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span>Manage Companies</span>
                  </Link>
                </li>
                <li className="pb-4">
                  <div className="px-4">
                    <div className="h-px bg-gradient-to-r from-transparent via-red-500 to-transparent"></div>
                  </div>
                </li>
              </>
            )}

            <li>
              <Link
                to="/employees"
                className={getLinkClasses("/employees")}
              >
                <Users className="w-5 h-5" />
                <span>Employees</span>
              </Link>
            </li>

            <li>
              <Link
                to="/activity-groups"
                className={getLinkClasses("/activity-groups")}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>Activity Groups</span>
              </Link>
            </li>

            <li>
              <Link
                to="/risk-assessments"
                className={getLinkClasses("/risk-assessments")}
              >
                <AlertTriangle className="w-5 h-5" />
                <span>Risk Assessments</span>
              </Link>
            </li>

            <li>
              <Link
                to="/measures"
                className={getLinkClasses("/measures")}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <span>Measures</span>
              </Link>
            </li>

            <li>
              <Link
                to="/audits"
                className={getLinkClasses("/audits")}
              >
                <FileCheck className="w-5 h-5" />
                <span>Audits</span>
              </Link>
            </li>

            <li>
              <Link
                to="/tasks"
                className={getLinkClasses("/tasks")}
              >
                <ListTodo className="w-5 h-5" />
                <span>Tasks</span>
              </Link>
            </li>

            <li>
              <Link
                to="/training"
                className={getLinkClasses("/training")}
              >
                <CheckCircle className="w-5 h-5" />
                <span>Training</span>
              </Link>
            </li>

            <li>
              <Link
                to="/incidents"
                className={getLinkClasses("/incidents")}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Incidents</span>
              </Link>
            </li>

            <li>
              <Link
                to="/settings"
                className={getLinkClasses("/settings")}
              >
                <Settings className="w-5 h-5" />
                <span>Settings</span>
              </Link>
            </li>

            {/* Move Messages / Documents / Reports to the bottom of the list */}
            <li>
              <Link
                to="/messages"
                className={getLinkClasses("/messages")}
              >
                <MessageSquare className="w-5 h-5" />
                <span>Messages</span>
              </Link>
            </li>

            <li>
              <Link
                to="/documents"
                className={getLinkClasses("/documents")}
              >
                <FileText className="w-5 h-5" />
                <span>Documents</span>
              </Link>
            </li>

            <li>
              <Link
                to="/reports"
                className={getLinkClasses("/reports")}
              >
                <BarChart className="w-5 h-5" />
                <span>Reports</span>
              </Link>
            </li>
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-semibold text-sm shadow-md">
              CA
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Company Admin
              </p>
              <Badge variant="secondary" className="text-xs mt-1">
                {userRole?.replace("_", " ")}
              </Badge>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        {/* Top Header with Notifications */}
        <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6">
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <NotificationBell />
          </div>
        </header>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
