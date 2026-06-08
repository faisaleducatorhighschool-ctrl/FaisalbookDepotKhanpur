import { useState, useRef, useEffect, useCallback } from "react";
import { useListProducts, useCreateSale, useListCustomers, useGetSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Plus, Minus, Trash2, Search, ShoppingCart, Barcode, ScanLine, X,
  User, UserCheck, Store, Printer, FileText, Percent, Hash,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fmtPKR } from "@/lib/format";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { printSaleInvoice, type PrintMode } from "@/lib/print-invoice";

// ─── Types ───────────────────────────────────────────────────────────────────

type DiscountType = "fixed" | "pct";
type SaleMode = "counter" | "customer";

interface CartItem {
  productId: number;
  name: string;
  sku: string;
  unit: string;
  price: number;        // unit sale price
  quantity: number;
  stock: number;
  itemDiscount: number; // raw input value (either PKR or %)
  itemDiscountType: DiscountType;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the effective fixed-amount discount for one line (capped at line total) */
function effectiveItemDiscount(item: CartItem): number {
  const lineTotal = item.price * item.quantity;
  if (item.itemDiscountType === "pct") {
    return Math.min(lineTotal * item.itemDiscount / 100, lineTotal);
  }
  return Math.min(item.itemDiscount, lineTotal);
}

/** Line total after per-item discount */
function lineTotal(item: CartItem): number {
  return item.price * item.quantity - effectiveItemDiscount(item);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function POS() {
  const { data: products } = useListProducts();
  const { data: customers } = useListCustomers();
  const { data: settings } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });
  const createSale = useCreateSale();
  const { toast } = useToast();

  const [saleMode, setSaleMode] = useState<SaleMode>("counter");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState<string>("");

  // Invoice-level discount
  const [invoiceDiscount, setInvoiceDiscount] = useState<number>(0);
  const [invoiceDiscountType, setInvoiceDiscountType] = useState<DiscountType>("fixed");

  const [tax, setTax] = useState<number>(0);
  const [saleType, setSaleType] = useState<"cash" | "credit">("cash");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [paidAmount, setPaidAmount] = useState<number | "">("");

  // Mixed payment mode
  const [mixedCashAmount, setMixedCashAmount] = useState<number | "">("");
  const [mixedSecondMethod, setMixedSecondMethod] = useState<string>("easypaisa");
  const [mixedSecondAmount, setMixedSecondAmount] = useState<number | "">("");

  // Barcode scanner
  const [scanInput, setScanInput] = useState("");
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const scanBufferRef = useRef("");
  const lastKeyTimeRef = useRef(0);

  // Print
  const [lastSale, setLastSale] = useState<any>(null);
  const [showPrintDialog, setShowPrintDialog] = useState(false);

  // ── Mode switch ─────────────────────────────────────────────────────────────

  const switchMode = (mode: SaleMode) => {
    setSaleMode(mode);
    setCustomerId("");
    setCart([]);
    setInvoiceDiscount(0);
    setTax(0);
    setPaidAmount("");
  };

  // ── Product search ──────────────────────────────────────────────────────────

