import { useEffect, useState } from "react";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";

type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Pencil, Trash2, Save, X } from "lucide-react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const baseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

export default function Settings() {
  const { user, loading, companyId, userRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loadingData, setLoadingData] = useState(false);
  const [activeTab, setActiveTab] = useState("departments");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteItem, setDeleteItem] = useState<any>(null);

  // State for each master data type
  const [departments, setDepartments] = useState<Tables<"departments">[]>([]);
  const [jobRoles, setJobRoles] = useState<Tables<"job_roles">[]>([]);
  const [exposureGroups, setExposureGroups] = useState<
    Tables<"exposure_groups">[]
  >([]);
  const [riskCategories, setRiskCategories] = useState<
    Tables<"risk_categories">[]
  >([]);
  const [trainingTypes, setTrainingTypes] = useState<
    Tables<"training_types">[]
  >([]);
  const [auditCategories, setAuditCategories] = useState<
    Tables<"audit_categories">[]
  >([]);

  const form = useForm({
    resolver: zodResolver(baseSchema),
    defaultValues: { name: "", description: "" },
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
    if (user && companyId) {
      fetchAllData();
    }
  }, [user, loading, navigate, companyId]);

  const fetchAllData = async () => {
    if (!companyId) return;

    setLoadingData(true);
    try {
      const [depts, roles, exposure, risk, training, audit] = await Promise.all(
        [
          supabase.from("departments").select("*").eq("company_id", companyId),
          supabase.from("job_roles").select("*").eq("company_id", companyId),
          supabase
            .from("exposure_groups")
            .select("*")
            .eq("company_id", companyId),
          supabase
            .from("risk_categories")
            .select("*")
            .eq("company_id", companyId),
          supabase
            .from("training_types")
            .select("*")
            .eq("company_id", companyId),
          supabase
            .from("audit_categories")
            .select("*")
            .eq("company_id", companyId),
        ]
      );

      setDepartments(depts.data || []);
      setJobRoles(roles.data || []);
      setExposureGroups(exposure.data || []);
      setRiskCategories(risk.data || []);
      setTrainingTypes(training.data || []);
      setAuditCategories(audit.data || []);
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

  const getTableName = (tab: string) => {
    const mapping: Record<string, string> = {
      departments: "departments",
      jobRoles: "job_roles",
      exposureGroups: "exposure_groups",
      riskCategories: "risk_categories",
      trainingTypes: "training_types",
      auditCategories: "audit_categories",
    };
    return mapping[tab];
  };

  const onSubmit = async (data: unknown) => {
    if (!companyId) return;

    try {
      const tableName = getTableName(activeTab);
      const payload = data as { name: string; description?: string };
      
      if (editingItem) {
        // Update existing item
        const { error } = await supabase
          .from(tableName as string)
          .update(payload)
          .eq("id", editingItem.id)
          .eq("company_id", companyId);

        if (error) throw error;
        toast({ title: "Success", description: "Item updated successfully" });
      } else {
        // Create new item
        const { error } = await supabase.from(tableName as string).insert([
          {
            ...payload,
            company_id: companyId,
          },
        ]);

        if (error) throw error;
        toast({ title: "Success", description: "Item created successfully" });
      }

      setIsDialogOpen(false);
      setEditingItem(null);
      form.reset();
      fetchAllData();
    } catch (err: unknown) {
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

  const handleEdit = (item: any) => {
    setEditingItem(item);
    form.setValue("name", item.name || item.title || "");
    form.setValue("description", item.description || "");
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteItem || !companyId) return;

    try {
      const tableName = getTableName(activeTab);
      const { error } = await supabase
        .from(tableName as string)
        .delete()
        .eq("id", deleteItem.id)
        .eq("company_id", companyId);

      if (error) throw error;

      toast({ title: "Success", description: "Item deleted successfully" });
      setDeleteItem(null);
      fetchAllData();
    } catch (err: unknown) {
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

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    form.reset();
  };

  const renderTable = (data: Tables[keyof Tables][], title: string) => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              Manage {title.toLowerCase()} - Used across the system in dropdown
              menus
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add {title.slice(0, -1)}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? "Edit" : "Add"} {title.slice(0, -1)}
                </DialogTitle>
                <DialogDescription>
                  {editingItem
                    ? "Update the details below to modify this item."
                    : "Create a new item that will be available in dropdown menus throughout the system."}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder={`Enter ${title.slice(0, -1).toLowerCase()} name`}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={3}
                            placeholder="Add additional details or notes..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleDialogClose}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingItem ? "Update" : "Create"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No items found. Click "Add {title.slice(0, -1)}" to create
                    your first entry.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.name || item.title}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.description || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(item)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteItem(item)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteItem}
        onOpenChange={() => setDeleteItem(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteItem?.name || deleteItem?.title}".
              This action cannot be undone. Items assigned to employees or other
              records will be unlinked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

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
              <h1 className="text-xl font-bold">Settings</h1>
              <p className="text-xs text-muted-foreground">
                System Configuration
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="departments">Departments</TabsTrigger>
            <TabsTrigger value="jobRoles">Job Roles</TabsTrigger>
            <TabsTrigger value="exposureGroups">Exposure Groups</TabsTrigger>
            <TabsTrigger value="riskCategories">Risk Categories</TabsTrigger>
            <TabsTrigger value="trainingTypes">Training Types</TabsTrigger>
            <TabsTrigger value="auditCategories">Audit Categories</TabsTrigger>
          </TabsList>

          <TabsContent value="departments" className="mt-6">
            {renderTable(departments, "Departments")}
          </TabsContent>

          <TabsContent value="jobRoles" className="mt-6">
            {renderTable(jobRoles, "Job Roles")}
          </TabsContent>

          <TabsContent value="exposureGroups" className="mt-6">
            {renderTable(exposureGroups, "Exposure Groups")}
          </TabsContent>

          <TabsContent value="riskCategories" className="mt-6">
            {renderTable(riskCategories, "Risk Categories")}
          </TabsContent>

          <TabsContent value="trainingTypes" className="mt-6">
            {renderTable(trainingTypes, "Training Types")}
          </TabsContent>

          <TabsContent value="auditCategories" className="mt-6">
            {renderTable(auditCategories, "Audit Categories")}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
