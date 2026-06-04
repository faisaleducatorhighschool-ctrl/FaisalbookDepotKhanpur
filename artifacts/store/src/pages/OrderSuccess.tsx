import { useLocation, useSearch, Link } from "wouter";
import { useGetStoreOrder, useGetStoreSettings, getGetStoreOrderQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Package, Calendar, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function OrderSuccess() {
  const [_, setLocation] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const orderNumber = params.get("order");

  const { data: settings } = useGetStoreSettings();
  const { data: order, isLoading } = useGetStoreOrder(orderNumber || "", {}, {
    query: { enabled: !!orderNumber, queryKey: getGetStoreOrderQueryKey(orderNumber || "", {}) }
  });

  const currency = settings?.currency || "Rs.";

  if (!orderNumber) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl font-bold mb-4">No order specified</h1>
        <Button onClick={() => setLocation("/")}>Go Home</Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-24 max-w-xl text-center">
        <Skeleton className="h-24 w-24 rounded-full mx-auto mb-8" />
        <Skeleton className="h-10 w-3/4 mx-auto mb-4" />
        <Skeleton className="h-6 w-1/2 mx-auto mb-12" />
        <div className="space-y-4 text-left">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl font-bold mb-4 text-destructive">Order Not Found</h1>
        <p className="text-muted-foreground mb-8">We couldn't find details for order #{orderNumber}.</p>
        <Button onClick={() => setLocation("/")}>Go Home</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16 md:py-24 max-w-2xl">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center h-24 w-24 rounded-full bg-green-100 text-green-600 mb-6">
          <CheckCircle2 className="h-12 w-12" />
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold mb-4">Thank you for your order!</h1>
        <p className="text-lg text-muted-foreground">
          Your order has been placed successfully and is being processed.
        </p>
      </div>

      <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-muted/50 p-6 border-b flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground font-medium mb-1">Order Number</p>
            <div className="text-xl font-bold">{order.orderNumber}</div>
          </div>
          <div className="sm:text-right">
            <p className="text-sm text-muted-foreground font-medium mb-1">Total Amount</p>
            <div className="text-xl font-bold text-primary">{currency} {order.totalAmount.toLocaleString()}</div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-y-6 gap-x-4 mb-8 text-sm">
            <div>
              <p className="text-muted-foreground mb-1 flex items-center gap-2"><Calendar className="h-4 w-4" /> Date</p>
              <p className="font-medium">{new Date(order.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1 flex items-center gap-2"><Package className="h-4 w-4" /> Payment Method</p>
              <p className="font-medium uppercase">{order.paymentMethod}</p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold border-b pb-2">Order Items</h3>
            {order.items?.map(item => (
              <div key={item.id} className="flex justify-between items-center text-sm">
                <div>
                  <span className="font-medium">{item.quantity}x</span> {item.productName}
                </div>
                <div className="font-medium">{currency} {((item.price - (item.discount || 0)) * item.quantity).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
        <Link href={`/track?order=${order.orderNumber}`}>
          <Button size="lg" className="w-full sm:w-auto h-14">
            Track Order <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Link>
        <Link href="/products">
          <Button variant="outline" size="lg" className="w-full sm:w-auto h-14">
            Continue Shopping
          </Button>
        </Link>
      </div>
    </div>
  );
}
