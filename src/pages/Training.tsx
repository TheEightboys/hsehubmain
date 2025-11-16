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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";
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

const trainingSchema = z.object({
  employee_id: z.string().min(1, "Employee is required"),
  training_type_id: z.string().min(1, "Training type is required"),
  assigned_date: z.string().min(1, "Assigned date is required"),
  expiry_date: z.string().optional(),
  status: z.enum(["assigned", "in_progress", "completed", "expired"]),
});

type TrainingFormData = z.infer<typeof trainingSchema>;

export default function Training() {
  const { user, loading, companyId } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  type TrainingWithJoins = Tables<"training_records"> & {
    employees?: { full_name: string } | null;
    training_types?: { name: string } | null;
  };

  const [trainings, setTrainings] = useState<TrainingWithJoins[]>([]);
  const [employees, setEmployees] = useState<Tables<"employees">[]>([]);
  const [trainingTypes, setTrainingTypes] = useState<
    Tables<"training_types">[]
  >([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  const form = useForm<TrainingFormData>({
    resolver: zodResolver(trainingSchema),
    defaultValues: {
      status: "assigned",
    },
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
    if (user && companyId) {
      fetchData();
    }
  }, [user, loading, navigate, companyId]);

  const fetchData = async () => {
    if (!companyId) return;

    setLoadingData(true);
    try {
      const [trainingsRes, employeesRes, typesRes] = await Promise.all([
        supabase
          .from("training_records")
          .select("*, employees(full_name), training_types(name)")
          .eq("company_id", companyId)
          .order("assigned_date", { ascending: false }),
        supabase
          .from("employees")
          .select("*")
          .eq("company_id", companyId)
          .eq("is_active", true),
        supabase.from("training_types").select("*").eq("company_id", companyId),
      ]);

      if (trainingsRes.error) throw trainingsRes.error;
      if (employeesRes.error) throw employeesRes.error;
      if (typesRes.error) throw typesRes.error;

      setTrainings((trainingsRes.data as TrainingWithJoins[]) || []);
      setEmployees((employeesRes.data as Tables<"employees">[]) || []);
      setTrainingTypes((typesRes.data as Tables<"training_types">[]) || []);
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

  const onSubmit = async (data: TrainingFormData) => {
    if (!companyId) return;

    try {
      const { error } = await supabase.from("training_records").insert([
        {
          employee_id: data.employee_id,
          training_type_id: data.training_type_id,
          assigned_date: data.assigned_date,
          expiry_date: data.expiry_date || null,
          status: data.status,
          company_id: companyId,
        },
      ]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Training assigned successfully",
      });
      setIsDialogOpen(false);
      form.reset();
      fetchData();
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

  const filteredTrainings = trainings.filter(
    (training) =>
      training.employees?.full_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      training.training_types?.name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "in_progress":
        return "secondary";
      case "expired":
        return "destructive";
      default:
        return "outline";
    }
  };

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
              <h1 className="text-xl font-bold">Training</h1>
              <p className="text-xs text-muted-foreground">
                Training & Qualification Management
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Training Records</CardTitle>
                <CardDescription>
                  Assign and track safety training
                </CardDescription>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Assign Training
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Assign Training</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(onSubmit)}
                      className="space-y-4"
                    >
                      <FormField
                        control={form.control}
                        name="employee_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Employee</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select employee" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {employees.map((emp) => (
                                  <SelectItem key={emp.id} value={emp.id}>
                                    {emp.full_name}
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
                        name="training_type_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Training Type</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select training type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {trainingTypes.map((type) => (
                                  <SelectItem key={type.id} value={type.id}>
                                    {type.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="assigned_date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Assigned Date</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="expiry_date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Expiry Date (Optional)</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

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
                                <SelectItem value="assigned">
                                  Assigned
                                </SelectItem>
                                <SelectItem value="in_progress">
                                  In Progress
                                </SelectItem>
                                <SelectItem value="completed">
                                  Completed
                                </SelectItem>
                                <SelectItem value="expired">Expired</SelectItem>
                              </SelectContent>
                            </Select>
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
                        <Button type="submit">Assign Training</Button>
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
                  placeholder="Search trainings..."
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
                    <TableHead>Employee</TableHead>
                    <TableHead>Training Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned Date</TableHead>
                    <TableHead>Expiry Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTrainings.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No training records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTrainings.map((training) => (
                      <TableRow key={training.id}>
                        <TableCell className="font-medium">
                          {training.employees?.full_name}
                        </TableCell>
                        <TableCell>{training.training_types?.name}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(training.status)}>
                            {training.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>{training.assigned_date}</TableCell>
                        <TableCell>{training.expiry_date || "-"}</TableCell>
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
