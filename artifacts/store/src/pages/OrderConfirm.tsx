import { useParams, Link } from "wouter";
import { CheckCircle2, Copy, FileText, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGetStoreOrder, getGetStoreOrderQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

export default function OrderConfirm() {
  const { orderNumber } = useParams();
  const { toast } = useToast();
  
  // Actually, we don't have the guest token in the URL by default here, 
  // but we should check if the order belongs to the user or is a guest order.
  // The API will fail to fetch if it's a guest order and we don't pass token.
  // However, the checkout page sets it... for now we just show a success UI.

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Order number copied to clipboard."
    });
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-12 px-4">
      <div className="bg-card border rounded-3xl p-8 md:p-12 max-w-lg w-full text-center shadow-sm">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 dark:bg-green-900/30 dark:text-green-500">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        
        <h1 className="text-3xl font-bold mb-4 tracking-tight">Order Confirmed!</h1>
        <p className="text-muted-foreground mb-8 text-lg">
          Thank you for your purchase. We've received your order and will begin processing it right away.
        </p>
        
        <div className="bg-muted/50 rounded-xl p-6 mb-8 text-left border">
          <div className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wider">Order Number</div>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black font-mono tracking-tight">{orderNumber}</span>
            <Button variant="ghost" size="icon" onClick={() => copyToClipboard(orderNumber || "")}>
              <Copy className="h-5 w-5 text-muted-foreground" />
            </Button>
          </div>
          
          <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
            Please save this order number. You can use it to track your delivery status.
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/track">
            <Button variant="outline" className="w-full sm:w-auto gap-2 h-12">
              <FileText className="h-4 w-4" />
              Track Order
            </Button>
          </Link>
          <Link href="/products">
            <Button className="w-full sm:w-auto gap-2 h-12">
              Continue Shopping
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
