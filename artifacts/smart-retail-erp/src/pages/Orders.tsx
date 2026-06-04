import { useState, useMemo } from "react";
import {
  useListOrders, useGetOrder, useUpdateOrderStatus, useCreateOrder,
  useListProducts, useListCustomers,
  getListOrdersQueryKey, getGetOrderQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { fmtPKR } from "@/lib/format";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Plus, Search, MapPin, Store, Package, Truck, CheckCircle2,
  XCircle, RefreshCw, Trash2, AlertCircle,
} from "lucide-react";

// ── Status helpers ───────────────────────────────────────────────────────────
const STATUS_TRANSITIONS: Record<string, string[]> = {
  pending:           ["confirmed", "cancelled"],
  confirmed:         ["packed", "cancelled"],
  packed:            ["out_for_delivery", "cancelled"],
  out_for_delivery:  ["delivered", "cancelled"],
  delivered:         [],
  cancelled:         [],
};

const STATUS_LABELS: Record<string, string> = {
  pending:          "Pending",
  confirmed:        "Confirmed",
  packed:           "Packed",
  out_for_delivery: "Out for Delivery",
  delivered:        "Delivered",
  cancelled:        "Cancelled",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending:          <RefreshCw  className="w-3.5 h-3.5" />,
  confirmed:        <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />,
  packed:           <Package    className="w-3.5 h-3.5 text-yellow-500" />,
  out_for_delivery: <Truck      className="w-3.5 h-3.5 text-orange-500" />,
  delivered:        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />,
  cancelled:        <XCircle    className="w-3.5 h-3.5 text-red-500" />,
};

// ── Cart item type used inside Create dialog ─────────────────────────────────
interface CartItem {
  productId: number;
  name: string;
  sku: string;
  price: number;
  qty: number;
  discount: number;
}

