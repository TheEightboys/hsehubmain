import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function AuthDebug() {
  const { user, session, userRole, companyId, loading, refreshUserRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleRefresh = async () => {
    toast({
      title: "Refreshing...",
      description: "Fetching latest auth state",
    });
    await refreshUserRole();
    toast({
      title: "Refreshed!",
      description: "Auth state updated",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Auth Debug Panel</h1>
          <div className="flex gap-2">
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => navigate("/dashboard")}>
              Go to Dashboard
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Authentication Status</CardTitle>
            <CardDescription>Current auth state and session information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Loading</p>
                <div className="flex items-center gap-2 mt-1">
                  {loading ? (
                    <>
                      <XCircle className="w-5 h-5 text-yellow-500" />
                      <span className="font-medium">Yes</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <span className="font-medium">No</span>
                    </>
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Authenticated</p>
                <div className="flex items-center gap-2 mt-1">
                  {user ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <span className="font-medium">Yes</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-red-500" />
                      <span className="font-medium">No</span>
                    </>
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Has Company</p>
                <div className="flex items-center gap-2 mt-1">
                  {companyId ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <span className="font-medium">Yes</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-red-500" />
                      <span className="font-medium">No</span>
                    </>
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Has Role</p>
                <div className="flex items-center gap-2 mt-1">
                  {userRole ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <Badge>{userRole}</Badge>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-red-500" />
                      <span className="font-medium">No</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Details</CardTitle>
          </CardHeader>
          <CardContent>
            {user ? (
              <div className="space-y-2 font-mono text-sm">
                <div>
                  <span className="text-muted-foreground">ID:</span>{" "}
                  <span className="font-medium">{user.id}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Email:</span>{" "}
                  <span className="font-medium">{user.email}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Created:</span>{" "}
                  <span className="font-medium">{user.created_at}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Company ID:</span>{" "}
                  <span className="font-medium">{companyId || "(not assigned)"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Role:</span>{" "}
                  <span className="font-medium">{userRole || "(not assigned)"}</span>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No user session</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Session Details</CardTitle>
          </CardHeader>
          <CardContent>
            {session ? (
              <div className="space-y-2 font-mono text-sm">
                <div>
                  <span className="text-muted-foreground">Access Token:</span>{" "}
                  <span className="font-medium truncate block">{session.access_token.substring(0, 50)}...</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Expires:</span>{" "}
                  <span className="font-medium">{new Date(session.expires_at! * 1000).toLocaleString()}</span>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No active session</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
          <CardHeader>
            <CardTitle className="text-yellow-900 dark:text-yellow-500">Troubleshooting</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {!user && (
              <div>
                <p className="font-medium text-red-600 dark:text-red-400">❌ Not Authenticated</p>
                <p className="text-muted-foreground">You need to sign in first.</p>
                <Button className="mt-2" onClick={() => navigate("/auth")}>
                  Go to Sign In
                </Button>
              </div>
            )}
            
            {user && !companyId && (
              <div>
                <p className="font-medium text-yellow-600 dark:text-yellow-400">⚠️ No Company Assigned</p>
                <p className="text-muted-foreground">
                  Your account exists but isn't linked to a company. Solutions:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                  <li>If you just registered: <strong>Sign out and sign back in</strong></li>
                  <li>If still not working: Check database for user_roles entry</li>
                  <li>Or register a new company at /register-company</li>
                </ul>
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" onClick={handleRefresh}>
                    Try Refresh
                  </Button>
                  <Button onClick={() => navigate("/register-company")}>
                    Register Company
                  </Button>
                </div>
              </div>
            )}

            {user && companyId && (
              <div>
                <p className="font-medium text-green-600 dark:text-green-400">✅ All Good!</p>
                <p className="text-muted-foreground">
                  Your account is properly configured. You can access all features.
                </p>
                <Button className="mt-2" onClick={() => navigate("/dashboard")}>
                  Go to Dashboard
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
