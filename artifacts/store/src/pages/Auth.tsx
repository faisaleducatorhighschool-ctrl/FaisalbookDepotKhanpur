import { useState } from "react";
import { useLocation } from "wouter";
import { useStoreAuth } from "@/contexts/AuthContext";
import { useStoreLogin, useStoreRegister } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

export default function Auth() {
  const [, setLocation] = useLocation();
  const { setAuth, customer } = useStoreAuth();
  const { toast } = useToast();
  
  const loginMutation = useStoreLogin();
  const registerMutation = useStoreRegister();

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({ name: "", email: "", phone: "", password: "" });

  if (customer) {
    setLocation("/account");
    return null;
  }

  const onLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ data: loginForm }, {
      onSuccess: (res) => {
        setAuth(res.token, res.customer);
        toast({ title: "Welcome back!", description: `Logged in as ${res.customer.name}` });
        setLocation("/account");
      },
      onError: (err: any) => {
        toast({ title: "Login Failed", description: err.message, variant: "destructive" });
      }
    });
  };

  const onRegister = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate({ data: registerForm }, {
      onSuccess: (res) => {
        setAuth(res.token, res.customer);
        toast({ title: "Account Created!", description: "Welcome to our store." });
        setLocation("/account");
      },
      onError: (err: any) => {
        toast({ title: "Registration Failed", description: err.message, variant: "destructive" });
      }
    });
  };

  return (
    <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[70vh]">
      <div className="w-full max-w-md">
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 h-14">
            <TabsTrigger value="login" className="text-base font-semibold data-[state=active]:bg-background">Login</TabsTrigger>
            <TabsTrigger value="register" className="text-base font-semibold data-[state=active]:bg-background">Register</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <div className="bg-card border rounded-2xl p-6 md:p-8 shadow-sm">
              <div className="mb-6">
                <h2 className="text-2xl font-bold tracking-tight mb-2">Welcome Back</h2>
                <p className="text-muted-foreground text-sm">Enter your credentials to access your account.</p>
              </div>
              
              <form onSubmit={onLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email Address</Label>
                  <Input 
                    id="login-email" 
                    type="email" 
                    required 
                    value={loginForm.email}
                    onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password">Password</Label>
                  </div>
                  <Input 
                    id="login-password" 
                    type="password" 
                    required 
                    value={loginForm.password}
                    onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                  />
                </div>
                <Button type="submit" className="w-full h-12 text-base font-bold mt-2" disabled={loginMutation.isPending}>
                  {loginMutation.isPending ? "Logging in..." : "Log In"}
                </Button>
              </form>
            </div>
          </TabsContent>
          
          <TabsContent value="register">
            <div className="bg-card border rounded-2xl p-6 md:p-8 shadow-sm">
              <div className="mb-6">
                <h2 className="text-2xl font-bold tracking-tight mb-2">Create Account</h2>
                <p className="text-muted-foreground text-sm">Join us for faster checkout and order tracking.</p>
              </div>
              
              <form onSubmit={onRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-name">Full Name *</Label>
                  <Input 
                    id="reg-name" 
                    required 
                    value={registerForm.name}
                    onChange={e => setRegisterForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email">Email Address *</Label>
                  <Input 
                    id="reg-email" 
                    type="email" 
                    required 
                    value={registerForm.email}
                    onChange={e => setRegisterForm(f => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-phone">Phone Number *</Label>
                  <Input 
                    id="reg-phone" 
                    required 
                    value={registerForm.phone}
                    onChange={e => setRegisterForm(f => ({ ...f, phone: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">Password *</Label>
                  <Input 
                    id="reg-password" 
                    type="password" 
                    required 
                    value={registerForm.password}
                    onChange={e => setRegisterForm(f => ({ ...f, password: e.target.value }))}
                  />
                </div>
                <Button type="submit" className="w-full h-12 text-base font-bold mt-2" disabled={registerMutation.isPending}>
                  {registerMutation.isPending ? "Creating account..." : "Create Account"}
                </Button>
              </form>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
