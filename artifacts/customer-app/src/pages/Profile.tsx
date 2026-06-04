import { useState } from "react";
import { useLocation } from "wouter";
import { User, Package, Heart, LogOut, Edit2, Phone, Mail, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import {
  useGetStoreCustomerMe,
  useUpdateStoreCustomerMe,
} from "@workspace/api-client-react";

export default function Profile() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isLoggedIn, logout } = useCustomerAuth();
  const [editing, setEditing] = useState(false);

  const { data: customer, isLoading, refetch } = useGetStoreCustomerMe({
    query: { queryKey: ["store-me"], enabled: isLoggedIn },
  });

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const updateMe = useUpdateStoreCustomerMe();

  function startEdit() {
    if (customer) {
      setName(customer.name);
      setPhone(customer.phone);
      setAddress(customer.address ?? "");
    }
    setEditing(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      await updateMe.mutateAsync({ data: { name, phone, address } });
      await refetch();
      setEditing(false);
      toast({ title: "Profile updated" });
    } catch {
      toast({ title: "Failed to update profile", variant: "destructive" });
    }
  }

  if (!isLoggedIn) {
    return (
      <MobileLayout>
        <div className="flex flex-col items-center justify-center h-80 px-8 text-center">
          <User className="w-16 h-16 text-gray-200 mb-4" />
          <h2 className="text-lg font-semibold text-gray-700 mb-1">Not signed in</h2>
          <p className="text-sm text-gray-400 mb-6">Sign in to manage your account.</p>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-8"
            onClick={() => navigate("/auth")}
          >
            Sign In / Register
          </Button>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="bg-white px-4 pt-5 pb-4 border-b flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Profile</h1>
        {!editing && (
          <button onClick={startEdit} className="text-indigo-600">
            <Edit2 className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="px-4 py-4 space-y-4">
        {isLoading ? (
          <div className="bg-white rounded-xl p-5 shadow-sm space-y-3">
            <Skeleton className="h-16 w-16 rounded-full mx-auto" />
            <Skeleton className="h-5 w-32 mx-auto" />
            <Skeleton className="h-4 w-48 mx-auto" />
          </div>
        ) : editing ? (
          <form onSubmit={handleSave} className="bg-white rounded-xl p-4 shadow-sm space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">Edit Profile</h2>
            <div className="space-y-1">
              <Label className="text-xs">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Address</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={updateMe.isPending}
              >
                {updateMe.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        ) : customer ? (
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center">
                <User className="w-7 h-7 text-indigo-600" />
              </div>
              <div>
                <p className="text-base font-bold text-gray-900">{customer.name}</p>
                {customer.email && (
                  <p className="text-xs text-gray-500">{customer.email}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                <span>{customer.phone}</span>
              </div>
              {customer.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                  <span>{customer.email}</span>
                </div>
              )}
              {customer.address && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                  <span>{customer.address}</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-xl font-bold text-indigo-600">
                  {customer.totalOrders ?? 0}
                </p>
                <p className="text-xs text-gray-500">Orders</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-indigo-600">
                  Rs {(customer.totalSpent ?? 0).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">Total Spent</p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <button
            onClick={() => navigate("/orders")}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors"
          >
            <Package className="w-5 h-5 text-indigo-600" />
            <span className="text-sm font-medium text-gray-700">My Orders</span>
          </button>
          <div className="border-t" />
          <button
            onClick={() => navigate("/wishlist")}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors"
          >
            <Heart className="w-5 h-5 text-indigo-600" />
            <span className="text-sm font-medium text-gray-700">Wishlist</span>
          </button>
          <div className="border-t" />
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors"
          >
            <LogOut className="w-5 h-5 text-red-500" />
            <span className="text-sm font-medium text-red-500">Sign Out</span>
          </button>
        </div>
      </div>
    </MobileLayout>
  );
}
