import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package2, GitBranch } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const loginSchema = z.object({
  branchId: z.string().min(1, "Please select a branch"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface PublicBranch { id: number; name: string; isMain: boolean; }

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const loginMutation = useLogin();
  const [branches, setBranches] = useState<PublicBranch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);

  useEffect(() => {
    fetch(`${BASE}/api/branches/public`)
      .then(r => r.ok ? r.json() : [])
      .then((data: PublicBranch[]) => {
        setBranches(data);
        // Auto-select if only one branch
        if (data.length === 1) {
          form.setValue("branchId", String(data[0].id));
        } else {
          // Auto-select main branch if multiple
          const main = data.find(b => b.isMain);
          if (main) form.setValue("branchId", String(main.id));
        }
      })
      .catch(() => setBranches([]))
      .finally(() => setLoadingBranches(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { branchId: "", username: "", password: "" },
  });

  const onSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(
      { data: { username: data.username, password: data.password } },
      {
        onSuccess: (res) => {
          localStorage.setItem("erp_token", res.token);
          localStorage.setItem("erp_branch_id", data.branchId);
          const branch = branches.find(b => b.id === Number(data.branchId));
          if (branch) localStorage.setItem("erp_branch_name", branch.name);
          toast({ title: "Login successful", description: `Welcome back! Branch: ${branch?.name ?? ""}` });
          setLocation("/");
        },
        onError: (err) => {
          toast({
            title: "Login failed",
            description: err.message || "Invalid credentials",
            variant: "destructive",
          });
        },
      }
    );
  };

  const singleBranch = branches.length === 1;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center shadow-lg">
            <Package2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Tech Mentor ERP & POS</h1>
          <p className="text-muted-foreground">Sign in to your account to continue</p>
        </div>

        <Card className="border-border shadow-lg">
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>Select your branch, then enter your credentials</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

                {/* Branch selector */}
                <FormField
                  control={form.control}
                  name="branchId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <GitBranch className="w-3.5 h-3.5" />Branch
                      </FormLabel>
                      {singleBranch ? (
                        <div className="flex items-center gap-2 h-10 w-full rounded-md border border-input bg-muted/40 px-3 text-sm">
                          <GitBranch className="w-4 h-4 text-muted-foreground" />
                          <span>{branches[0]?.name}</span>
                          {branches[0]?.isMain && (
                            <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Main</span>
                          )}
                        </div>
                      ) : (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={loadingBranches}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={loadingBranches ? "Loading branches..." : "Select branch..."} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {branches.map(b => (
                              <SelectItem key={b.id} value={String(b.id)}>
                                {b.name}{b.isMain ? " (Main)" : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="admin" {...field} data-testid="input-username" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} data-testid="input-password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginMutation.isPending || loadingBranches}
                  data-testid="button-login"
                >
                  {loginMutation.isPending ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
