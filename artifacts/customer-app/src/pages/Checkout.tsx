import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { useCart } from "@/context/CartContext";
import { usePlaceStoreOrder } from "@workspace/api-client-react";
import type { StoreOrderInput } from "@workspace/api-client-react";

const PAYMENT_METHODS = [
  { value: "cod", label: "Cash on Delivery" },
  { value: "easypaisa", label: "EasyPaisa" },
  { value: "jazzcash", label: "JazzCash" },
  { value: "bank_transfer", label: "Bank Transfer" },
] as const;

const DELIVERY_METHODS = [
  { value: "home_delivery", label: "Home Delivery" },
  { value: "pickup_from_shop", label: "Pick up from Shop" },
] as const;

export default function Checkout() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { items, subtotal, clearCart } = useCart();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("cod");
  const [deliveryMethod, setDeliveryMethod] = useState<string>("home_delivery");

  const placeOrder = usePlaceStoreOrder();

  if (items.length === 0) {
    navigate("/cart");
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast({ title: "Please fill in your name and phone number", variant: "destructive" });
      return;
    }
    if (deliveryMethod === "home_delivery" && !address.trim()) {
      toast({ title: "Please enter your delivery address", variant: "destructive" });
      return;
    }

    const input: StoreOrderInput = {
      items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      paymentMethod: paymentMethod as StoreOrderInput["paymentMethod"],
      deliveryMethod: deliveryMethod as StoreOrderInput["deliveryMethod"],
      name: name.trim(),
      phone: phone.trim(),
      deliveryAddress: address.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    try {
      const order = await placeOrder.mutateAsync({ data: input });
      clearCart();
      navigate(`/order-confirm/${order.orderNumber}?token=${order.customerToken ?? ""}`);
    } catch {
      toast({ title: "Failed to place order. Please try again.", variant: "destructive" });
    }
  }

  return (
    <MobileLayout hideNav>
      <div className="bg-white px-4 py-4 border-b flex items-center gap-3">
        <button onClick={() => navigate("/cart")}>
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Checkout</h1>
      </div>

      <form onSubmit={handleSubmit} className="px-4 py-4 space-y-5 pb-32">
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">Contact Information</h2>
          <div className="space-y-1">
            <Label className="text-xs">Full Name *</Label>
            <Input
              placeholder="Your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Phone Number *</Label>
            <Input
              placeholder="0300-0000000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">Delivery Method</h2>
          <RadioGroup value={deliveryMethod} onValueChange={setDeliveryMethod}>
            {DELIVERY_METHODS.map(({ value, label }) => (
              <div key={value} className="flex items-center gap-2">
                <RadioGroupItem value={value} id={`dm-${value}`} />
                <Label htmlFor={`dm-${value}`} className="text-sm cursor-pointer">
                  {label}
                </Label>
              </div>
            ))}
          </RadioGroup>

          {deliveryMethod === "home_delivery" && (
            <div className="space-y-1">
              <Label className="text-xs">Delivery Address *</Label>
              <Textarea
                placeholder="Street, Area, City"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
              />
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">Payment Method</h2>
          <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
            {PAYMENT_METHODS.map(({ value, label }) => (
              <div key={value} className="flex items-center gap-2">
                <RadioGroupItem value={value} id={`pm-${value}`} />
                <Label htmlFor={`pm-${value}`} className="text-sm cursor-pointer">
                  {label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm space-y-1">
          <Label className="text-xs">Order Notes (optional)</Label>
          <Textarea
            placeholder="Any special instructions..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm space-y-2">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Order Summary</h2>
          {items.map((item) => (
            <div key={item.productId} className="flex justify-between text-sm">
              <span className="text-gray-600 line-clamp-1 flex-1 mr-2">
                {item.name} × {item.quantity}
              </span>
              <span className="font-medium shrink-0">
                Rs {((item.discountPrice ?? item.salePrice) * item.quantity).toLocaleString()}
              </span>
            </div>
          ))}
          <div className="border-t pt-2 flex justify-between font-bold">
            <span>Total</span>
            <span className="text-indigo-600">Rs {subtotal.toLocaleString()}</span>
          </div>
        </div>
      </form>

      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t px-4 py-3">
        <Button
          type="submit"
          form="checkout-form"
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-full h-11"
          disabled={placeOrder.isPending}
          onClick={handleSubmit}
        >
          {placeOrder.isPending ? "Placing Order..." : `Place Order · Rs ${subtotal.toLocaleString()}`}
        </Button>
      </div>
    </MobileLayout>
  );
}
