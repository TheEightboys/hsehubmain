import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Check, Building2, Loader2, Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const registrationSchema = z
  .object({
    companyName: z
      .string()
      .min(2, "Company name must be at least 2 characters"),
    companyEmail: z.string().email("Invalid email address"),
    companyPhone: z.string().optional(),
    companyAddress: z.string().optional(),
    adminName: z.string().min(2, "Name must be at least 2 characters"),
    adminEmail: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type RegistrationForm = z.infer<typeof registrationSchema>;

const subscriptionPlans = [
  {
    tier: "basic",
    name: "Package S",
    subtitle: "HSE Basic - The digital entry point",
    price: 149,
    maxEmployees: 5,
    users: "5 users included (1 admin + 4 users)",
    features: [
      "Dashboard (examinations, due dates, documents)",
      "Employee management (master data, files)",
      "Examination management (G examinations, appointments, planning)",
      "Document management (PDF, images) (5 GB Storage)",
      "Standard reports (CSV/PDF export)",
      "GDPR export & account deletion",
      "Task list",
      "Roles & permissions (doctor, admin, company, employee)",
    ],
  },
  {
    tier: "standard",
    name: "Package M",
    subtitle: "HSE Pro - Structured teamwork",
    price: 249,
    maxEmployees: 10,
    users: "10 users",
    features: [
      "Everything from Basic + Pro features",
      "Incident and near-miss reports",
      "Risk assessments (GBU module)",
      "Action tracking",
      "Advanced task management (assignments + status)",
      "Automatic reminders & email notifications",
      "Partner integrations via API token (e.g. laboratory / doctor / service provider)",
    ],
    popular: true,
  },
  {
    tier: "premium",
    name: "Package L",
    subtitle: "HSE Enterprise - For large SMEs & groups",
    price: 349,
    maxEmployees: 999,
    users: "unlimited users",
    features: [
      "Everything from Basic + Pro + Enterprise",
      "Training management",
      "Courses (up to 20 courses)",
      "Progress tracking",
      "Certificates (PDF)",
      "Audit management",
      "Multi-client (multiple locations/companies)",
      "Cross-location reports",
      "Complete API suite",
      "Priority Support",
    ],
  },
];

const addOns = [
  {
    id: "safety-course-bundle",
    name: "Basic safety course bundle",
    description: "10 standard courses (first aid, PPE, fire safety)",
    price: 149,
    period: "year",
  },
  {
    id: "quickstart",
    name: "QuickStart",
    description: "60-minute remote setup",
    price: 149,
    period: "one-time fee",
  },
  {
    id: "priority-support",
    name: "Priority Support",
    description: "Response time < 10 hours",
    price: 49,
    period: "month",
  },
  {
    id: "multi-site-basic",
    name: "Multi-Site Basic",
    description: "Up to 3 locations €59/month",
    additionalInfo: "Each additional location €29 per month",
    price: 59,
    period: "month",
  },
  {
    id: "storage-50gb",
    name: "Storage+ 50 GB",
    description: "€19/month",
    price: 19,
    period: "month",
    group: "storage",
  },
  {
    id: "storage-200gb",
    name: "Storage+ 200 GB",
    description: "€59/month",
    price: 59,
    period: "month",
    group: "storage",
  },
  {
    id: "storage-unlimited",
    name: "Storage Unlimited",
    description: "€149/month",
    price: 149,
    period: "month",
    group: "storage",
  },
  {
    id: "custom-course-upload",
    name: "Custom Course Upload",
    description: "Any number of your own courses",
    price: 49,
    period: "month",
  },
];

export default function CompanyRegistration() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedTier, setSelectedTier] = useState<
    "basic" | "standard" | "premium"
  >("standard");
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema),
  });

  const toggleAddOn = (addOnId: string) => {
    const addOn = addOns.find((a) => a.id === addOnId);
    
    setSelectedAddOns((prev) => {
      // If it's a storage option, deselect other storage options
      if (addOn?.group === "storage") {
        const withoutStorage = prev.filter(
          (id) => !addOns.find((a) => a.id === id && a.group === "storage")
        );
        if (prev.includes(addOnId)) {
          return withoutStorage;
        }
        return [...withoutStorage, addOnId];
      }
      
      // For non-storage options, toggle normally
      if (prev.includes(addOnId)) {
        return prev.filter((id) => id !== addOnId);
      }
      return [...prev, addOnId];
    });
  };

  const onSubmit = async (data: RegistrationForm) => {
    setLoading(true);
    
    // Log selected add-ons for debugging/future payment integration
    console.log("Selected Add-ons:", selectedAddOns);
    const selectedAddOnsDetails = addOns.filter((addon) =>
      selectedAddOns.includes(addon.id)
    );
    console.log("Selected Add-ons Details:", selectedAddOnsDetails);
    
    try {
      // Step 1: Sign out any existing session first
      await supabase.auth.signOut();

      // Step 2: Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.adminEmail,
        password: data.password,
        options: {
          data: {
            full_name: data.adminName,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("User creation failed");

      // Step 3: Wait a moment for the user to be fully created in auth.users
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Step 4: Sign in to get a valid session
      const { data: sessionData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: data.adminEmail,
          password: data.password,
        });

      if (signInError) throw signInError;
      if (!sessionData.user) throw new Error("Failed to establish session");

      // Step 5: Call the registration function to complete setup
      // This function runs with SECURITY DEFINER to bypass RLS
      const selectedPlan = subscriptionPlans.find(
        (p) => p.tier === selectedTier
      )!;

      const { data: registrationResult, error: registrationError } = await (
        supabase as any
      ).rpc("register_company", {
        registration_data: {
          user_id: sessionData.user.id, // Use the confirmed user ID from session
          company_name: data.companyName,
          company_email: data.companyEmail,
          company_phone: data.companyPhone || "",
          company_address: data.companyAddress || "",
          subscription_tier: selectedTier,
          max_employees: selectedPlan.maxEmployees,
          admin_email: data.adminEmail,
          admin_name: data.adminName,
        },
      } as any);

      if (registrationError) {
        console.error("Registration function error:", registrationError);
        throw registrationError;
      }

      // Check if the function returned an error
      if (registrationResult && !(registrationResult as any).success) {
        throw new Error(
          (registrationResult as any).error || "Registration failed"
        );
      }

      console.log(
        "✅ Registration function completed successfully:",
        registrationResult
      );

      toast({
        title: "Success! 🎉",
        description:
          "Your company has been created! Please wait while we set everything up...",
      });

      // Wait longer for database to fully commit
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Force sign out and redirect to auth page so user can sign back in
      console.log("Registration complete, signing out to refresh session...");
      await supabase.auth.signOut();

      toast({
        title: "Almost Done!",
        description:
          "Please sign in again to access your new company dashboard.",
      });

      // Redirect to auth page after a moment
      setTimeout(() => {
        window.location.href = "/auth";
      }, 1500);
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        title: "Registration Failed",
        description: error.message || "An error occurred during registration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-background dark:to-gray-900">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="-ml-4 hover:bg-transparent hover:text-primary"
          >
            ← Back to Homepage
          </Button>
        </div>
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img
                src="/logo.png"
                  alt="SafetyHub Logo"
                  className="h-12 w-12 relative z-10"
                />
            <h1 className="text-4xl font-bold">SafetyHub</h1>
          </div>
          <p className="text-xl text-muted-foreground">
            Choose Your Plan & Register Your Company
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            7-day free trial • No credit card required
          </p>
        </div>

        {/* Subscription Plans */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-center mb-8">
            Choose Your Plan
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {subscriptionPlans.map((plan) => (
              <Card
                key={plan.tier}
                className={`cursor-pointer transition-all ${
                  selectedTier === plan.tier
                    ? "ring-2 ring-primary shadow-lg scale-105"
                    : "hover:shadow-md"
                } ${plan.popular ? "border-primary" : ""}`}
                onClick={() => setSelectedTier(plan.tier as any)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{plan.name}</CardTitle>
                    {plan.popular && (
                      <Badge className="bg-primary">Most Popular</Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs mb-2">
                    {plan.subtitle}
                  </CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}€</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <p className="text-sm text-blue-600 font-semibold mt-2">
                    {plan.users}
                  </p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Registration Form and Add-ons */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {/* Registration Form - Left Side (2 columns) */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Company Registration</CardTitle>
                <CardDescription>
                  Fill in your company and admin details to get started
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {/* Company Details */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Company Information</h3>
                    <div>
                      <Label htmlFor="companyName">Company Name *</Label>
                      <Input
                        id="companyName"
                        {...register("companyName")}
                        placeholder="Acme Corporation"
                      />
                      {errors.companyName && (
                        <p className="text-sm text-destructive mt-1">
                          {errors.companyName.message}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="companyEmail">Invoice Email *</Label>
                        <Input
                          id="companyEmail"
                          type="email"
                          {...register("companyEmail")}
                          placeholder="billing@company.com"
                        />
                        {errors.companyEmail && (
                          <p className="text-sm text-destructive mt-1">
                            {errors.companyEmail.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="companyPhone">Phone (Optional)</Label>
                        <Input
                          id="companyPhone"
                          {...register("companyPhone")}
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="companyAddress">Address (Optional)</Label>
                      <Textarea
                        id="companyAddress"
                        {...register("companyAddress")}
                        placeholder="123 Main St, City, State, ZIP"
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* Admin Details */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Administrator Account</h3>
                    <div>
                      <Label htmlFor="adminName">Full Name *</Label>
                      <Input
                        id="adminName"
                        {...register("adminName")}
                        placeholder="John Doe"
                      />
                      {errors.adminName && (
                        <p className="text-sm text-destructive mt-1">
                          {errors.adminName.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="adminEmail">Email *</Label>
                      <Input
                        id="adminEmail"
                        type="email"
                        {...register("adminEmail")}
                        placeholder="john@company.com"
                      />
                      {errors.adminEmail && (
                        <p className="text-sm text-destructive mt-1">
                          {errors.adminEmail.message}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="password">Password *</Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            {...register("password")}
                            placeholder="••••••••"
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        {errors.password && (
                          <p className="text-sm text-destructive mt-1">
                            {errors.password.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="confirmPassword">Confirm Password *</Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            {...register("confirmPassword")}
                            placeholder="••••••••"
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        {errors.confirmPassword && (
                          <p className="text-sm text-destructive mt-1">
                            {errors.confirmPassword.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Submit */}
                  <div className="flex flex-col gap-4">
                    <Button
                      type="submit"
                      size="lg"
                      disabled={loading}
                      className="w-full"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating Account...
                        </>
                      ) : (
                        `Start 7-Day Free Trial (${
                          subscriptionPlans.find((p) => p.tier === selectedTier)
                            ?.name
                        })`
                      )}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                      Already have an account?{" "}
                      <a href="/auth" className="text-primary hover:underline">
                        Sign in
                      </a>
                    </p>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Add-ons Section - Right Side (1 column) */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="text-lg">Add-ons</CardTitle>
                <CardDescription className="text-xs">
                  Enhance your plan with optional features
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {addOns.map((addOn) => (
                  <div
                    key={addOn.id}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedAddOns.includes(addOn.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => toggleAddOn(addOn.id)}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={selectedAddOns.includes(addOn.id)}
                        onChange={() => toggleAddOn(addOn.id)}
                        className="mt-1 cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-sm text-red-600">
                          Add one:
                        </div>
                        <div className="font-semibold text-sm">
                          {addOn.name}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {addOn.description}
                        </div>
                        {addOn.additionalInfo && (
                          <div className="text-xs text-muted-foreground">
                            {addOn.additionalInfo}
                          </div>
                        )}
                        <div className="text-sm font-bold text-red-600 mt-1">
                          €{addOn.price}/{addOn.period}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
