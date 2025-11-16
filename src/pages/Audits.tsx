import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Search } from "lucide-react";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
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

const auditSchema = z.object({
  title: z.string().min(1, "Title is required"),
  audit_category_id: z.string().optional(),
  department_id: z.string().optional(),
  scheduled_date: z.string().min(1, "Scheduled date is required"),
  status: z.enum(["planned", "in_progress", "completed"]),
  findings: z.string().optional(),
  deficiencies_found: z.number().min(0).default(0),
});

type AuditFormData = z.infer<typeof auditSchema>;

export default function Audits() {
  const { user, loading, companyId } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  type AuditWithJoins = Tables<"audits"> & {
    audit_categories?: { name: string } | null;
    departments?: { name: string } | null;
    employees?: { full_name: string } | null;
  };

  const [audits, setAudits] = useState<AuditWithJoins[]>([]);
  const [categories, setCategories] = useState<Tables<"audit_categories">[]>(
    []
  );
  const [departments, setDepartments] = useState<Tables<"departments">[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  const form = useForm<AuditFormData>({
    resolver: zodResolver(auditSchema),
    defaultValues: {
      status: "planned",
      deficiencies_found: 0,
    },
  });

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
      const [auditsRes, categoriesRes, departmentsRes] = await Promise.all([
        supabase
          .from("audits")
          .select(
            "*, audit_categories(name), departments(name), employees(full_name)"
          )
          .eq("company_id", companyId)
          .order("scheduled_date", { ascending: false }),
        supabase
          .from("audit_categories")
          .select("*")
          .eq("company_id", companyId),
        supabase.from("departments").select("*").eq("company_id", companyId),
      ]);

      if (auditsRes.error) throw auditsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;
      if (departmentsRes.error) throw departmentsRes.error;

      setAudits((auditsRes.data as AuditWithJoins[]) || []);
      setCategories((categoriesRes.data as Tables<"audit_categories">[]) || []);
      setDepartments((departmentsRes.data as Tables<"departments">[]) || []);
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

  const onSubmit = async (data: AuditFormData) => {
    if (!companyId) {
      toast({
        title: "No company found",
        description: "You need to set up a company before creating audits.",
        variant: "destructive",
      });
      navigate("/setup-company");
      return;
    }

    console.log("Creating audit with data:", {
      ...data,
      company_id: companyId,
    });

    try {
      const { data: insertedData, error } = await supabase.from("audits").insert([
        {
          title: data.title,
          audit_category_id: data.audit_category_id || null,
          department_id: data.department_id || null,
          scheduled_date: data.scheduled_date,
          status: data.status,
          findings: data.findings || null,
          deficiencies_found: data.deficiencies_found,
          company_id: companyId,
        },
      ]).select();

      if (error) {
        console.error("Audit creation error:", error);
        throw error;
      }

      console.log("Audit created successfully:", insertedData);
      toast({ 
        title: "Success", 
        description: "Audit created successfully! 🎉" 
      });
      setIsDialogOpen(false);
      form.reset({
        status: "planned",
        deficiencies_found: 0,
      });
      fetchData();
    } catch (err: unknown) {
      console.error("Unexpected error creating audit:", err);
      const e = err as { message?: string; code?: string } | Error | null;
      const message =
        e && "message" in e && e.message ? e.message : String(err);
      
      // Provide helpful error messages
      let description = message;
      if (message.includes("row-level security")) {
        description = "Permission denied. Please ensure you're logged in and have a company assigned. Try signing out and back in.";
      } else if (message.includes("violates foreign key")) {
        description = "Invalid reference. Please check that the selected department/category exists.";
      }
      
      toast({
        title: "Error creating audit",
        description,
        variant: "destructive",
      });
    }
  };

  const filteredAudits = audits.filter((audit) =>
    audit.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "secondary";
      case "in_progress":
        return "default";
      default:
        return "outline";
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
              <h1 className="text-xl font-bold">Audits</h1>
              <p className="text-xs text-muted-foreground">Safety Audits</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Audits</CardTitle>
                <CardDescription>
                  Schedule and conduct safety audits
                </CardDescription>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    New Audit
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create Audit</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(onSubmit)}
                      className="space-y-4"
                    >
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="audit_category_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Audit Category</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {categories.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.id}>
                                      {cat.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="department_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Department</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select department" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {departments.map((dept) => (
                                    <SelectItem key={dept.id} value={dept.id}>
                                      {dept.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="scheduled_date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Scheduled Date</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Status</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="planned">
                                    Planned
                                  </SelectItem>
                                  <SelectItem value="in_progress">
                                    In Progress
                                  </SelectItem>
                                  <SelectItem value="completed">
                                    Completed
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="deficiencies_found"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Deficiencies Found</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(parseInt(e.target.value) || 0)
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="findings"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Findings</FormLabel>
                            <FormControl>
                              <Textarea {...field} rows={4} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit">Create Audit</Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search audits..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Scheduled Date</TableHead>
                    <TableHead>Auditor</TableHead>
                    <TableHead>Deficiencies</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAudits.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No audits found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAudits.map((audit) => (
                      <TableRow key={audit.id}>
                        <TableCell className="font-medium">
                          {audit.title}
                        </TableCell>
                        <TableCell>
                          {audit.audit_categories?.name || "-"}
                        </TableCell>
                        <TableCell>{audit.departments?.name || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(audit.status)}>
                            {audit.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>{audit.scheduled_date}</TableCell>
                        <TableCell>
                          {audit.employees?.full_name || "-"}
                        </TableCell>
                        <TableCell>
                          {audit.deficiencies_found > 0 ? (
                            <Badge variant="destructive">
                              {audit.deficiencies_found}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
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
      </main>
    </div>
  );
}
