import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useStoreLogin } from "@workspace/api-client-react";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { Store, ArrowRight } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [_, setLocation] = useLocation();
  const { customer, login: setAuthContext } = useCustomerAuth();
  const loginMutation = useStoreLogin();

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (customer) {
      setLocation("/account");
    }
  }, [customer, setLocation]);

  const onSubmit = (data: LoginForm) => {
    loginMutation.mutate(
      { data },
      {
        onSuccess: (res) => {
          setAuthContext(res.token, res.customer);
          toast.success("Welcome back!");
        },
        onError: () => {
          toast.error("Invalid email or password");
        }
      }
    );
  };

  return (
    <div className="container mx-auto px-4 py-16 md:py-24 flex justify-center">
      <div className="w-full max-w-md bg-card border rounded-3xl p-8 shadow-xl">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 rounded-full bg-primary/10 text-primary items-center justify-center mb-4">
            <Store className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold">Welcome Back</h1>
          <p className="text-muted-foreground text-sm mt-2">Sign in to your account to continue</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address</FormLabel>
                <FormControl><Input placeholder="you@example.com" type="email" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            
            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl><Input placeholder="••••••••" type="password" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <Button type="submit" className="w-full h-12 text-base mt-4" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? "Signing in..." : "Sign In"} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>
        </Form>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link href="/register" className="text-primary font-semibold hover:underline">
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
}
