import { useEffect } from "react";
import { useLocation } from "wouter";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { useListStoreOrders, useGetStoreSettings, useUpdateStoreCustomerMe, getGetStoreCustomerMeQueryKey, getListStoreOrdersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Package, User, LogOut, MapPin } from "lucide-react";
import { toast } from "sonner";

const profileSchema = z.object({
  name: z.string().min(2, "Name is required"),
  phone: z.string().min(10, "Valid phone number required"),
  address: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function Account() {
  const [_, setLocation] = useLocation();
  const { customer, isLoading: isAuthLoading, logout } = useCustomerAuth();
  const { data: settings } = useGetStoreSettings();
  const { data: orders, isLoading: isOrdersLoading } = useListStoreOrders({
    query: { enabled: !!customer, queryKey: getListStoreOrdersQueryKey() }
  });
  
  const updateMutation = useUpdateStoreCustomerMe();
  const queryClient = useQueryClient();
  const currency = settings?.currency || "Rs.";

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      phone: "",
      address: "",
    },
  });

  useEffect(() => {
    if (!isAuthLoading && !customer) {
      setLocation("/login");
    } else if (customer) {
      form.reset({
        name: customer.name,
        phone: customer.phone,
        address: customer.address || "",
      });
    }
  }, [customer, isAuthLoading, setLocation, form]);

  if (isAuthLoading || !customer) {
    return <div className="p-20 text-center">Loading...</div>;
  }

  const onSubmitProfile = (data: ProfileForm) => {
    updateMutation.mutate(
      { data },
      {
        onSuccess: () => {
          toast.success("Profile updated successfully");
          queryClient.invalidateQueries({ queryKey: getGetStoreCustomerMeQueryKey() });
        },
        onError: () => {
          toast.error("Failed to update profile");
        }
      }
    );
  };

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered': return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case 'shipped': return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case 'processing': return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      case 'cancelled': return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">My Account</h1>
          <p className="text-muted-foreground mt-1">Welcome back, {customer.name}</p>
        </div>
        <Button variant="outline" onClick={handleLogout} className="text-muted-foreground hover:text-destructive">
          <LogOut className="mr-2 h-4 w-4" /> Sign Out
        </Button>
      </div>

      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="mb-8 w-full justify-start h-12 bg-transparent border-b rounded-none p-0">
          <TabsTrigger value="orders" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-6 bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            <Package className="mr-2 h-4 w-4" /> Order History
          </TabsTrigger>
          <TabsTrigger value="profile" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-6 bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            <User className="mr-2 h-4 w-4" /> Profile Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
            {isOrdersLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading orders...</div>
            ) : orders && orders.length > 0 ? (
              <div className="divide-y">
                {orders.map(order => (
                  <div key={order.id} className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:bg-muted/30 transition-colors">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-lg">{order.orderNumber}</span>
                        <Badge variant="outline" className={`border-transparent ${getStatusColor(order.status)}`}>
                          {order.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString()} • {order.items?.length || 0} items
                      </div>
                    </div>
                    <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                      <div className="text-right">
                        <div className="font-bold text-lg">{currency} {order.totalAmount.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground uppercase">{order.paymentMethod}</div>
                      </div>
                      <Button variant="secondary" onClick={() => setLocation(`/track?order=${order.orderNumber}`)}>
                        Track
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-16 text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-semibold mb-2">No orders yet</h3>
                <p className="text-muted-foreground mb-6">When you place orders, they will appear here.</p>
                <Button onClick={() => setLocation("/products")}>Start Shopping</Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="profile">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-card border rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <User className="h-5 w-5 text-primary" /> Personal Information
              </h2>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitProfile)} className="space-y-4">
                  <div className="bg-muted/50 p-3 rounded-lg mb-4 border text-sm text-muted-foreground">
                    Email: <strong className="text-foreground">{customer.email}</strong> (Cannot be changed)
                  </div>
                  
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Delivery Address</FormLabel>
                      <FormControl><Textarea className="resize-none h-24" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <Button type="submit" className="w-full mt-4" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              </Form>
            </div>

            <div className="bg-card border rounded-2xl p-6 shadow-sm h-fit">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" /> Account Summary
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b">
                  <span className="text-muted-foreground">Member Since</span>
                  <span className="font-medium">{new Date(customer.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b">
                  <span className="text-muted-foreground">Total Orders</span>
                  <span className="font-medium">{customer.totalOrders || 0}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b">
                  <span className="text-muted-foreground">Total Spent</span>
                  <span className="font-medium text-primary">{currency} {(customer.totalSpent || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
