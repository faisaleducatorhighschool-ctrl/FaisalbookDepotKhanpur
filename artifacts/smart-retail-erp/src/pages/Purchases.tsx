import { useState } from "react";
import {
  useListPurchases, useCreatePurchase, useListSuppliers, useListProducts,
  getListPurchasesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Barcode, Search, Printer } from "lucide-react";
import { fmtPKR } from "@/lib/format";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { printSaleInvoice } from "@/lib/print-invoice";

interface PurchaseItem {
  productId: number;
  productName: string;
  sku: string;
  barcode?: string;
  unit: string;
  quantity: number;
  costPrice: number;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    received: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    draft: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${map[status] ?? map.draft}`}>
      {status}
    </span>
  );
}

export default function Purchases() {
  const { data: purchases } = useListPurchases({ query: { queryKey: getListPurchasesQueryKey() } });
  const { data: suppliers } = useListSuppliers();
  const { data: products } = useListProducts();
  const createPurchase = useCreatePurchase();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);

  // Form state
  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");
  const [paidAmount, setPaidAmount] = useState<number | "">("");
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [productSearch, setProductSearch] = useState("");

  // Selected purchase details dialog
  const [viewPurchase, setViewPurchase] = useState<any>(null);

  const filteredProducts = products?.filter(p => {
    if (!productSearch) return true;
    const q = productSearch.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.toLowerCase().includes(q)) ||
      p.id.toString() === q
    );
  }).slice(0, 20);

  const addItem = (product: any) => {
    const existing = items.find(i => i.productId === product.id);
    if (existing) {
      setItems(prev => prev.map(i =>
        i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
      ));
    } else {
      setItems(prev => [...prev, {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        barcode: product.barcode ?? undefined,
        unit: (product as any).unit || "PCS",
        quantity: 1,
        costPrice: Number(product.costPrice) || 0,
      }]);
    }
    setProductSearch("");
  };

  const updateItem = (productId: number, field: keyof PurchaseItem, value: number) => {
    setItems(prev => prev.map(i =>
      i.productId === productId ? { ...i, [field]: value } : i
    ));
  };

  const removeItem = (productId: number) => {
    setItems(prev => prev.filter(i => i.productId !== productId));
  };

  const total = items.reduce((s, i) => s + i.quantity * i.costPrice, 0);
  const due = total - Number(paidAmount || 0);

  const resetForm = () => {
    setSupplierId("");
    setNotes("");
    setPaidAmount("");
    setItems([]);
    setProductSearch("");
  };

  const handleSubmit = () => {
    if (!supplierId) { toast({ title: "Select a supplier", variant: "destructive" }); return; }
    if (items.length === 0) { toast({ title: "Add at least one product", variant: "destructive" }); return; }

    createPurchase.mutate({
      data: {
        supplierId: Number(supplierId),
        notes: notes || undefined,
        paidAmount: Number(paidAmount || 0),
        items: items.map(i => ({
          productId: i.productId,
          quantity: i.quantity,
          costPrice: i.costPrice,
        })),
      }
    }, {
      onSuccess: (res) => {
        toast({ title: "Purchase created!", description: `PO ${res.purchaseNumber}` });
        queryClient.invalidateQueries({ queryKey: getListPurchasesQueryKey() });
        resetForm();
        setOpen(false);
      },
    });
  };

  const handlePrintPO = (purchase: any) => {
    // Build a purchase invoice in the same style as sales invoice
    const fakeSale = {
      invoiceNumber: purchase.purchaseNumber,
      customerName: purchase.supplierName,
      type: "Purchase Order",
      paymentMethod: "—",
      subtotal: purchase.totalAmount,
      discount: 0,
      tax: 0,
      totalAmount: purchase.totalAmount,
      paidAmount: purchase.paidAmount,
      dueAmount: purchase.dueAmount,
      createdAt: purchase.createdAt,
      items: (purchase.items || []).map((it: any) => ({
        productName: it.productName,
        quantity: it.quantity,
        price: it.costPrice,
        discount: 0,
      })),
    };
    printSaleInvoice(fakeSale, null, "a4");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Purchases</h1>
        <Button onClick={() => { resetForm(); setOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />Create Purchase
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total POs</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{purchases?.length ?? 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Purchased</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{fmtPKR(purchases?.reduce((s, p) => s + Number(p.totalAmount), 0))}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Outstanding Due</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-500">{fmtPKR(purchases?.reduce((s, p) => s + Number(p.dueAmount), 0))}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO Number</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Due</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchases?.map(p => (
                <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setViewPurchase(p)}>
                  <TableCell className="font-mono text-sm font-medium">{p.purchaseNumber}</TableCell>
                  <TableCell>{format(new Date(p.createdAt), "MMM dd, yyyy")}</TableCell>
                  <TableCell>{p.supplierName || `Supplier #${p.supplierId}`}</TableCell>
                  <TableCell><StatusBadge status={p.status} /></TableCell>
                  <TableCell className="text-right font-semibold">{fmtPKR(p.totalAmount)}</TableCell>
                  <TableCell className="text-right text-green-600">{fmtPKR(p.paidAmount)}</TableCell>
                  <TableCell className="text-right">
                    {Number(p.dueAmount) > 0
                      ? <span className="text-red-500 font-medium">{fmtPKR(p.dueAmount)}</span>
                      : <span className="text-green-500">Paid</span>}
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Print PO"
                      onClick={() => handlePrintPO(p)}>
                      <Printer className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!purchases?.length && (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    No purchases yet. Click "Create Purchase" to add one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Purchase Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Purchase Order</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Supplier + Notes */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Supplier <span className="text-destructive">*</span></Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger className={!supplierId ? "border-orange-400" : ""}>
                    <SelectValue placeholder="Select supplier..." />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers?.map(s => (
                      <SelectItem key={s.id} value={s.id.toString()}>
                        {s.name}{s.phone ? ` · ${s.phone}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount Paid (optional)</Label>
                <Input
                  type="number" placeholder="0" value={paidAmount}
                  onChange={e => setPaidAmount(e.target.value ? Number(e.target.value) : "")}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes for this purchase..." rows={2} />
            </div>

            {/* Product Search */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Add Products</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, SKU, barcode or product ID..."
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              {productSearch && (
                <div className="border border-border rounded-lg divide-y divide-border max-h-52 overflow-y-auto bg-background shadow-md">
                  {filteredProducts?.length ? filteredProducts.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addItem(p)}
                      className="w-full px-4 py-2.5 text-left hover:bg-muted/50 transition-colors flex items-center justify-between gap-4"
                    >
                      <div>
                        <div className="font-medium text-sm">{p.name}</div>
                        <div className="text-xs text-muted-foreground font-mono flex items-center gap-2">
                          <span>{p.sku}</span>
                          {p.barcode && <span className="flex items-center gap-1"><Barcode className="w-3 h-3" />{p.barcode}</span>}
                        </div>
                      </div>
                      <div className="text-xs text-right shrink-0">
                        <div className="text-muted-foreground">Cost: {fmtPKR(p.costPrice)}</div>
                        <div className="text-muted-foreground">Stock: {p.stock}</div>
                      </div>
                    </button>
                  )) : (
                    <div className="px-4 py-3 text-sm text-muted-foreground">No products found</div>
                  )}
                </div>
              )}
            </div>

            {/* Items table */}
            {items.length > 0 && (
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU / Barcode</TableHead>
                      <TableHead className="w-16">Unit</TableHead>
                      <TableHead className="text-right w-24">Qty</TableHead>
                      <TableHead className="text-right w-32">Cost Price</TableHead>
                      <TableHead className="text-right w-28">Total</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map(item => (
                      <TableRow key={item.productId}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          <div>{item.sku}</div>
                          {item.barcode && <div className="flex items-center gap-1 mt-0.5"><Barcode className="w-3 h-3" />{item.barcode}</div>}
                        </TableCell>
                        <TableCell><span className="text-xs bg-secondary px-1.5 py-0.5 rounded">{item.unit}</span></TableCell>
                        <TableCell>
                          <Input
                            type="number" min={1} value={item.quantity}
                            onChange={e => updateItem(item.productId, "quantity", Number(e.target.value))}
                            className="h-8 text-right w-20 ml-auto"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number" min={0} value={item.costPrice}
                            onChange={e => updateItem(item.productId, "costPrice", Number(e.target.value))}
                            className="h-8 text-right w-28 ml-auto"
                          />
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {fmtPKR(item.quantity * item.costPrice)}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => removeItem(item.productId)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="bg-muted/30 p-4 space-y-1.5 text-sm border-t border-border">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Amount:</span>
                    <span className="font-bold text-base">{fmtPKR(total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount Paid:</span>
                    <span>{fmtPKR(Number(paidAmount || 0))}</span>
                  </div>
                  <div className={`flex justify-between font-semibold ${due > 0 ? "text-destructive" : "text-green-500"}`}>
                    <span>Due Amount:</span>
                    <span>{fmtPKR(Math.max(0, due))}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={createPurchase.isPending || !supplierId || items.length === 0}
            >
              {createPurchase.isPending ? "Creating..." : "Create Purchase Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Purchase Dialog */}
      {viewPurchase && (
        <Dialog open={!!viewPurchase} onOpenChange={() => setViewPurchase(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between gap-2">
                <span>{viewPurchase.purchaseNumber}</span>
                <StatusBadge status={viewPurchase.status} />
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3 text-muted-foreground">
                <div><span className="font-medium text-foreground">Supplier:</span> {viewPurchase.supplierName || "—"}</div>
                <div><span className="font-medium text-foreground">Date:</span> {viewPurchase.createdAt?.slice(0, 10)}</div>
                <div><span className="font-medium text-foreground">Total:</span> {fmtPKR(viewPurchase.totalAmount)}</div>
                <div><span className="font-medium text-foreground">Paid:</span> {fmtPKR(viewPurchase.paidAmount)}</div>
                {Number(viewPurchase.dueAmount) > 0 && (
                  <div className="text-destructive col-span-2">
                    <span className="font-medium">Due:</span> {fmtPKR(viewPurchase.dueAmount)}
                  </div>
                )}
                {viewPurchase.notes && (
                  <div className="col-span-2"><span className="font-medium text-foreground">Notes:</span> {viewPurchase.notes}</div>
                )}
              </div>
              {viewPurchase.items?.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewPurchase.items.map((it: any) => (
                      <TableRow key={it.id}>
                        <TableCell>{it.productName}</TableCell>
                        <TableCell className="text-right">{it.quantity}</TableCell>
                        <TableCell className="text-right">{fmtPKR(it.costPrice)}</TableCell>
                        <TableCell className="text-right">{fmtPKR(it.quantity * Number(it.costPrice))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handlePrintPO(viewPurchase)} className="flex items-center gap-2">
                <Printer className="w-4 h-4" />Print PO
              </Button>
              <Button onClick={() => setViewPurchase(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
