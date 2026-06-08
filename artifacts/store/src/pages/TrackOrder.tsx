import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useGetStoreOrder, useGetStoreSettings, getGetStoreOrderQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Package, Truck, CheckCircle2, Clock, PackageCheck } from "lucide-react";

export default function TrackOrder() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const initialOrder = params.get("order") || "";
  
  const [orderNumber, setOrderNumber] = useState(initialOrder);
  const [searchQuery, setSearchQuery] = useState(initialOrder);
  
  const [_, setLocation] = useLocation();
  const { data: settings } = useGetStoreSettings();

  const { data: order, isLoading, error } = useGetStoreOrder(
    searchQuery, 
    {}, 
    { query: { enabled: !!searchQuery, retry: false, refetchInterval: searchQuery ? 15000 : false, refetchOnWindowFocus: true, queryKey: getGetStoreOrderQueryKey(searchQuery, {}) } }
  );

  const currency = settings?.currency || "Rs.";

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (orderNumber.trim()) {
      setSearchQuery(orderNumber.trim());
      setLocation(`/track?order=${encodeURIComponent(orderNumber.trim())}`);
    }
  };

  const getStatusStep = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 1;
      case 'confirmed': return 2;
      case 'processing': return 2; // legacy alias
      case 'packed': return 3;
      case 'out_for_delivery': return 4;
      case 'shipped': return 4; // legacy alias
      case 'delivered': return 5;
      case 'cancelled': return -1;
      default: return 0; // unknown status: don't fake "Pending" progress
    }
  };

  const currentStep = order ? getStatusStep(order.status) : 0;

  return (
    <div className="container mx-auto px-4 py-12 md:py-20 max-w-3xl">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">Track Your Order</h1>
        <p className="text-muted-foreground text-lg">Enter your order number below to check its current status.</p>
      </div>

      <div className="bg-card border rounded-2xl p-6 md:p-8 shadow-sm mb-12">
        <form onSubmit={handleSearch} className="flex gap-4">
          <Input 
            placeholder="e.g. ORD-12345" 
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            className="h-14 text-lg"
          />
          <Button type="submit" size="lg" className="h-14 px-8" disabled={isLoading}>
            <Search className="h-5 w-5 md:mr-2" />
            <span className="hidden md:inline">Track</span>
          </Button>
        </form>
      </div>

      {isLoading && (
        <div className="space-y-8">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      )}

      {error && !isLoading && searchQuery && (
        <div className="bg-destructive/10 text-destructive p-6 rounded-xl text-center border border-destructive/20">
          <h3 className="font-bold text-lg mb-2">Order Not Found</h3>
          <p>We couldn't find any order matching "{searchQuery}". Please check the number and try again.</p>
        </div>
      )}

      {order && !isLoading && currentStep > 0 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          <div className="bg-card border rounded-2xl p-6 md:p-8 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-8 border-b">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Order Number</p>
                <p className="text-xl font-bold">{order.orderNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Date Placed</p>
                <p className="font-medium">{new Date(order.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="md:text-right">
                <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
                <p className="text-xl font-bold text-primary">{currency} {order.totalAmount.toLocaleString()}</p>
              </div>
            </div>

            {/* Timeline */}
            <div className="relative pt-4 pb-8">
              <div className="absolute top-8 left-[10%] right-[10%] h-1 bg-muted rounded-full">
                <div 
                  className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${((currentStep - 1) / 4) * 100}%` }}
                />
              </div>

              <div className="relative flex justify-between">
                {[
                  { step: 1, label: 'Pending', icon: Clock },
                  { step: 2, label: 'Confirmed', icon: CheckCircle2 },
                  { step: 3, label: 'Packed', icon: Package },
                  { step: 4, label: 'Out for Delivery', icon: Truck },
                  { step: 5, label: 'Delivered', icon: PackageCheck }
                ].map((s) => {
                  const active = currentStep >= s.step;
                  const current = currentStep === s.step;
                  const Icon = s.icon;
                  return (
                    <div key={s.step} className="flex flex-col items-center w-1/5">
                      <div className={`h-12 w-12 rounded-full border-4 flex items-center justify-center mb-3 bg-background transition-colors duration-500 z-10 ${
                        active ? 'border-primary text-primary' : 'border-muted text-muted-foreground'
                      } ${current ? 'ring-4 ring-primary/20 scale-110' : ''}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className={`text-xs md:text-sm font-semibold text-center ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-card border rounded-2xl p-6 md:p-8 shadow-sm">
            <h3 className="font-bold text-lg mb-6 border-b pb-4">Order Items</h3>
            <div className="space-y-4">
              {order.items?.map(item => (
                <div key={item.id} className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="font-medium bg-muted px-2 py-1 rounded text-xs">{item.quantity}x</span> 
                    <span className="font-medium text-sm md:text-base">{item.productName}</span>
                  </div>
                  <div className="font-medium">{currency} {((item.price - (item.discount || 0)) * item.quantity).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {order && currentStep === -1 && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-8 text-center">
          <div className="inline-flex h-16 w-16 rounded-full bg-destructive/20 text-destructive items-center justify-center mb-4">
            <X className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-destructive mb-2">Order Cancelled</h2>
          <p className="text-muted-foreground">This order has been cancelled. If you believe this is a mistake, please contact support.</p>
        </div>
      )}

      {order && !isLoading && currentStep === 0 && (
        <div className="bg-card border rounded-2xl p-8 text-center animate-in fade-in duration-500">
          <div className="inline-flex h-16 w-16 rounded-full bg-muted text-muted-foreground items-center justify-center mb-4">
            <Clock className="h-8 w-8" />
          </div>
          <p className="text-sm text-muted-foreground mb-1">Order Number</p>
          <p className="text-xl font-bold mb-3">{order.orderNumber}</p>
          <p className="text-muted-foreground">
            Current status:{" "}
            <span className="font-semibold text-foreground capitalize">
              {order.status.replace(/_/g, " ")}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

// Temporary X icon component since lucide-react X was not imported initially in this file snippet scope (though it's standard, adding simple inline SVG for safety)
function X(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}
