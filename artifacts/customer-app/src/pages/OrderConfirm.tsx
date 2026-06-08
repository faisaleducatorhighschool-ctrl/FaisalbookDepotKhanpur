import { useParams, useLocation } from "wouter";
import { CheckCircle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { useGetStoreOrder } from "@workspace/api-client-react";

export default function OrderConfirm() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const [, navigate] = useLocation();
  const token =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("token") ?? undefined
      : undefined;

  const { data: order, isLoading } = useGetStoreOrder(
    orderNumber,
    token ? { token } : undefined,
    { query: { queryKey: ["store-order", orderNumber] } }
  );

  return (
    <MobileLayout hideNav>
      <div className="flex flex-col items-center px-6 pt-16 pb-8">
        {isLoading ? (
          <div className="w-full space-y-4">
            <Skeleton className="h-20 w-20 rounded-full mx-auto" />
            <Skeleton className="h-6 w-48 mx-auto" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </div>
        ) : (
          <>
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Order Placed!</h1>
            <p className="text-sm text-gray-500 text-center mb-6">
              Your order has been received and is being processed.
            </p>

            {order && (
              <div className="w-full bg-white rounded-xl p-4 shadow-sm space-y-3 mb-6">
                <div className="flex items-center gap-2 mb-1">
                  <Package className="w-4 h-4 text-indigo-600" />
                  <span className="text-sm font-semibold text-gray-900">
                    Order #{order.orderNumber}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <span className="text-gray-500">Status</span>
                  <span className="font-medium capitalize">{order.status}</span>
                  <span className="text-gray-500">Payment</span>
                  <span className="font-medium capitalize">
                    {order.paymentMethod?.replace("_", " ")}
                  </span>
                  <span className="text-gray-500">Total</span>
                  <span className="font-bold text-indigo-600">
                    Rs {order.totalAmount.toLocaleString()}
                  </span>
                </div>

                {order.items && order.items.length > 0 && (
                  <div className="border-t pt-3 space-y-1">
                    {order.items.map((item) => (
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
                )}
              </div>
            )}

            <div className="flex flex-col w-full gap-3">
              <Button
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-full"
                onClick={() => navigate("/orders")}
              >
                View All Orders
              </Button>
              <Button
                variant="outline"
                className="w-full rounded-full"
                onClick={() => navigate("/")}
              >
                Continue Shopping
              </Button>
            </div>
          </>
        )}
      </div>
    </MobileLayout>
  );
}
