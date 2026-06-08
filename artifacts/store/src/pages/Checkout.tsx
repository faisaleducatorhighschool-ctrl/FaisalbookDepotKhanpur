import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCart } from "@/context/CartContext";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { useGetStoreSettings, usePlaceStoreOrder } from "@workspace/api-client-react";
import { StoreOrderInputPaymentMethod } from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { ShieldCheck, ArrowRight, CreditCard, Banknote, Landmark, Wallet } from "lucide-react";
import { toast } from "sonner";

const checkoutSchema = z.object({
  name: z.string().min(2, "Name is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  deliveryAddress: z.string().min(5, "Delivery address is required"),
  notes: z.string().optional(),
  paymentMethod: z.enum(["cod", "easypaisa", "jazzcash", "bank_transfer"] as const),
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

export default function Checkout() {
  const [_, setLocation] = useLocation();
  const { items, subtotal, clearCart } = useCart();
  const { customer } = useCustomerAuth();
  const { data: settings } = useGetStoreSettings();
  const placeOrder = usePlaceStoreOrder();

  const form = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      name: customer?.name || "",
      phone: customer?.phone || "",
      deliveryAddress: customer?.address || "",
      notes: "",
      paymentMethod: "cod",
    },
  });

  const paymentMethod = form.watch("paymentMethod");
  const currency = settings?.currency || "Rs.";

  // Redirect if empty
  useEffect(() => {
    if (items.length === 0) {
      setLocation("/cart");
    }
  }, [items, setLocation]);

  const onSubmit = (data: CheckoutForm) => {
    if (items.length === 0) return;

    placeOrder.mutate(
      {
        data: {
          items: items.map(i => ({ productId: i.productId, quantity: i.quantity })),
          paymentMethod: data.paymentMethod as StoreOrderInputPaymentMethod,
          name: data.name,
          phone: data.phone,
          deliveryAddress: data.deliveryAddress,
          notes: data.notes,
        }
      },
      {
        onSuccess: (order) => {
          clearCart();
          toast.success("Order placed successfully!");
          setLocation(`/order-success?order=${order.orderNumber}`);
        },
        onError: (err) => {
          toast.error("Failed to place order. Please try again.");
          console.error(err);
        }
      }
    );
  };

  if (items.length === 0) return null;

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      <div className="grid lg:grid-cols-5 gap-12">
        {/* Form */}
        <div className="lg:col-span-3">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              {/* Delivery Info */}
              <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-6">
                <h2 className="text-xl font-bold border-b pb-4">1. Delivery Information</h2>
                {!customer && (
                  <div className="bg-primary/5 text-primary p-4 rounded-lg text-sm mb-4">
                    Already have an account? <Link href="/login" className="font-bold underline">Log in</Link> for faster checkout.
                  </div>
                )}
                
                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl><Input placeholder="Ali Khan" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number *</FormLabel>
                      <FormControl><Input placeholder="0300 1234567" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="deliveryAddress" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Complete Delivery Address *</FormLabel>
                    <FormControl><Textarea placeholder="House 123, Street 4, Sector G-10/4, Islamabad" className="resize-none" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order Notes (Optional)</FormLabel>
                    <FormControl><Input placeholder="E.g., Please ring the bell when arriving" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Payment Info */}
              <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-6">
                <h2 className="text-xl font-bold border-b pb-4">2. Payment Method</h2>
                
                <FormField control={form.control} name="paymentMethod" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid sm:grid-cols-2 gap-4">
                        
                        <FormItem className="flex items-center space-x-3 space-y-0 rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5">
                          <FormControl><RadioGroupItem value="cod" /></FormControl>
                          <div className="flex-1">
                            <FormLabel className="font-semibold cursor-pointer flex items-center gap-2">
                              <Banknote className="h-4 w-4 text-primary" /> Cash on Delivery
                            </FormLabel>
                          </div>
                        </FormItem>

                        {settings?.easypaisaNumber && (
                          <FormItem className="flex items-center space-x-3 space-y-0 rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5">
                            <FormControl><RadioGroupItem value="easypaisa" /></FormControl>
                            <div className="flex-1">
                              <FormLabel className="font-semibold cursor-pointer flex items-center gap-2">
                                <Wallet className="h-4 w-4 text-[#00A859]" /> EasyPaisa
                              </FormLabel>
                            </div>
                          </FormItem>
                        )}

                        {settings?.jazzcashNumber && (
                          <FormItem className="flex items-center space-x-3 space-y-0 rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5">
                            <FormControl><RadioGroupItem value="jazzcash" /></FormControl>
                            <div className="flex-1">
                              <FormLabel className="font-semibold cursor-pointer flex items-center gap-2">
                                <Wallet className="h-4 w-4 text-[#ED1C24]" /> JazzCash
                              </FormLabel>
                            </div>
                          </FormItem>
                        )}

                        {settings?.bankAccount && (
                          <FormItem className="flex items-center space-x-3 space-y-0 rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5">
                            <FormControl><RadioGroupItem value="bank_transfer" /></FormControl>
                            <div className="flex-1">
                              <FormLabel className="font-semibold cursor-pointer flex items-center gap-2">
                                <Landmark className="h-4 w-4 text-primary" /> Bank Transfer
                              </FormLabel>
                            </div>
                          </FormItem>
                        )}

                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Inline Payment Details Display */}
                {paymentMethod === 'easypaisa' && settings?.easypaisaNumber && (
                  <div className="bg-muted/50 p-4 rounded-lg text-sm space-y-2 border">
                    <p className="font-medium">Please transfer {currency} {subtotal.toLocaleString()} to our EasyPaisa account:</p>
                    <p className="font-bold text-lg">{settings.easypaisaNumber}</p>
                    <p className="text-muted-foreground">Your order will be processed after payment verification.</p>
                  </div>
                )}

                {paymentMethod === 'jazzcash' && settings?.jazzcashNumber && (
                  <div className="bg-muted/50 p-4 rounded-lg text-sm space-y-2 border">
                    <p className="font-medium">Please transfer {currency} {subtotal.toLocaleString()} to our JazzCash account:</p>
                    <p className="font-bold text-lg">{settings.jazzcashNumber}</p>
                    <p className="text-muted-foreground">Your order will be processed after payment verification.</p>
                  </div>
                )}

                {paymentMethod === 'bank_transfer' && settings?.bankAccount && (
                  <div className="bg-muted/50 p-4 rounded-lg text-sm space-y-2 border">
                    <p className="font-medium">Please transfer {currency} {subtotal.toLocaleString()} to our Bank account:</p>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className="text-muted-foreground">Bank Name:</div>
                      <div className="font-semibold">{settings.bankName}</div>
                      <div className="text-muted-foreground">Account Title:</div>
                      <div className="font-semibold">{settings.bankAccountTitle}</div>
                      <div className="text-muted-foreground">Account Number:</div>
                      <div className="font-semibold">{settings.bankAccount}</div>
                      {settings.bankIban && (
                        <>
                          <div className="text-muted-foreground">IBAN:</div>
                          <div className="font-semibold">{settings.bankIban}</div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="hidden lg:block">
                <Button type="submit" size="lg" className="w-full h-14 text-lg" disabled={placeOrder.isPending}>
                  {placeOrder.isPending ? "Processing..." : "Place Order"} <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </form>
          </Form>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-2">
          <div className="bg-muted/30 border rounded-2xl p-6 sticky top-24">
            <h2 className="text-xl font-bold mb-6">Order Summary</h2>
            
            <div className="space-y-4 mb-6">
              {items.map(item => (
                <div key={item.productId} className="flex gap-4">
                  <div className="h-16 w-16 bg-muted rounded-md border shrink-0 overflow-hidden">
                    {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <h4 className="font-medium text-sm line-clamp-1">{item.name}</h4>
                    <div className="text-muted-foreground text-xs mt-1">Qty: {item.quantity}</div>
                  </div>
                  <div className="font-medium text-sm flex items-center">
                    {currency} {((item.discountPrice ?? item.salePrice) * item.quantity).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            <Separator className="my-6" />
            
            <div className="space-y-4 text-sm mb-6">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{currency} {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-medium">Free</span>
              </div>
            </div>
            
            <Separator className="my-6" />
            
            <div className="flex justify-between items-center mb-8">
              <span className="text-lg font-bold">Total</span>
              <span className="text-2xl font-bold text-primary">{currency} {subtotal.toLocaleString()}</span>
            </div>

            <div className="lg:hidden">
              <Button type="button" size="lg" className="w-full h-14 text-lg" disabled={placeOrder.isPending} onClick={() => form.handleSubmit(onSubmit)()}>
                {placeOrder.isPending ? "Processing..." : "Place Order"} <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
            
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-green-500" /> Secure Checkout
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
