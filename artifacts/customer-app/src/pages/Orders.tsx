import { useLocation } from "wouter";
import { Package, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { useListStoreOrders } from "@workspace/api-client-react";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  packed: "Packed",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  packed: "bg-indigo-100 text-indigo-700",
  out_for_delivery: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function Orders() {
  const [, navigate] = useLocation();
  const { isLoggedIn } = useCustomerAuth();

  const { data: orders, isLoading } = useListStoreOrders({
    query: { queryKey: ["store-orders"], enabled: isLoggedIn, refetchInterval: 15000, refetchOnWindowFocus: true },
  });

  if (!isLoggedIn) {
    return (
      <MobileLayout>
        <div className="flex flex-col items-center justify-center h-80 px-8 text-center">
          <LogIn className="w-16 h-16 text-gray-200 mb-4" />
          <h2 className="text-lg font-semibold text-gray-700 mb-1">Sign in to view orders</h2>
          <p className="text-sm text-gray-400 mb-6">
            Log in to track your orders and order history.
          </p>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-8"
            onClick={() => navigate("/auth")}
          >
            Sign In
          </Button>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="bg-white px-4 py-4 border-b">
        <h1 className="text-xl font-bold text-gray-900">My Orders</h1>
      </div>

      <div className="px-4 py-3">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-4 shadow-sm space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="w-14 h-14 text-gray-200 mb-3" />
            <p className="text-gray-500 text-sm">No orders yet</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-indigo-600"
              onClick={() => navigate("/shop")}
            >
              Start Shopping
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <button
                key={order.id}
                onClick={() => navigate(`/orders/${order.orderNumber}`)}
                className="w-full bg-white rounded-xl p-4 shadow-sm text-left active:scale-[0.98] transition-transform"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-gray-900">
                    #{order.orderNumber}
                  </span>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {STATUS_LABELS[order.status] ?? order.status}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-2">
                  {new Date(order.createdAt).toLocaleDateString()}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 capitalize">
                    {order.paymentMethod?.replace("_", " ")}
                  </span>
                  <span className="text-sm font-bold text-indigo-600">
                    Rs {order.totalAmount.toLocaleString()}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