// ════════════════════════════════════════════════════════════════════════════
export default function Orders() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ── Data queries ────────────────────────────────────────────────────────
  const { data: orders }    = useListOrders({}, { query: { queryKey: getListOrdersQueryKey() } });
  const { data: products }  = useListProducts({}, { query: { queryKey: ["products"] as const } });
  const { data: customers } = useListCustomers();

  // ── UI state ────────────────────────────────────────────────────────────
  const [statusFilter,   setStatusFilter]   = useState("all");
  const [deliveryFilter, setDeliveryFilter] = useState("all");
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [isCreateOpen,   setIsCreateOpen]   = useState(false);

  // ── Mutations ───────────────────────────────────────────────────────────
  const updateStatus = useUpdateOrderStatus();
  const createOrder  = useCreateOrder();

  // ── Order detail ─────────────────────────────────────────────────────────
  const { data: selectedOrder, isLoading: loadingDetail } = useGetOrder(
    selectedOrderId!,
    { query: { queryKey: getGetOrderQueryKey(selectedOrderId!), enabled: !!selectedOrderId } }
  );

  // ── Filtered list ────────────────────────────────────────────────────────
  const filteredOrders = useMemo(() =>
    orders?.filter(o => {
      const matchStatus   = statusFilter   === "all" || o.status === statusFilter;
      const matchDelivery = deliveryFilter === "all" || o.deliveryMethod === deliveryFilter;
      return matchStatus && matchDelivery;
    }),
    [orders, statusFilter, deliveryFilter]
  );

  // ── Status update ────────────────────────────────────────────────────────
  const handleStatusChange = (orderId: number, status: string) => {
    updateStatus.mutate({ id: orderId, data: { status } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
        if (selectedOrderId === orderId)
          queryClient.invalidateQueries({ queryKey: getGetOrderQueryKey(orderId) });
        toast({ title: `Status updated to "${STATUS_LABELS[status] ?? status}"` });
      },
      onError: () => toast({ title: "Failed to update status", variant: "destructive" }),
    });
  };

  const availableTransitions = selectedOrder ? STATUS_TRANSITIONS[selectedOrder.status] ?? [] : [];

  // ════════════════════════════════════════════════════════════════════════
  // CREATE ORDER dialog state & logic
  // ════════════════════════════════════════════════════════════════════════
  const [cartItems,       setCartItems]       = useState<CartItem[]>([]);
  const [productSearch,   setProductSearch]   = useState("");
  const [customerId,      setCustomerId]       = useState("0");
  const [deliveryMethod,  setDeliveryMethod]   = useState("home_delivery");
  const [paymentMethod,   setPaymentMethod]   = useState("cod");
  const [discount,        setDiscount]         = useState(0);
  const [tax,             setTax]              = useState(0);
  const [paidAmount,      setPaidAmount]       = useState<number | "">("");
  const [notes,           setNotes]            = useState("");
  const [customerName,    setCustomerName]     = useState("");
  const [customerPhone,   setCustomerPhone]    = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");

  const resetCreateForm = () => {
    setCartItems([]);
    setProductSearch("");
    setCustomerId("0");
    setDeliveryMethod("home_delivery");
    setPaymentMethod("cod");
    setDiscount(0);
    setTax(0);
    setPaidAmount("");
    setNotes("");
    setCustomerName("");
    setCustomerPhone("");
    setDeliveryAddress("");
  };

  const openCreate = () => { resetCreateForm(); setIsCreateOpen(true); };

  // Computed totals
  const subtotal    = cartItems.reduce((s, i) => s + (i.price * i.qty - i.discount), 0);
  const orderTotal  = Math.max(0, subtotal - discount + tax);
  const orderDue    = orderTotal - Number(paidAmount || 0);

  // Product search results
  const matchedProducts = useMemo(() => {
    if (!productSearch.trim()) return [];
    const q = productSearch.toLowerCase();
    return (products ?? [])
      .filter(p =>
        p.status === "active" &&
        p.stock > 0 &&
        (p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || (p.barcode ?? "").includes(q))
      )
      .slice(0, 8);
  }, [products, productSearch]);

  const addToCart = (p: typeof matchedProducts[0]) => {
    setCartItems(prev => {
      const existing = prev.find(i => i.productId === p.id);
      if (existing) return prev.map(i => i.productId === p.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { productId: p.id, name: p.name, sku: p.sku, price: Number(p.salePrice), qty: 1, discount: 0 }];
    });
    setProductSearch("");
  };

  const removeFromCart = (productId: number) => setCartItems(prev => prev.filter(i => i.productId !== productId));

  const updateQty = (productId: number, qty: number) => {
    if (qty < 1) { removeFromCart(productId); return; }
    setCartItems(prev => prev.map(i => i.productId === productId ? { ...i, qty } : i));
  };

  const updateItemDiscount = (productId: number, disc: number) =>
    setCartItems(prev => prev.map(i => i.productId === productId ? { ...i, discount: Math.max(0, disc) } : i));

  const handleCreateOrder = () => {
    if (cartItems.length === 0) {
      toast({ title: "Add at least one product", variant: "destructive" }); return;
    }
    if (!paymentMethod || !deliveryMethod) {
      toast({ title: "Select payment and delivery method", variant: "destructive" }); return;
    }

    const payload: any = {
      deliveryMethod,
      paymentMethod,
      discount,
      tax,
      paidAmount: Number(paidAmount || 0),
      notes: notes || undefined,
      items: cartItems.map(i => ({ productId: i.productId, quantity: i.qty, price: i.price, discount: i.discount })),
    };

    // Attach customer if selected or entered manually
    if (customerId !== "0") {
      payload.customerId = Number(customerId);
    }

    createOrder.mutate({ data: payload }, {
      onSuccess: (order) => {
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
        setIsCreateOpen(false);
        resetCreateForm();
        toast({ title: `Order #${order.orderNumber} created successfully` });
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.error ?? err?.message ?? "Failed to create order";
        toast({ title: "Create failed", description: msg, variant: "destructive" });
      },
    });
  };

  // ════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════
  return (
    <div className="p-6 space-y-6">

      {/* ── Header ── */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Create Order
        </Button>
      </div>

      {/* ── List card ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex gap-3 flex-wrap">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(STATUS_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={deliveryFilter} onValueChange={setDeliveryFilter}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Delivery Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Delivery Types</SelectItem>
                <SelectItem value="home_delivery">
                  <span className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" />Home Delivery</span>
                </SelectItem>
                <SelectItem value="pickup_from_shop">
                  <span className="flex items-center gap-2"><Store className="w-3.5 h-3.5" />Pickup from Shop</span>
                </SelectItem>
              </SelectContent>
            </Select>

            <span className="ml-auto text-sm text-muted-foreground self-center">
              {filteredOrders?.length ?? 0} orders
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Order #</TableHead>
                  <TableHead className="w-32">Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="w-36">Delivery</TableHead>
                  <TableHead className="w-32">Status</TableHead>
                  <TableHead className="w-32">Payment</TableHead>
                  <TableHead className="w-28 text-right">Total</TableHead>
                  <TableHead className="w-20 text-right">Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders?.map(o => (
                  <TableRow
                    key={o.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedOrderId(o.id)}
                  >
                    <TableCell className="font-mono font-medium">
                      #{o.orderNumber || o.id}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(o.createdAt), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell>
                      {(o as any).customerName || <span className="text-muted-foreground text-sm">Walk-in</span>}
                    </TableCell>
                    <TableCell>
                      {o.deliveryMethod === "pickup_from_shop"
                        ? <Badge variant="outline" className="gap-1 text-xs whitespace-nowrap"><Store className="w-3 h-3" />Pickup</Badge>
                        : <Badge variant="secondary" className="gap-1 text-xs whitespace-nowrap"><MapPin className="w-3 h-3" />Delivery</Badge>
                      }
                    </TableCell>
                    <TableCell><StatusBadge status={o.status} /></TableCell>
                    <TableCell><StatusBadge status={o.paymentStatus ?? "unknown"} /></TableCell>
                    <TableCell className="text-right font-medium">{fmtPKR(o.totalAmount)}</TableCell>
                    <TableCell className="text-right">
                      {Number(o.dueAmount) > 0
                        ? <span className="text-red-500 font-medium text-sm">{fmtPKR(o.dueAmount)}</span>
                        : <span className="text-green-500 text-sm">✓</span>
                      }
                    </TableCell>
                  </TableRow>
                ))}
                {!filteredOrders?.length && (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      No orders found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════════════
          CREATE ORDER DIALOG
      ══════════════════════════════════════════════════════════════════ */}
      <Dialog open={isCreateOpen} onOpenChange={(open) => { if (!open) setIsCreateOpen(false); }}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Order</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">

            {/* ── Customer ── */}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Customer</p>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger><SelectValue placeholder="Walk-in / Select customer…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Walk-in (no customer)</SelectItem>
                  {customers?.map(c => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.name} {c.phone ? `— ${c.phone}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ── Product search & cart ── */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Items *</p>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Search product by name, SKU, or barcode…"
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                />
              </div>

              {/* Dropdown results */}
              {matchedProducts.length > 0 && (
                <div className="border rounded-md bg-popover shadow-md z-10 max-h-48 overflow-y-auto">
                  {matchedProducts.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex justify-between items-center gap-3"
                      onClick={() => addToCart(p)}
                    >
                      <span>
                        <span className="font-medium">{p.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground font-mono">{p.sku}</span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {fmtPKR(p.salePrice)} · stock: {p.stock}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {productSearch && matchedProducts.length === 0 && (
                <p className="text-sm text-muted-foreground px-1 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />No matching active products
                </p>
              )}

              {/* Cart table */}
              {cartItems.length > 0 && (
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="py-2">Product</TableHead>
                        <TableHead className="w-20 text-center py-2">Qty</TableHead>
                        <TableHead className="w-24 py-2">Price</TableHead>
                        <TableHead className="w-24 py-2">Discount</TableHead>
                        <TableHead className="w-24 text-right py-2">Line Total</TableHead>
                        <TableHead className="w-10 py-2"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cartItems.map(item => (
                        <TableRow key={item.productId}>
                          <TableCell className="py-2">
                            <div className="font-medium text-sm leading-tight">{item.name}</div>
                            <div className="text-xs text-muted-foreground font-mono">{item.sku}</div>
                          </TableCell>
                          <TableCell className="py-2">
                            <div className="flex items-center justify-center gap-1">
                              <Button variant="outline" size="icon" className="h-6 w-6"
                                onClick={() => updateQty(item.productId, item.qty - 1)}>−</Button>
                              <span className="w-7 text-center text-sm font-medium">{item.qty}</span>
                              <Button variant="outline" size="icon" className="h-6 w-6"
                                onClick={() => updateQty(item.productId, item.qty + 1)}>+</Button>
                            </div>
                          </TableCell>
                          <TableCell className="py-2">
                            <Input
                              type="number" min={0}
                              value={item.price}
                              onChange={e => setCartItems(prev => prev.map(i =>
                                i.productId === item.productId ? { ...i, price: Number(e.target.value) || 0 } : i
                              ))}
                              className="h-7 w-20 text-sm"
                            />
                          </TableCell>
                          <TableCell className="py-2">
                            <Input
                              type="number" min={0}
                              value={item.discount || ""}
                              onChange={e => updateItemDiscount(item.productId, Number(e.target.value))}
                              placeholder="0"
                              className="h-7 w-20 text-sm"
                            />
                          </TableCell>
                          <TableCell className="py-2 text-right font-medium text-sm">
                            {fmtPKR(item.price * item.qty - item.discount)}
                          </TableCell>
                          <TableCell className="py-2">
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              onClick={() => removeFromCart(item.productId)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <Separator />

            {/* ── Delivery + Payment ── */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Delivery Method *</Label>
                <Select value={deliveryMethod} onValueChange={setDeliveryMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="home_delivery">
                      <span className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" />Home Delivery</span>
                    </SelectItem>
                    <SelectItem value="pickup_from_shop">
                      <span className="flex items-center gap-2"><Store className="w-3.5 h-3.5" />Pickup from Shop</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Payment Method *</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cod">💵 Cash on Delivery</SelectItem>
                    <SelectItem value="cash">💵 Cash</SelectItem>
                    <SelectItem value="easypaisa">📱 Easypaisa</SelectItem>
                    <SelectItem value="jazzcash">📱 JazzCash</SelectItem>
                    <SelectItem value="bank_transfer">🏦 Bank Transfer</SelectItem>
                    <SelectItem value="card">💳 Card</SelectItem>
                    <SelectItem value="pickup">🏪 Pay at Pickup</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ── Delivery address (home delivery only) ── */}
            {deliveryMethod === "home_delivery" && (
              <div className="space-y-1.5">
                <Label>Delivery Address</Label>
                <Textarea
                  value={deliveryAddress}
                  onChange={e => setDeliveryAddress(e.target.value)}
                  placeholder="Full delivery address"
                  rows={2}
                />
              </div>
            )}

            {/* ── Discount, Tax, Paid Amount ── */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Bill Discount (PKR)</Label>
                <Input
                  type="number" min={0}
                  value={discount || ""}
                  onChange={e => setDiscount(Number(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tax (PKR)</Label>
                <Input
                  type="number" min={0}
                  value={tax || ""}
                  onChange={e => setTax(Number(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Paid Amount</Label>
                <div className="flex gap-1.5">
                  <Input
                    type="number" min={0}
                    value={paidAmount}
                    onChange={e => setPaidAmount(e.target.value ? Number(e.target.value) : "")}
                    placeholder="0"
                  />
                  <Button type="button" variant="outline" size="sm" className="shrink-0"
                    onClick={() => setPaidAmount(orderTotal)}>Full</Button>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any order notes or delivery instructions"
                rows={2}
              />
            </div>

            {/* ── Order summary ── */}
            {cartItems.length > 0 && (
              <div className="bg-muted/40 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal ({cartItems.reduce((s, i) => s + i.qty, 0)} items)</span>
                  <span>{fmtPKR(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-orange-500">
                    <span>Discount</span><span>−{fmtPKR(discount)}</span>
                  </div>
                )}
                {tax > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tax</span><span>{fmtPKR(tax)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span><span>{fmtPKR(orderTotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Paid</span><span>{fmtPKR(Number(paidAmount || 0))}</span>
                </div>
                {orderDue > 0 && (
                  <div className="flex justify-between text-red-500 font-medium">
                    <span>Due</span><span>{fmtPKR(orderDue)}</span>
                  </div>
                )}
                {orderDue <= 0 && Number(paidAmount) > 0 && (
                  <div className="flex justify-between text-green-500">
                    <span>Change</span><span>{fmtPKR(Math.abs(orderDue))}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreateOrder}
              disabled={createOrder.isPending || cartItems.length === 0}
            >
              {createOrder.isPending ? "Creating…" : "Create Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════
          ORDER DETAIL DIALOG
      ══════════════════════════════════════════════════════════════════ */}
      <Dialog open={!!selectedOrderId} onOpenChange={(open) => !open && setSelectedOrderId(null)}>
        <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order #{selectedOrder?.orderNumber || selectedOrderId}</DialogTitle>
          </DialogHeader>

          {loadingDetail && (
            <div className="h-40 flex items-center justify-center text-muted-foreground">Loading…</div>
          )}

          {selectedOrder && (
            <div className="space-y-5">
              {/* Meta grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <div className="flex items-center gap-1.5">
                    {STATUS_ICONS[selectedOrder.status]}
                    <StatusBadge status={selectedOrder.status} />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Delivery</p>
                  <div className="flex items-center gap-1.5">
                    {selectedOrder.deliveryMethod === "pickup_from_shop"
                      ? <><Store className="w-4 h-4" /><span>Pickup from Shop</span></>
                      : <><MapPin className="w-4 h-4" /><span>Home Delivery</span></>}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Customer</p>
                  <p>{(selectedOrder as any).customerName || "Walk-in"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Date</p>
                  <p>{format(new Date(selectedOrder.createdAt), "PPP p")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Payment Method</p>
                  <p className="capitalize">{selectedOrder.paymentMethod?.replace(/_/g, " ")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Payment Status</p>
                  <StatusBadge status={selectedOrder.paymentStatus ?? "unknown"} />
                </div>
                {selectedOrder.notes && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground mb-1">Notes</p>
                    <p className="text-muted-foreground">{selectedOrder.notes}</p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Items */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Items ({selectedOrder.items?.length ?? 0})
                </p>
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="py-2">Product</TableHead>
                        <TableHead className="w-16 text-center py-2">Qty</TableHead>
                        <TableHead className="w-20 text-right py-2">Price</TableHead>
                        <TableHead className="w-20 text-right py-2">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrder.items?.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell className="py-2 font-medium text-sm">{item.productName}</TableCell>
                          <TableCell className="py-2 text-center">{item.quantity}</TableCell>
                          <TableCell className="py-2 text-right">{fmtPKR(item.price)}</TableCell>
                          <TableCell className="py-2 text-right font-medium">
                            {fmtPKR(item.price * item.quantity - (item.discount ?? 0))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <Separator />

              {/* Totals */}
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span><span>{fmtPKR(selectedOrder.subtotal)}</span>
                </div>
                {Number(selectedOrder.discount) > 0 && (
                  <div className="flex justify-between text-orange-500">
                    <span>Discount</span><span>−{fmtPKR(selectedOrder.discount)}</span>
                  </div>
                )}
                {Number(selectedOrder.tax) > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tax</span><span>{fmtPKR(selectedOrder.tax)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base pt-1 border-t">
                  <span>Total</span><span>{fmtPKR(selectedOrder.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Paid</span><span>{fmtPKR(selectedOrder.paidAmount)}</span>
                </div>
                {Number(selectedOrder.dueAmount) > 0 && (
                  <div className="flex justify-between text-red-500 font-medium">
                    <span>Due</span><span>{fmtPKR(selectedOrder.dueAmount)}</span>
                  </div>
                )}
              </div>

              {/* Status transition buttons */}
              {availableTransitions.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Update Status</p>
                    <div className="flex flex-wrap gap-2">
                      {availableTransitions.map(s => (
                        <Button
                          key={s}
                          variant={s === "cancelled" ? "destructive" : "default"}
                          size="sm"
                          className="gap-1.5"
                          disabled={updateStatus.isPending}
                          onClick={() => handleStatusChange(selectedOrder.id, s)}
                        >
                          {STATUS_ICONS[s]}
                          Mark as {STATUS_LABELS[s]}
                        </Button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {selectedOrder.status === "delivered" && (
                <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />Order delivered successfully
                </div>
              )}
              {selectedOrder.status === "cancelled" && (
                <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3 text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
                  <XCircle className="w-4 h-4 shrink-0" />Order cancelled
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
