import { useState } from "react";
import { Search, Package, MapPin, CheckCircle, Truck, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import { useGetStoreSettings, getGetStoreSettingsQueryKey } from "@workspace/api-client-react";
import { StoreOrder } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

export default function Track() {
  const [orderNumber, setOrderNumber] = useState("");
  const [guestToken, setGuestToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [order, setOrder] = useState<StoreOrder | null>(null);
  const { toast } = useToast();
  
  const { data: settings } = useGetStoreSettings({
    query: { queryKey: getGetStoreSettingsQueryKey() }
  });

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber) return;
    
    setIsLoading(true);
    setOrder(null);
    
    try {
      // The hook useGetStoreOrder doesn't accept query string tokens natively in orval output easily.
      // So we fallback to a raw fetch for the tracking page as required.
      const url = new URL(`/api/store/orders/${orderNumber}`, window.location.origin);
      if (guestToken) {
        url.searchParams.append("token", guestToken);
      }
      
      const res = await fetch(url.toString(), {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("store_token") || ""}`
        }
      });
      
      if (!res.ok) {
        throw new Error("Order not found or unauthorized");
      }
      
      const data = await res.json();
      setOrder(data);
    } catch (err: any) {
      toast({
        title: "Could not track order",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'pending': return <Clock className="h-8 w-8 text-amber-500" />;
      case 'processing': return <Package className="h-8 w-8 text-blue-500" />;
      case 'shipped': return <Truck className="h-8 w-8 text-indigo-500" />;
      case 'delivered': return <CheckCircle className="h-8 w-8 text-green-500" />;
      default: return <Package className="h-8 w-8 text-muted-foreground" />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-4 tracking-tight">Track Your Order</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Enter your order number below to check the current status of your delivery.
        </p>
      </div>
      
      <div className="bg-card border rounded-2xl p-6 md:p-8 mb-12 shadow-sm max-w-2xl mx-auto">
        <form onSubmit={handleTrack} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="orderNumber">Order Number</Label>
            <Input 
              id="orderNumber" 
              placeholder="e.g. ORD-123456" 
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              required
              className="h-12 text-lg font-mono uppercase"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="guestToken">Guest Token (Optional)</Label>
            <Input 
              id="guestToken" 
              placeholder="Required only if you checked out as a guest" 
              value={guestToken}
              onChange={(e) => setGuestToken(e.target.value)}
              className="h-12"
            />
            <p className="text-xs text-muted-foreground">If you have an account, make sure you are logged in instead.</p>
          </div>
          
          <Button type="submit" size="lg" className="w-full h-14 text-base font-bold gap-2" disabled={isLoading}>
            <Search className="h-5 w-5" />
            {isLoading ? "Tracking..." : "Track Order"}
          </Button>
        </form>
      </div>

      {order && (
        <div className="bg-card border rounded-2xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-muted/30 p-6 md:p-8 border-b flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">Order Status</div>
              <div className="text-2xl font-bold flex items-center gap-3 justify-center md:justify-start">
                {getStatusIcon(order.status)}
                <span className="capitalize">{order.status.replace('_', ' ')}</span>
              </div>
            </div>
            
            <div className="text-center md:text-right">
              <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">Order Total</div>
              <div className="text-2xl font-bold">{formatCurrency(order.totalAmount, settings?.currency)}</div>
              <div className="text-xs text-muted-foreground mt-1">{order.paymentStatus === 'paid' ? 'Paid via' : 'To be paid via'} {order.paymentMethod?.replace('_', ' ')}</div>
            </div>
          </div>
          
          <div className="p-6 md:p-8">
            <h3 className="text-lg font-bold mb-6 border-b pb-2">Order Items</h3>
            <div className="space-y-4">
              {order.items?.map(item => (
                <div key={item.id} className="flex justify-between items-center py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-muted rounded flex items-center justify-center text-xs font-bold text-muted-foreground">
                      {item.quantity}x
                    </div>
                    <span className="font-medium">{item.productName}</span>
                  </div>
                  <span className="font-medium text-muted-foreground">{formatCurrency(item.price * item.quantity, settings?.currency)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
