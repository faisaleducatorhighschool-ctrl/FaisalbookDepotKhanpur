import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { useStoreLogin, useStoreRegister } from "@workspace/api-client-react";

export default function Auth() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { setAuth } = useCustomerAuth();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");

  const login = useStoreLogin();
  const register = useStoreRegister();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast({ title: "Please enter email and password", variant: "destructive" });
      return;
    }
    try {
      const res = await login.mutateAsync({ data: { email: loginEmail, password: loginPassword } });
      setAuth(res.token, res.customer);
      navigate("/profile");
    } catch {
      toast({ title: "Invalid email or password", variant: "destructive" });
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!regName || !regEmail || !regPhone || !regPassword) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    try {
      const res = await register.mutateAsync({
        data: { name: regName, email: regEmail, phone: regPhone, password: regPassword },
      });
      setAuth(res.token, res.customer);
      navigate("/profile");
    } catch {
      toast({ title: "Registration failed. Email may already be in use.", variant: "destructive" });
    }
  }

  return (
    <MobileLayout hideNav>
      <div className="bg-white px-4 py-4 border-b flex items-center gap-3">
        <button onClick={() => navigate("/")}>
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Account</h1>
      </div>

      <div className="px-5 py-6">
        <Tabs defaultValue="login">
          <TabsList className="w-full mb-6">
            <TabsTrigger value="login" className="flex-1">Sign In</TabsTrigger>
            <TabsTrigger value="register" className="flex-1">Create Account</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <Label className="text-sm">Email</Label>
                <Input
                  type="email"
                  placeholder="you@email.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Password</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-full h-11 mt-2"
                disabled={login.isPending}
              >
                {login.isPending ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1">
                <Label className="text-sm">Full Name</Label>
                <Input
                  placeholder="Your full name"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Email</Label>
                <Input
                  type="email"
                  placeholder="you@email.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Phone</Label>
                <Input
                  placeholder="0300-0000000"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Password</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-full h-11 mt-2"
                disabled={register.isPending}
              >
                {register.isPending ? "Creating account..." : "Create Account"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </MobileLayout>
  );
}
