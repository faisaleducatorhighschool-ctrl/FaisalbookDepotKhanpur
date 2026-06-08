import { useParams, useLocation } from "wouter";
import { ArrowLeft, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { useGetStoreOrder } from "@workspace/api-client-react";

const STATUS_STEPS = ["pending", "confirmed", "packed", "out_for_delivery", "delivered"];

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

export default function OrderDetail() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const [, navigate] = useLocation();
  const token =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("token") ?? undefined
      : undefined;

  const { data: order, isLoading } = useGetStoreOrder(
    orderNumber,
    token ? { token } : undefined,
    { query: { queryKey: ["store-order", orderNumber], refetchInterval: 15000, refetchOnWindowFocus: true } }
  );

  return (
    <MobileLayout hideNav>
      <div className="bg-white px-4 py-4 border-b flex items-center gap-3">
        <button onClick={() => navigate("/orders")}>
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Order Detail</h1>
      </div>

      <div className="px-4 py-4 space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ) : !order ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Package className="w-12 h-12 text-gray-200 mb-3" />
            <p className="text-gray-500 text-sm">Order not found</p>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => navigate("/orders")}>
              Back to Orders
            </Button>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-gray-400">Order Number</p>
                  <p className="text-base font-bold text-gray-900">#{order.orderNumber}</p>
                </div>
                <span
                  className={`text-sm font-medium px-3 py-1 rounded-full ${
                    STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"
                  }`}
                >
                  {STATUS_LABELS[order.status] ?? order.status}
                </span>
              </div>

              {order.status !== "cancelled" && (
                <div className="mt-3">
                  <div className="flex items-center gap-1">
                    {STATUS_STEPS.map((step, idx) => {
                      const currentIdx = STATUS_STEPS.indexOf(order.status);
                      const done = idx <= currentIdx;
                      return (
                        <div key={step} className="flex items-center flex-1 last:flex-none">
                          <div
                            className={`w-3 h-3 rounded-full shrink-0 ${
                              done ? "bg-indigo-600" : "bg-gray-200"
                            }`}
                          />
                          {idx < STATUS_STEPS.length - 1 && (
                            <div
                              className={`h-0.5 flex-1 ${done && idx < currentIdx ? "bg-indigo-600" : "bg-gray-200"}`}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-1">
                    {STATUS_STEPS.map((step) => (
                      <span key={step} className="text-[9px] text-gray-400 text-center leading-tight max-w-[20%]">
                        {STATUS_LABELS[step]}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm space-y-2">
              <h2 className="text-sm font-semibold text-gray-900 mb-2">Order Items</h2>
              {order.items?.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-600 flex-1 mr-2">
                    {item.productName ?? `Product #${item.productId}`} × {item.quantity}
                  </span>
                  <span className="font-medium shrink-0">
                    Rs {(item.price * item.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm space-y-2">
              <h2 className="text-sm font-semibold text-gray-900 mb-2">Payment</h2>
              <div className="grid grid-cols-2 gap-y-1.5 text-sm">
                <span className="text-gray-500">Method</span>
                <span className="capitalize">{order.paymentMethod?.replace("_", " ")}</span>
                <span className="text-gray-500">Status</span>
                <span className="capitalize">{order.paymentStatus}</span>
                {(order.subtotal ?? 0) > 0 && (
                  <>
                    <span className="text-gray-500">Subtotal</span>
                    <span>Rs {(order.subtotal ?? 0).toLocaleString()}</span>
                  </>
                )}
                {(order.tax ?? 0) > 0 && (
                  <>
                    <span className="text-gray-500">Tax</span>
                    <span>Rs {(order.tax ?? 0).toLocaleString()}</span>
                  </>
                )}
                <span className="text-gray-500 font-medium">Total</span>
                <span className="font-bold text-indigo-600">
                  Rs {order.totalAmount.toLocaleString()}
                </span>
              </div>
            </div>

            {order.notes && (
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-900 mb-1">Notes</h2>
                <p className="text-sm text-gray-600">{order.notes}</p>
              </div>
            )}

            <div className="pb-4 text-center">
              <p className="text-xs text-gray-400">
                Placed on {new Date(order.createdAt).toLocaleString()}
              </p>
            </div>
          </>
        )}
      </div>
    </MobileLayout>
  );
}