  const filteredProducts = products?.filter(p => {
    if (p.status !== "active") return false;
    if (!search) return true;
    const q = search.toLowerCase().trim();
    return (
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.toLowerCase().includes(q)) ||
      p.id.toString() === q
    );
  });

  // ── Cart operations ─────────────────────────────────────────────────────────

  const addToCart = useCallback((p: any) => {
    // ── Expiry validation ───────────────────────────────────────────────
    if (p.expiryDate && /^\d{4}-\d{2}-\d{2}$/.test(p.expiryDate)) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiry = new Date(p.expiryDate);
      if (expiry < today) {
        toast({
          title: "Expired Product — Sale Blocked",
          description: `${p.name} expired on ${p.expiryDate}. Cannot sell expired products.`,
          variant: "destructive",
        });
        return;
      }
      const thirtyDaysAhead = new Date(today);
      thirtyDaysAhead.setDate(thirtyDaysAhead.getDate() + 30);
      if (expiry <= thirtyDaysAhead) {
        toast({
          title: "Near-Expiry Warning",
          description: `${p.name} expires on ${p.expiryDate}. Confirm with customer before sale.`,
        });
      }
    }
    // ── Add to cart ─────────────────────────────────────────────────────
    setCart(prev => {
      const existing = prev.find(item => item.productId === p.id);
      if (existing) {
        if (existing.quantity >= p.stock) {
          toast({ title: "Cannot add more", description: "Not enough stock", variant: "destructive" });
          return prev;
        }
        return prev.map(item =>
          item.productId === p.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, {
        productId: p.id, name: p.name, sku: p.sku,
        unit: (p as any).unit || "PCS",
        price: Number(p.salePrice), quantity: 1, stock: p.stock,
        itemDiscount: 0, itemDiscountType: "fixed" as DiscountType,
      }];
    });
  }, [toast]);

  const updateQuantity = (productId: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId !== productId) return item;
      const newQty = item.quantity + delta;
      if (newQty < 1) return item;
      if (newQty > item.stock) { toast({ title: "Max stock reached", variant: "destructive" }); return item; }
      return { ...item, quantity: newQty };
    }));
  };

  const updateItemDiscount = (productId: number, val: number) => {
    setCart(prev => prev.map(item =>
      item.productId === productId ? { ...item, itemDiscount: Math.max(0, val) } : item
    ));
  };

  const updateItemDiscountType = (productId: number, type: DiscountType) => {
    setCart(prev => prev.map(item =>
      item.productId === productId ? { ...item, itemDiscountType: type, itemDiscount: 0 } : item
    ));
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  // ── Barcode scanner ─────────────────────────────────────────────────────────

  const lookupBarcode = useCallback((barcode: string) => {
    const trimmed = barcode.trim();
    if (!trimmed || trimmed.length < 3) return;
    const product = products?.find(p => p.barcode === trimmed && p.status === "active");
    if (product) {
      if (product.stock <= 0) {
        toast({ title: "Out of stock", description: product.name, variant: "destructive" });
      } else {
        addToCart(product);
        setLastScanned(product.name);
        setTimeout(() => setLastScanned(null), 2500);
      }
    } else {
      toast({ title: "Barcode not found", description: trimmed, variant: "destructive" });
    }
  }, [products, addToCart, toast]);

  useEffect(() => {
    const SCAN_GAP_MS = 80;
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isScanInput = target === scanInputRef.current;
      const isOtherInput = !isScanInput && (target.tagName === "INPUT" || target.tagName === "TEXTAREA");
      if (isOtherInput) return;
      const now = Date.now();
      if (now - lastKeyTimeRef.current > SCAN_GAP_MS) scanBufferRef.current = "";
      lastKeyTimeRef.current = now;
      if (e.key === "Enter") {
        const code = scanBufferRef.current.trim();
        if (code.length >= 3) { lookupBarcode(code); setScanInput(""); scanBufferRef.current = ""; e.preventDefault(); }
      } else if (e.key.length === 1) { scanBufferRef.current += e.key; }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [lookupBarcode]);

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    lookupBarcode(scanInput);
    setScanInput("");
    scanInputRef.current?.focus();
  };

  // ── Totals ──────────────────────────────────────────────────────────────────

  const itemsSubtotal = cart.reduce((s, item) => s + item.price * item.quantity, 0);
  const itemDiscountsTotal = cart.reduce((s, item) => s + effectiveItemDiscount(item), 0);
  const subtotalAfterItems = itemsSubtotal - itemDiscountsTotal;

  const effectiveInvoiceDiscount = invoiceDiscountType === "pct"
    ? subtotalAfterItems * invoiceDiscount / 100
    : Math.min(invoiceDiscount, subtotalAfterItems);

  const total = Math.max(0, subtotalAfterItems - effectiveInvoiceDiscount + tax);
  const mixedTotalPaid = (Number(mixedCashAmount) || 0) + (Number(mixedSecondAmount) || 0);
  const effectivePaid = paymentMethod === "mixed" ? mixedTotalPaid : Number(paidAmount || 0);
  const due = total - effectivePaid;
  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);
  const selectedCustomer = customers?.find(c => c.id.toString() === customerId);

  // ── Checkout ────────────────────────────────────────────────────────────────

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast({ title: "Cart is empty", variant: "destructive" });
      return;
    }
    if (saleMode === "customer" && !customerId) {
      toast({ title: "Select a customer", description: "Customer Sale requires a registered customer", variant: "destructive" });
      return;
    }
    if (saleMode === "counter") {
      if (saleType === "credit") {
        toast({ title: "Credit not allowed for walk-in", description: "Counter (walk-in) sales must be paid in full. Switch to Customer Sale for credit.", variant: "destructive" });
        return;
      }
      if (effectivePaid + 0.009 < total) {
        toast({ title: "Insufficient payment", description: `Walk-in sale must be fully paid. Total ${fmtPKR(total)}, received ${fmtPKR(effectivePaid)}.`, variant: "destructive" });
        return;
      }
    }

    // Build payload — omit customerId entirely for counter sales so Zod sees undefined (not null)
    const payload: Record<string, unknown> = {
      type: saleType,
      paymentMethod,
      discount: effectiveInvoiceDiscount,
      tax,
      paidAmount: effectivePaid,
      items: cart.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        discount: effectiveItemDiscount(item), // always send effective fixed-amount discount
      })),
    };

    // Only include customerId for customer sales
    if (saleMode === "customer" && customerId) {
      payload.customerId = Number(customerId);
    }

    createSale.mutate({ data: payload as any }, {
      onSuccess: (res) => {
        setLastSale(res);
        setShowPrintDialog(true);
        setCart([]);
        setCustomerId("");
        setInvoiceDiscount(0);
        setTax(0);
        setPaidAmount("");
        setMixedCashAmount("");
        setMixedSecondAmount("");
        toast({ title: "Sale completed!", description: `Invoice ${res.invoiceNumber}` });
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.error ?? err?.message ?? "Could not complete sale";
        toast({ title: "Sale failed", description: msg, variant: "destructive" });
      },
    });
  };

  const handlePrint = (mode: PrintMode) => {
    if (lastSale) printSaleInvoice(lastSale, settings, mode);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">

      {/* Mode Switcher */}
      <div className="flex items-center gap-3 px-4 pt-3 pb-2 border-b border-border bg-card flex-wrap">
        <span className="text-sm font-medium text-muted-foreground">Billing Mode:</span>

        <button
          onClick={() => switchMode("counter")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border",
            saleMode === "counter"
              ? "bg-primary text-primary-foreground border-primary shadow"
              : "bg-background hover:bg-secondary border-border text-muted-foreground"
          )}
        >
          <Store className="w-4 h-4" />Counter Sale
          <Badge variant={saleMode === "counter" ? "secondary" : "outline"} className="text-[10px] px-1.5">Walk-in</Badge>
        </button>

        <button
          onClick={() => switchMode("customer")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border",
            saleMode === "customer"
              ? "bg-primary text-primary-foreground border-primary shadow"
              : "bg-background hover:bg-secondary border-border text-muted-foreground"
          )}
        >
          <UserCheck className="w-4 h-4" />Customer Sale
          <Badge variant={saleMode === "customer" ? "secondary" : "outline"} className="text-[10px] px-1.5">Registered</Badge>
        </button>

        {saleMode === "customer" && (
          <div className="ml-2 flex items-center gap-2 flex-1 max-w-sm">
            <User className="w-4 h-4 text-muted-foreground shrink-0" />
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger className={cn("h-9", !customerId && "border-orange-400")}>
                <SelectValue placeholder="— Select registered customer —" />
              </SelectTrigger>
              <SelectContent>
                {customers?.map(c => (
                  <SelectItem key={c.id} value={c.id.toString()}>
                    {c.name}{c.phone ? ` · ${c.phone}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCustomer && (
              <span className="text-xs text-muted-foreground shrink-0">
                Bal: <span className={Number(selectedCustomer.balance) < 0 ? "text-red-500 font-medium" : "text-green-500 font-medium"}>
                  {fmtPKR(Math.abs(Number(selectedCustomer.balance)))}
                </span>
              </span>
            )}
          </div>
        )}

        {lastSale && (
          <Button
            variant="outline" size="sm" className="ml-auto flex items-center gap-1.5 text-green-600 border-green-400 hover:bg-green-50 dark:hover:bg-green-950"
            onClick={() => setShowPrintDialog(true)}
          >
            <Printer className="w-4 h-4" /> Print Last Invoice
          </Button>
        )}
      </div>

      {/* Main POS body */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-4 p-4 min-h-0">

        {/* ── Products panel ── */}
        <div className="flex-1 flex flex-col min-h-0 bg-card rounded-xl border border-border shadow-sm">
          <div className="p-4 border-b border-border space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, SKU, barcode or product ID..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="pl-8 bg-background" autoComplete="off"
              />
            </div>
            <form onSubmit={handleScanSubmit} className="flex gap-2 items-center">
              <div className="relative flex-1">
                <ScanLine className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={scanInputRef} value={scanInput} onChange={e => setScanInput(e.target.value)}
                  placeholder="Scan barcode or type + Enter..."
                  className="pl-8 bg-background font-mono text-sm" autoComplete="off"
                />
              </div>
              <Button type="submit" variant="outline" size="sm" className="shrink-0">
                <Barcode className="w-4 h-4 mr-1" />Lookup
              </Button>
            </form>
            {lastScanned && (
              <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 animate-pulse">
                <Barcode className="w-3 h-3" />Scanned: <span className="font-semibold">{lastScanned}</span>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              Search by any part of the name · SKU · Barcode · Product ID.
              USB/BT barcode scanner adds items automatically.
            </p>
          </div>

          <ScrollArea className="flex-1 p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pb-4">
              {filteredProducts?.map(p => (
                <Card
                  key={p.id}
                  onClick={() => p.stock > 0 && addToCart(p)}
                  className={cn(
                    "cursor-pointer transition-all hover:border-primary/50 hover:shadow-md overflow-hidden",
                    p.stock <= 0 && "opacity-40 grayscale cursor-not-allowed"
                  )}
                >
                  <CardContent className="p-3 flex flex-col gap-1.5 h-full">
                    <div className="font-semibold text-sm leading-tight line-clamp-2">{p.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{p.sku}</div>
                    {p.barcode && (
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Barcode className="w-3 h-3 shrink-0" />
                        <span className="font-mono truncate">{p.barcode}</span>
                      </div>
                    )}
                    <div className="mt-auto pt-1.5 flex items-center justify-between gap-1">
                      <span className="font-bold text-primary text-sm">{fmtPKR(p.salePrice)}</span>
                      <span className={cn("text-[11px] px-1.5 py-0.5 rounded-full",
                        p.stock > 0 ? "bg-secondary text-secondary-foreground" : "bg-destructive/10 text-destructive")}>
                        {p.stock > 0 ? `${p.stock}` : "Out"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {!filteredProducts?.length && (
                <div className="col-span-full h-40 flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <Search className="w-8 h-8 opacity-20" />
                  <p className="text-sm">No products match "{search}"</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* ── Cart panel ── */}
        <div className="w-full md:w-[400px] flex flex-col min-h-0 bg-card rounded-xl border border-border shadow-sm">

          {/* Cart header */}
          <div className="p-4 border-b border-border space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold">
                <ShoppingCart className="w-5 h-5" />
                {saleMode === "counter" ? "Counter Sale" : "Customer Sale"}
                {totalItems > 0 && <Badge variant="secondary">{totalItems}</Badge>}
              </div>
              <Badge variant={saleMode === "counter" ? "outline" : "default"} className="text-[10px]">
                {saleMode === "counter" ? "Walk-in" : (selectedCustomer?.name ?? "No customer")}
              </Badge>
            </div>
            {saleMode === "customer" && selectedCustomer && (
              <div className="text-xs text-muted-foreground bg-secondary/50 rounded p-2 space-y-0.5">
                <div className="font-medium text-foreground">{selectedCustomer.name}</div>
                {selectedCustomer.phone && <div>📞 {selectedCustomer.phone}</div>}
                <div>Balance: <span className={Number(selectedCustomer.balance) < 0 ? "text-red-500 font-medium" : "text-green-500 font-medium"}>
                  {fmtPKR(Math.abs(Number(selectedCustomer.balance)))}
                </span></div>
              </div>
            )}
            {saleMode === "customer" && !selectedCustomer && (
              <div className="text-xs text-orange-500 bg-orange-50 dark:bg-orange-950/30 rounded p-2">
                ⚠ Select a registered customer from the header
              </div>
            )}
          </div>

          {/* Cart items */}
          <ScrollArea className="flex-1 p-3">
            <div className="space-y-2 pr-1">
              {cart.map(item => {
                const effDisc = effectiveItemDiscount(item);
                const lt = lineTotal(item);
                return (
                  <div key={item.productId} className="bg-secondary/30 p-3 rounded-lg space-y-2">
                    {/* Product name + remove */}
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm leading-tight truncate">{item.name}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">{item.sku}</div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeFromCart(item.productId)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Price + Qty */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{fmtPKR(item.price)}</span>
                      <div className="flex items-center bg-background rounded-md border border-border">
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-none rounded-l-md"
                          onClick={() => updateQuantity(item.productId, -1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm w-8 text-center font-medium">{item.quantity}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-none rounded-r-md"
                          onClick={() => updateQuantity(item.productId, 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Per-item discount with type toggle */}
                    <div className="flex items-center gap-1.5">
                      <label className="text-[11px] text-muted-foreground shrink-0">Disc:</label>
                      {/* Type toggle: # (fixed) | % (pct) */}
                      <Button
                        variant={item.itemDiscountType === "fixed" ? "default" : "outline"}
                        size="icon" className="h-6 w-6 shrink-0"
                        title="Fixed amount discount (PKR)"
                        onClick={() => updateItemDiscountType(item.productId, "fixed")}
                      >
                        <Hash className="h-3 w-3" />
                      </Button>
                      <Button
                        variant={item.itemDiscountType === "pct" ? "default" : "outline"}
                        size="icon" className="h-6 w-6 shrink-0"
                        title="Percentage discount (%)"
                        onClick={() => updateItemDiscountType(item.productId, "pct")}
                      >
                        <Percent className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number" min={0}
                        max={item.itemDiscountType === "pct" ? 100 : item.price * item.quantity}
                        value={item.itemDiscount || ""}
                        onChange={e => updateItemDiscount(item.productId, Number(e.target.value))}
                        placeholder={item.itemDiscountType === "pct" ? "%" : "PKR"}
                        className="h-6 text-xs px-2 flex-1 bg-background min-w-0"
                      />
                      {/* Show effective discount amount when pct mode */}
                      {item.itemDiscountType === "pct" && effDisc > 0 && (
                        <span className="text-[11px] text-orange-500 shrink-0">−{fmtPKR(effDisc)}</span>
                      )}
                    </div>

                    {/* Line total */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {item.quantity} × {fmtPKR(item.price)}
                        {effDisc > 0 && <span className="text-orange-500"> − {fmtPKR(effDisc)}</span>}
                      </span>
                      <span className="font-semibold text-foreground text-sm">{fmtPKR(lt)}</span>
                    </div>
                  </div>
                );
              })}

              {cart.length === 0 && (
                <div className="h-36 flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <ShoppingCart className="h-8 w-8 opacity-20" />
                  <p className="text-sm">Cart is empty</p>
                  <p className="text-xs">Click a product or scan a barcode</p>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Totals + Checkout */}
          <div className="p-4 border-t border-border space-y-3 bg-secondary/10">
            <div className="space-y-1.5 text-sm">

              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{fmtPKR(itemsSubtotal)}</span>
              </div>

              {itemDiscountsTotal > 0 && (
                <div className="flex justify-between text-muted-foreground text-xs">
                  <span>Item Discounts</span>
                  <span className="text-orange-500">−{fmtPKR(itemDiscountsTotal)}</span>
                </div>
              )}

              {/* Invoice-level discount with % / PKR toggle */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Bill Discount</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant={invoiceDiscountType === "fixed" ? "default" : "outline"}
                    size="icon" className="h-6 w-6" title="Fixed amount"
                    onClick={() => { setInvoiceDiscountType("fixed"); setInvoiceDiscount(0); }}
                  >
                    <Hash className="h-3 w-3" />
                  </Button>
                  <Button
                    variant={invoiceDiscountType === "pct" ? "default" : "outline"}
                    size="icon" className="h-6 w-6" title="Percentage"
                    onClick={() => { setInvoiceDiscountType("pct"); setInvoiceDiscount(0); }}
                  >
                    <Percent className="h-3 w-3" />
                  </Button>
                  <Input
                    type="number" min={0}
                    max={invoiceDiscountType === "pct" ? 100 : subtotalAfterItems}
                    value={invoiceDiscount || ""}
                    onChange={e => setInvoiceDiscount(Number(e.target.value))}
                    className="h-7 w-20 text-right text-sm"
                    placeholder={invoiceDiscountType === "pct" ? "%" : "PKR"}
                  />
                </div>
              </div>

              {effectiveInvoiceDiscount > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-orange-500">
                    Bill Discount{invoiceDiscountType === "pct" ? ` (${invoiceDiscount}%)` : ""}
                  </span>
                  <span className="text-orange-500">−{fmtPKR(effectiveInvoiceDiscount)}</span>
                </div>
              )}

              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Tax</span>
                <Input
                  type="number" min={0} value={tax || ""}
                  onChange={e => setTax(Number(e.target.value))}
                  className="h-7 w-24 text-right text-sm"
                  placeholder="0"
                />
              </div>

              <Separator />

              <div className="flex justify-between font-bold text-base">
                <span>Total</span>
                <span>{fmtPKR(total)}</span>
              </div>
            </div>

            {/* Payment */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Select value={saleType} onValueChange={(v: any) => setSaleType(v)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash Sale</SelectItem>
                    <SelectItem value="credit">Credit Sale</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={paymentMethod} onValueChange={(v) => { setPaymentMethod(v); setPaidAmount(""); setMixedCashAmount(""); setMixedSecondAmount(""); }}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">💵 Cash</SelectItem>
                    <SelectItem value="card">💳 Card</SelectItem>
                    <SelectItem value="easypaisa">📱 Easypaisa</SelectItem>
                    <SelectItem value="jazzcash">📱 JazzCash</SelectItem>
                    <SelectItem value="bank_transfer">🏦 Bank Transfer</SelectItem>
                    <SelectItem value="mixed">⚡ Mixed Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Normal paid amount (non-mixed) */}
              {paymentMethod !== "mixed" && (
                <div className="flex gap-2">
                  <Input
                    type="number" min={0} placeholder="Paid Amount" value={paidAmount}
                    onChange={e => setPaidAmount(e.target.value ? Number(e.target.value) : "")}
                    className="flex-1 h-9"
                  />
                  <Button variant="outline" size="sm" className="shrink-0 h-9" onClick={() => setPaidAmount(total)}>
                    Full
                  </Button>
                </div>
              )}

              {/* Mixed payment UI */}
              {paymentMethod === "mixed" && (
                <div className="space-y-2 bg-secondary/30 rounded-lg p-2.5">
                  <div className="flex gap-2 items-center">
                    <span className="text-xs text-muted-foreground w-14 shrink-0">Cash</span>
                    <Input
                      type="number" min={0} placeholder="Cash amount"
                      value={mixedCashAmount}
                      onChange={e => setMixedCashAmount(e.target.value ? Number(e.target.value) : "")}
                      className="flex-1 h-8 text-sm"
                    />
                  </div>
                  <div className="flex gap-2 items-center">
                    <Select value={mixedSecondMethod} onValueChange={setMixedSecondMethod}>
                      <SelectTrigger className="h-8 w-28 text-xs shrink-0"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easypaisa">Easypaisa</SelectItem>
                        <SelectItem value="jazzcash">JazzCash</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="bank_transfer">Bank</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number" min={0} placeholder="Amount"
                      value={mixedSecondAmount}
                      onChange={e => setMixedSecondAmount(e.target.value ? Number(e.target.value) : "")}
                      className="flex-1 h-8 text-sm"
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground px-1">
                    <span>Total paid</span>
                    <span className="font-medium text-foreground">
                      {fmtPKR((Number(mixedCashAmount) || 0) + (Number(mixedSecondAmount) || 0))}
                    </span>
                  </div>
                </div>
              )}

              {due > 0 && (
                <div className="text-sm text-destructive text-right font-medium">
                  Due: {fmtPKR(due)}
                </div>
              )}
              {due < 0 && (
                <div className="text-sm text-green-500 text-right font-medium">
                  Change: {fmtPKR(Math.abs(due))}
                </div>
              )}
            </div>

            <Button
              className="w-full font-bold h-11 text-base shadow"
              onClick={handleCheckout}
              disabled={
                cart.length === 0 ||
                createSale.isPending ||
                (saleMode === "customer" && !customerId)
              }
            >
              {createSale.isPending ? "Processing..." : (
                saleMode === "counter" ? "✓ Complete Counter Sale" : "✓ Complete Customer Sale"
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Print Invoice Dialog ── */}
      <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-500" />
              Sale Complete — Print Invoice
            </DialogTitle>
          </DialogHeader>
          {lastSale && (
            <div className="space-y-4">
              <div className="bg-secondary/50 rounded-lg p-4 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invoice #</span>
                  <span className="font-mono font-semibold">{lastSale.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Customer</span>
                  <span>{lastSale.customerName || "Walk-in Customer"}</span>
                </div>
                {lastSale.items?.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Items</span>
                    <span>{lastSale.items.length} product{lastSale.items.length !== 1 ? "s" : ""}</span>
                  </div>
                )}
                {Number(lastSale.discount) > 0 && (
                  <div className="flex justify-between text-orange-500">
                    <span>Discount</span>
                    <span>−{fmtPKR(lastSale.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>{fmtPKR(lastSale.totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paid</span>
                  <span>{fmtPKR(lastSale.paidAmount)}</span>
                </div>
                {Number(lastSale.dueAmount) > 0 && (
                  <div className="flex justify-between text-destructive font-medium">
                    <span>Due</span>
                    <span>{fmtPKR(lastSale.dueAmount)}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button className="flex items-center gap-2" onClick={() => handlePrint("a4")}>
                  <Printer className="w-4 h-4" />Print A4
                </Button>
                <Button variant="outline" className="flex items-center gap-2" onClick={() => handlePrint("thermal-80")}>
                  <Printer className="w-4 h-4" />Thermal 80mm
                </Button>
                <Button variant="outline" className="flex items-center gap-2" onClick={() => handlePrint("thermal-58")}>
                  <Printer className="w-4 h-4" />Thermal 58mm
                </Button>
                <Button variant="outline" className="flex items-center gap-2 text-muted-foreground"
                  onClick={() => setShowPrintDialog(false)}>
                  <X className="w-4 h-4" />Skip
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Choose "Save as PDF" in the print dialog to download.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* last line closes component */}
    </div>
  );
}
