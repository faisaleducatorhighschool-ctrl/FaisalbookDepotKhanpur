import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useStoreRegister } from "@workspace/api-client-react";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { UserPlus, ArrowRight } from "lucide-react";

const registerSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Valid phone number required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function Register() {
  const [_, setLocation] = useLocation();
  const { customer, login: setAuthContext } = useCustomerAuth();
  const registerMutation = useStoreRegister();

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", phone: "", password: "" },
  });

  useEffect(() => {
    if (customer) {
      setLocation("/account");
    }
  }, [customer, setLocation]);

  const onSubmit = (data: RegisterForm) => {
    registerMutation.mutate(
      { data },
      {
        onSuccess: (res) => {
          setAuthContext(res.token, res.customer);
          toast.success("Account created successfully!");
        },
        onError: () => {
          toast.error("Failed to create account. Email might be in use.");
        }
      }
    );
  };

  return (
    <div className="container mx-auto px-4 py-16 md:py-24 flex justify-center">
      <div className="w-full max-w-md bg-card border rounded-3xl p-8 shadow-xl">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 rounded-full bg-primary/10 text-primary items-center justify-center mb-4">
            <UserPlus className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold">Create an Account</h1>
          <p className="text-muted-foreground text-sm mt-2">Join us to manage your orders and wishlist</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl><Input placeholder="Ali Khan" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address</FormLabel>
                <FormControl><Input placeholder="you@example.com" type="email" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl><Input placeholder="0300 1234567" {...field} /></FormControl>
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

            <Button type="submit" className="w-full h-12 text-base mt-6" disabled={registerMutation.isPending}>
              {registerMutation.isPending ? "Creating Account..." : "Create Account"} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>
        </Form>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary font-semibold hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
