import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useListProducts, useListSuppliers } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Search, Trash2, RotateCcw, AlertCircle, Printer } from "lucide-react";
import { fmtPKR } from "@/lib/format";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("erp_token") ?? "";
  const r = await fetch(`${BASE}${url}`, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...options?.headers },
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: `HTTP ${r.status}` }));
    throw new Error(err.error ?? `HTTP ${r.status}`);
  }
  return r.json();
}

// ── Return Reason Options ─────────────────────────────────────────────────────

const CUSTOMER_RETURN_REASONS = [
  { value: "expired_product",      label: "Product Expired" },
  { value: "damaged_product",      label: "Product Damaged" },
  { value: "wrong_product",        label: "Wrong Product Delivered" },
  { value: "quality_issue",        label: "Quality Issue" },
  { value: "customer_changed_mind",label: "Customer Changed Mind" },
  { value: "packaging_issue",      label: "Packaging / Seal Issue" },
  { value: "other",                label: "Other" },
];

const SUPPLIER_RETURN_REASONS = [
  { value: "expired_stock",    label: "Expired Stock" },
  { value: "damaged_stock",    label: "Damaged Stock Received" },
  { value: "wrong_supply",     label: "Wrong Product Supplied" },
  { value: "excess_inventory", label: "Excess Inventory" },
  { value: "quality_issue",    label: "Quality Not Acceptable" },
  { value: "other",            label: "Other" },
];

function reasonLabel(reason: string | null | undefined, options: typeof CUSTOMER_RETURN_REASONS) {
  if (!reason) return "—";
  return options.find(o => o.value === reason)?.label ?? reason;
}

// ── Print Helper ──────────────────────────────────────────────────────────────

function printReturnDoc(title: string, rows: { label: string; value: string }[], items: { name: string; qty: number; price: number }[], total: number) {
  const html = `
    <html><head><title>${title}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 24px; font-size: 13px; }
      h2 { margin-bottom: 4px; } .meta { color: #666; margin-bottom: 12px; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
      th { background: #f0f0f0; }
      .total { font-weight: bold; font-size: 15px; margin-top: 12px; text-align: right; }
      @media print { button { display: none; } }
    </style></head>
    <body>
      <h2>${title}</h2>
      <div class="meta">${rows.map(r => `<span style="margin-right:18px"><b>${r.label}:</b> ${r.value}</span>`).join("")}</div>
      <table>
        <thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
        <tbody>${items.map(i => `<tr><td>${i.name}</td><td>${i.qty}</td><td>${fmtPKR(i.price)}</td><td>${fmtPKR(i.price * i.qty)}</td></tr>`).join("")}</tbody>
      </table>
      <div class="total">Total Return: ${fmtPKR(total)}</div>
      <script>window.onload=function(){window.print()}<\/script>
    </body></html>
  `;
  const w = window.open("", "_blank");
  if (w) { w.document.write(html); w.document.close(); }
}

// ── Sales Returns ─────────────────────────────────────────────────────────────

interface ReturnItem {
  productId: number;
  productName: string;
  quantity: number;
  price: number;
  maxQty: number;
}

function ReasonSelect({ value, onChange, options, required }: {
  value: string; onChange: (v: string) => void;
  options: typeof CUSTOMER_RETURN_REASONS; required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label>Return Reason {required && <span className="text-destructive">*</span>}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={!value ? "border-orange-400" : ""}>
          <SelectValue placeholder="Select reason…" />
        </SelectTrigger>
        <SelectContent>
          {options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
      {!value && <p className="text-xs text-orange-500">Return reason is required</p>}
    </div>
  );
}

function SaleReturnByInvoice() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [foundSale, setFoundSale] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [searchError, setSearchError] = useState("");
  const [returnReason, setReturnReason] = useState("");

  const searchInvoice = async () => {
    if (!invoiceSearch.trim()) return;
    setSearching(true); setSearchError(""); setFoundSale(null); setReturnItems([]);
    try {
      const sales: any[] = await apiFetch("/api/sales?limit=500");
      const sale = sales.find(s => s.invoiceNumber.toLowerCase() === invoiceSearch.trim().toLowerCase());
      if (!sale) { setSearchError("Invoice not found."); setSearching(false); return; }
      if (sale.isReturn) { setSearchError("This invoice is already a return."); setSearching(false); return; }
      const detailed: any = await apiFetch(`/api/sales/${sale.id}`);
      setFoundSale(detailed);
      setReturnItems(detailed.items.map((it: any) => ({
        productId: it.productId, productName: it.productName,
        quantity: it.quantity, price: Number(it.price), maxQty: it.quantity,
      })));
    } catch (e: any) { setSearchError(e.message); }
    finally { setSearching(false); }
  };

  const updateQty = (idx: number, qty: number) =>
    setReturnItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: Math.min(Math.max(0, qty), it.maxQty) } : it));
  const removeItem = (idx: number) => setReturnItems(prev => prev.filter((_, i) => i !== idx));

  const activeItems = returnItems.filter(it => it.quantity > 0);
  const returnTotal = activeItems.reduce((s, it) => s + it.price * it.quantity, 0);

  const submitReturn = useMutation({
    mutationFn: () => {
      if (!returnReason) throw new Error("Please select a return reason.");
      const items = activeItems.map(it => ({ productId: it.productId, quantity: it.quantity, price: it.price }));
      if (!items.length) throw new Error("Select at least one item to return.");
      return apiFetch(`/api/sales/${foundSale.id}/return`, {
        method: "POST", body: JSON.stringify({ items, returnReason }),
      });
    },
    onSuccess: (data: any) => {
      toast({ title: "Return processed", description: `Return invoice ${data.invoiceNumber} created.` });
      qc.invalidateQueries({ queryKey: ["sales-returns-history"] });
      setFoundSale(null); setReturnItems([]); setInvoiceSearch(""); setReturnReason("");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-5 pb-4 space-y-4">
          <div className="flex gap-3 items-end">
            <div className="flex-1 space-y-1.5">
              <Label>Invoice Number</Label>
              <Input placeholder="e.g. INV-1780473324631" value={invoiceSearch}
                onChange={e => { setInvoiceSearch(e.target.value); setSearchError(""); }}
                onKeyDown={e => e.key === "Enter" && searchInvoice()} />
            </div>
            <Button onClick={searchInvoice} disabled={searching || !invoiceSearch.trim()}>
              <Search className="w-4 h-4 mr-2" />{searching ? "Searching…" : "Load Invoice"}
            </Button>
          </div>
          {searchError && <div className="flex items-center gap-2 text-sm text-destructive"><AlertCircle className="w-4 h-4 shrink-0" />{searchError}</div>}
          {foundSale && <ReasonSelect value={returnReason} onChange={setReturnReason} options={CUSTOMER_RETURN_REASONS} required />}
        </CardContent>
      </Card>

      {foundSale && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Invoice: <span className="font-mono text-primary">{foundSale.invoiceNumber}</span></CardTitle>
                <div className="flex gap-4 text-sm text-muted-foreground flex-wrap">
                  <span>Date: {new Date(foundSale.createdAt).toLocaleDateString("en-PK")}</span>
                  <span>Customer: {foundSale.customerName ?? "Walk-in"}</span>
                  <span>Total: {fmtPKR(foundSale.totalAmount)}</span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">Set quantity to 0 to exclude an item.</p>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Sold Price</TableHead>
                    <TableHead className="text-right">Max Qty</TableHead>
                    <TableHead className="text-right w-28">Return Qty</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {returnItems.map((it, idx) => (
                      <TableRow key={idx} className={it.quantity === 0 ? "opacity-40" : ""}>
                        <TableCell className="font-medium">{it.productName}</TableCell>
                        <TableCell className="text-right">{fmtPKR(it.price)}</TableCell>
                        <TableCell className="text-right">{it.maxQty}</TableCell>
                        <TableCell className="text-right">
                          <Input type="number" min={0} max={it.maxQty} value={it.quantity}
                            onChange={e => updateQty(idx, Number(e.target.value))} className="w-20 text-right h-8" />
                        </TableCell>
                        <TableCell className="text-right font-medium">{it.quantity > 0 ? fmtPKR(it.price * it.quantity) : "—"}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeItem(idx)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <Card className="h-fit">
            <CardHeader className="pb-3"><CardTitle className="text-base">Return Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm">
                {activeItems.map((it, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="text-muted-foreground">{it.productName} ×{it.quantity}</span>
                    <span>{fmtPKR(it.price * it.quantity)}</span>
                  </div>
                ))}
                {!activeItems.length && <p className="text-muted-foreground text-center py-2">No items selected</p>}
              </div>
              {activeItems.length > 0 && (
                <>
                  <Separator />
                  <div className="flex justify-between font-bold text-base">
                    <span>Total Return</span>
                    <span className="text-destructive">{fmtPKR(returnTotal)}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={() => submitReturn.mutate()} disabled={submitReturn.isPending || !returnReason}>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      {submitReturn.isPending ? "Processing…" : "Process Return"}
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => printReturnDoc("Customer Return — " + foundSale.invoiceNumber,
                      [{ label: "Invoice", value: foundSale.invoiceNumber }, { label: "Date", value: new Date().toLocaleDateString("en-PK") }, { label: "Reason", value: reasonLabel(returnReason, CUSTOMER_RETURN_REASONS) }],
                      activeItems.map(it => ({ name: it.productName, qty: it.quantity, price: it.price })), returnTotal)}>
                      <Printer className="w-4 h-4" />
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function SaleReturnManual() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: products = [] } = useListProducts();
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<ReturnItem[]>([]);
  const [returnReason, setReturnReason] = useState("");

  const filteredProducts = products.filter(p => {
    if (!search) return false;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
  }).slice(0, 15);

  const addProduct = (p: any) => {
    if (items.find(it => it.productId === p.id)) {
      toast({ title: "Already added", description: `${p.name} is already in the list.` }); return;
    }
    setItems(prev => [...prev, { productId: p.id, productName: p.name, quantity: 1, price: Number(p.salePrice), maxQty: 999 }]);
    setSearch("");
  };

  const updateQty = (idx: number, qty: number) => setItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: Math.max(1, qty) } : it));
  const updatePrice = (idx: number, price: number) => setItems(prev => prev.map((it, i) => i === idx ? { ...it, price: Math.max(0, price) } : it));
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));
  const total = items.reduce((s, it) => s + it.price * it.quantity, 0);

  const submitReturn = useMutation({
    mutationFn: () => {
      if (!returnReason) throw new Error("Please select a return reason.");
      if (!items.length) throw new Error("Add at least one item to return.");
      return apiFetch("/api/sales/manual-return", {
        method: "POST", body: JSON.stringify({ items: items.map(it => ({ productId: it.productId, quantity: it.quantity, price: it.price })), returnReason }),
      });
    },
    onSuccess: (data: any) => {
      toast({ title: "Return processed", description: `Return invoice ${data?.invoiceNumber ?? ""} created.` });
      qc.invalidateQueries({ queryKey: ["sales-returns-history"] });
      setItems([]); setReturnReason("");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-5 pb-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5 relative">
              <Label>Search Product to Return</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Type product name or SKU…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
              {filteredProducts.length > 0 && (
                <div className="absolute z-20 bg-popover border rounded-lg shadow-lg w-full max-h-52 overflow-y-auto">
                  {filteredProducts.map(p => (
                    <button key={p.id} className="w-full text-left px-4 py-2.5 hover:bg-muted text-sm flex justify-between items-center" onClick={() => addProduct(p)}>
                      <span>{p.name} <span className="text-muted-foreground font-mono text-xs ml-1">{p.sku}</span></span>
                      <span className="text-muted-foreground">{fmtPKR(p.salePrice)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <ReasonSelect value={returnReason} onChange={setReturnReason} options={CUSTOMER_RETURN_REASONS} required />
          </div>
        </CardContent>
      </Card>

      {items.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardContent className="pt-4">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right w-28">Return Price</TableHead>
                  <TableHead className="text-right w-24">Qty</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {items.map((it, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{it.productName}</TableCell>
                      <TableCell className="text-right">
                        <Input type="number" min={0} value={it.price} onChange={e => updatePrice(idx, Number(e.target.value))} className="w-24 text-right h-8 ml-auto" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input type="number" min={1} value={it.quantity} onChange={e => updateQty(idx, Number(e.target.value))} className="w-20 text-right h-8 ml-auto" />
                      </TableCell>
                      <TableCell className="text-right font-medium">{fmtPKR(it.price * it.quantity)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeItem(idx)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card className="h-fit">
            <CardHeader className="pb-3"><CardTitle className="text-base">Return Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between font-bold text-base">
                <span>Total Return</span><span className="text-destructive">{fmtPKR(total)}</span>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => submitReturn.mutate()} disabled={submitReturn.isPending || !returnReason}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  {submitReturn.isPending ? "Processing…" : "Process Return"}
                </Button>
                <Button variant="outline" size="icon" onClick={() => printReturnDoc("Manual Customer Return",
                  [{ label: "Date", value: new Date().toLocaleDateString("en-PK") }, { label: "Reason", value: reasonLabel(returnReason, CUSTOMER_RETURN_REASONS) }],
                  items.map(it => ({ name: it.productName, qty: it.quantity, price: it.price })), total)}>
                  <Printer className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function SaleReturnHistory() {
  const { data = [], isFetching } = useQuery<any[]>({
    queryKey: ["sales-returns-history"],
    queryFn: () => apiFetch("/api/reports/returns?startDate=2000-01-01&endDate=2099-12-31"),
  });

  const printAll = () => {
    const rows = data.map(r => `<tr><td>${r.invoiceNumber}</td><td>${new Date(r.createdAt).toLocaleDateString("en-PK")}</td><td>${r.customerName ?? "Walk-in"}</td><td>${reasonLabel(r.returnReason, CUSTOMER_RETURN_REASONS)}</td><td style="text-align:right">${fmtPKR(r.totalAmount)}</td></tr>`).join("");
    const html = `<html><head><title>Sales Returns History</title><style>body{font-family:Arial,sans-serif;padding:24px;font-size:12px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:5px 8px}th{background:#f0f0f0}@media print{button{display:none}}</style></head><body><h2>Sales Returns History</h2><table><thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th>Reason</th><th>Value</th></tr></thead><tbody>${rows}</tbody></table><script>window.onload=function(){window.print()}<\/script></body></html>`;
    const w = window.open("", "_blank"); if (w) { w.document.write(html); w.document.close(); }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Sales Returns History</CardTitle>
        <Button variant="outline" size="sm" onClick={printAll}><Printer className="w-4 h-4 mr-2" />Print</Button>
      </CardHeader>
      <CardContent className="pt-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Return Invoice</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Items</TableHead>
            <TableHead className="text-right">Return Value</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isFetching && <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Loading…</TableCell></TableRow>}
            {data.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="font-mono text-xs">{r.invoiceNumber}</TableCell>
                <TableCell>{new Date(r.createdAt).toLocaleDateString("en-PK")}</TableCell>
                <TableCell>{r.customerName ?? "Walk-in"}</TableCell>
                <TableCell>
                  {r.returnReason
                    ? <Badge variant="secondary" className="text-xs">{reasonLabel(r.returnReason, CUSTOMER_RETURN_REASONS)}</Badge>
                    : <span className="text-muted-foreground text-xs">—</span>}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{(r.items ?? []).map((it: any) => `${it.productName} ×${it.quantity}`).join(", ")}</TableCell>
                <TableCell className="text-right font-medium text-destructive">{fmtPKR(r.totalAmount)}</TableCell>
              </TableRow>
            ))}
            {!isFetching && !data.length && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No sales returns found</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ── Purchase Returns ──────────────────────────────────────────────────────────

interface PurchaseReturnItem {
  productId: number;
  productName: string;
  quantity: number;
  costPrice: number;
  maxQty: number;
}

function PurchaseReturnByPO() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [poSearch, setPoSearch] = useState("");
  const [foundPO, setFoundPO] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [returnItems, setReturnItems] = useState<PurchaseReturnItem[]>([]);
  const [searchError, setSearchError] = useState("");
  const [notes, setNotes] = useState("");
  const [returnReason, setReturnReason] = useState("");

  const searchPO = async () => {
    if (!poSearch.trim()) return;
    setSearching(true); setSearchError(""); setFoundPO(null); setReturnItems([]);
    try {
      const purchases: any[] = await apiFetch("/api/purchases");
      const po = purchases.find(p => p.purchaseNumber.toLowerCase() === poSearch.trim().toLowerCase());
      if (!po) { setSearchError("Purchase order not found."); setSearching(false); return; }
      const detailed: any = await apiFetch(`/api/purchases/${po.id}`);
      setFoundPO(detailed);
      setReturnItems(detailed.items.map((it: any) => ({
        productId: it.productId, productName: it.productName ?? "Unknown",
        quantity: it.quantity, costPrice: Number(it.costPrice), maxQty: it.quantity,
      })));
    } catch (e: any) { setSearchError(e.message); }
    finally { setSearching(false); }
  };

  const updateQty = (idx: number, qty: number) =>
    setReturnItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: Math.min(Math.max(0, qty), it.maxQty) } : it));

  const activeItems = returnItems.filter(it => it.quantity > 0);
  const returnTotal = activeItems.reduce((s, it) => s + it.costPrice * it.quantity, 0);

  const submitReturn = useMutation({
    mutationFn: () => {
      if (!returnReason) throw new Error("Please select a return reason.");
      const items = activeItems.map(it => ({ productId: it.productId, quantity: it.quantity, costPrice: it.costPrice }));
      if (!items.length) throw new Error("Select at least one item to return.");
      return apiFetch("/api/purchases/returns", {
        method: "POST",
        body: JSON.stringify({ purchaseId: foundPO.id, supplierId: foundPO.supplierId, notes: notes || undefined, returnReason, items }),
      });
    },
    onSuccess: (data: any) => {
      toast({ title: "Return processed", description: `Return ${data.returnNumber} created.` });
      qc.invalidateQueries({ queryKey: ["purchase-returns-history"] });
      setFoundPO(null); setReturnItems([]); setPoSearch(""); setNotes(""); setReturnReason("");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-5 pb-4 space-y-4">
          <div className="flex gap-3 items-end">
            <div className="flex-1 space-y-1.5">
              <Label>Purchase Order Number</Label>
              <Input placeholder="e.g. PO-1780473324631" value={poSearch}
                onChange={e => { setPoSearch(e.target.value); setSearchError(""); }}
                onKeyDown={e => e.key === "Enter" && searchPO()} />
            </div>
            <Button onClick={searchPO} disabled={searching || !poSearch.trim()}>
              <Search className="w-4 h-4 mr-2" />{searching ? "Searching…" : "Load PO"}
            </Button>
          </div>
          {searchError && <div className="flex items-center gap-2 text-sm text-destructive"><AlertCircle className="w-4 h-4 shrink-0" />{searchError}</div>}
          {foundPO && <ReasonSelect value={returnReason} onChange={setReturnReason} options={SUPPLIER_RETURN_REASONS} required />}
        </CardContent>
      </Card>

      {foundPO && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">PO: <span className="font-mono text-primary">{foundPO.purchaseNumber}</span></CardTitle>
                <div className="flex gap-4 text-sm text-muted-foreground flex-wrap">
                  <span>Date: {new Date(foundPO.createdAt).toLocaleDateString("en-PK")}</span>
                  <span>Supplier: {foundPO.supplierName ?? "—"}</span>
                  <span>Total: {fmtPKR(foundPO.totalAmount)}</span>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Cost Price</TableHead>
                    <TableHead className="text-right">Max Qty</TableHead>
                    <TableHead className="text-right w-28">Return Qty</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {returnItems.map((it, idx) => (
                      <TableRow key={idx} className={it.quantity === 0 ? "opacity-40" : ""}>
                        <TableCell className="font-medium">{it.productName}</TableCell>
                        <TableCell className="text-right">{fmtPKR(it.costPrice)}</TableCell>
                        <TableCell className="text-right">{it.maxQty}</TableCell>
                        <TableCell className="text-right">
                          <Input type="number" min={0} max={it.maxQty} value={it.quantity}
                            onChange={e => updateQty(idx, Number(e.target.value))} className="w-20 text-right h-8" />
                        </TableCell>
                        <TableCell className="text-right font-medium">{it.quantity > 0 ? fmtPKR(it.costPrice * it.quantity) : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-4 space-y-1.5">
                  <Label>Notes (optional)</Label>
                  <Textarea placeholder="Additional notes…" value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="h-fit">
            <CardHeader className="pb-3"><CardTitle className="text-base">Return Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5 text-sm">
                {activeItems.map((it, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="text-muted-foreground">{it.productName} ×{it.quantity}</span>
                    <span>{fmtPKR(it.costPrice * it.quantity)}</span>
                  </div>
                ))}
                {!activeItems.length && <p className="text-muted-foreground text-center py-2">No items selected</p>}
              </div>
              {activeItems.length > 0 && (
                <>
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Total</span><span className="text-destructive">{fmtPKR(returnTotal)}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={() => submitReturn.mutate()} disabled={submitReturn.isPending || !returnReason}>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      {submitReturn.isPending ? "Processing…" : "Process Return"}
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => printReturnDoc("Supplier Return — " + foundPO.purchaseNumber,
                      [{ label: "PO", value: foundPO.purchaseNumber }, { label: "Supplier", value: foundPO.supplierName ?? "—" }, { label: "Reason", value: reasonLabel(returnReason, SUPPLIER_RETURN_REASONS) }],
                      activeItems.map(it => ({ name: it.productName, qty: it.quantity, price: it.costPrice })), returnTotal)}>
                      <Printer className="w-4 h-4" />
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function PurchaseReturnManual() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: products = [] } = useListProducts();
  const { data: suppliers = [] } = useListSuppliers();
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<PurchaseReturnItem[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");
  const [returnReason, setReturnReason] = useState("");

  const filteredProducts = products.filter(p => {
    if (!search) return false;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
  }).slice(0, 15);

  const addProduct = (p: any) => {
    if (items.find(it => it.productId === p.id)) return;
    setItems(prev => [...prev, { productId: p.id, productName: p.name, quantity: 1, costPrice: Number(p.costPrice), maxQty: 999 }]);
    setSearch("");
  };

  const updateQty = (idx: number, qty: number) => setItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: Math.max(1, qty) } : it));
  const updatePrice = (idx: number, price: number) => setItems(prev => prev.map((it, i) => i === idx ? { ...it, costPrice: Math.max(0, price) } : it));
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));
  const total = items.reduce((s, it) => s + it.costPrice * it.quantity, 0);

  const submitReturn = useMutation({
    mutationFn: () => {
      if (!returnReason) throw new Error("Please select a return reason.");
      if (!items.length) throw new Error("Add at least one item.");
      return apiFetch("/api/purchases/returns", {
        method: "POST",
        body: JSON.stringify({
          supplierId: supplierId ? Number(supplierId) : undefined,
          notes: notes || undefined,
          returnReason,
          items: items.map(it => ({ productId: it.productId, quantity: it.quantity, costPrice: it.costPrice })),
        }),
      });
    },
    onSuccess: (data: any) => {
      toast({ title: "Return processed", description: `Return ${data.returnNumber} created.` });
      qc.invalidateQueries({ queryKey: ["purchase-returns-history"] });
      setItems([]); setSupplierId(""); setNotes(""); setReturnReason("");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-5 pb-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5 relative">
              <Label>Search Product</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Type product name or SKU…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
              {filteredProducts.length > 0 && (
                <div className="absolute z-20 bg-popover border rounded-lg shadow-lg w-full max-h-48 overflow-y-auto">
                  {filteredProducts.map(p => (
                    <button key={p.id} className="w-full text-left px-4 py-2.5 hover:bg-muted text-sm flex justify-between" onClick={() => addProduct(p)}>
                      <span>{p.name} <span className="text-muted-foreground font-mono text-xs">{p.sku}</span></span>
                      <span className="text-muted-foreground">{fmtPKR(p.costPrice)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Supplier (optional)</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger><SelectValue placeholder="Select supplier…" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}{s.company ? ` (${s.company})` : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <ReasonSelect value={returnReason} onChange={setReturnReason} options={SUPPLIER_RETURN_REASONS} required />
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea placeholder="Additional notes…" value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
            </div>
          </div>
        </CardContent>
      </Card>

      {items.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardContent className="pt-4">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right w-28">Cost Price</TableHead>
                  <TableHead className="text-right w-24">Qty</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {items.map((it, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{it.productName}</TableCell>
                      <TableCell className="text-right">
                        <Input type="number" min={0} value={it.costPrice} onChange={e => updatePrice(idx, Number(e.target.value))} className="w-24 text-right h-8 ml-auto" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input type="number" min={1} value={it.quantity} onChange={e => updateQty(idx, Number(e.target.value))} className="w-20 text-right h-8 ml-auto" />
                      </TableCell>
                      <TableCell className="text-right font-medium">{fmtPKR(it.costPrice * it.quantity)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeItem(idx)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card className="h-fit">
            <CardHeader className="pb-3"><CardTitle className="text-base">Return Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between font-bold">
                <span>Total Return</span><span className="text-destructive">{fmtPKR(total)}</span>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => submitReturn.mutate()} disabled={submitReturn.isPending || !returnReason}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  {submitReturn.isPending ? "Processing…" : "Process Return"}
                </Button>
                <Button variant="outline" size="icon" onClick={() => printReturnDoc("Manual Supplier Return",
                  [{ label: "Date", value: new Date().toLocaleDateString("en-PK") }, { label: "Reason", value: reasonLabel(returnReason, SUPPLIER_RETURN_REASONS) }],
                  items.map(it => ({ name: it.productName, qty: it.quantity, price: it.costPrice })), total)}>
                  <Printer className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function PurchaseReturnHistory() {
  const { data = [], isFetching } = useQuery<any[]>({
    queryKey: ["purchase-returns-history"],
    queryFn: () => apiFetch("/api/purchases/returns"),
  });

  const printAll = () => {
    const rows = data.map(r => `<tr><td>${r.returnNumber}</td><td>${r.purchaseNumber ?? "Manual"}</td><td>${r.supplierName ?? "—"}</td><td>${new Date(r.createdAt).toLocaleDateString("en-PK")}</td><td>${reasonLabel(r.returnReason, SUPPLIER_RETURN_REASONS)}</td><td style="text-align:right">${fmtPKR(r.totalAmount)}</td></tr>`).join("");
    const html = `<html><head><title>Purchase Returns History</title><style>body{font-family:Arial,sans-serif;padding:24px;font-size:12px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:5px 8px}th{background:#f0f0f0}@media print{button{display:none}}</style></head><body><h2>Purchase Returns History</h2><table><thead><tr><th>Return #</th><th>PO #</th><th>Supplier</th><th>Date</th><th>Reason</th><th>Value</th></tr></thead><tbody>${rows}</tbody></table><script>window.onload=function(){window.print()}<\/script></body></html>`;
    const w = window.open("", "_blank"); if (w) { w.document.write(html); w.document.close(); }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Purchase Returns History</CardTitle>
        <Button variant="outline" size="sm" onClick={printAll}><Printer className="w-4 h-4 mr-2" />Print</Button>
      </CardHeader>
      <CardContent className="pt-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Return #</TableHead>
            <TableHead>PO #</TableHead>
            <TableHead>Supplier</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Items</TableHead>
            <TableHead className="text-right">Return Value</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isFetching && <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">Loading…</TableCell></TableRow>}
            {data.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="font-mono text-xs">{r.returnNumber}</TableCell>
                <TableCell className="font-mono text-xs">{r.purchaseNumber ?? "Manual"}</TableCell>
                <TableCell>{r.supplierName ?? "—"}</TableCell>
                <TableCell>{new Date(r.createdAt).toLocaleDateString("en-PK")}</TableCell>
                <TableCell>
                  {r.returnReason
                    ? <Badge variant="secondary" className="text-xs">{reasonLabel(r.returnReason, SUPPLIER_RETURN_REASONS)}</Badge>
                    : <span className="text-muted-foreground text-xs">—</span>}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{(r.items ?? []).map((it: any) => `${it.productName} ×${it.quantity}`).join(", ")}</TableCell>
                <TableCell className="text-right font-medium text-destructive">{fmtPKR(r.totalAmount)}</TableCell>
              </TableRow>
            ))}
            {!isFetching && !data.length && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No purchase returns found</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function Returns() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <RotateCcw className="w-7 h-7 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">Return Management</h1>
      </div>

      <Tabs defaultValue="sales">
        <TabsList>
          <TabsTrigger value="sales">Sales Returns</TabsTrigger>
          <TabsTrigger value="purchases">Purchase Returns</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="mt-5">
          <Tabs defaultValue="by-invoice">
            <TabsList className="mb-5">
              <TabsTrigger value="by-invoice">Return by Invoice</TabsTrigger>
              <TabsTrigger value="manual">Manual Return</TabsTrigger>
              <TabsTrigger value="history">Return History</TabsTrigger>
            </TabsList>
            <TabsContent value="by-invoice"><SaleReturnByInvoice /></TabsContent>
            <TabsContent value="manual"><SaleReturnManual /></TabsContent>
            <TabsContent value="history"><SaleReturnHistory /></TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="purchases" className="mt-5">
          <Tabs defaultValue="by-po">
            <TabsList className="mb-5">
              <TabsTrigger value="by-po">Return by PO</TabsTrigger>
              <TabsTrigger value="manual">Manual Return</TabsTrigger>
              <TabsTrigger value="history">Return History</TabsTrigger>
            </TabsList>
            <TabsContent value="by-po"><PurchaseReturnByPO /></TabsContent>
            <TabsContent value="manual"><PurchaseReturnManual /></TabsContent>
            <TabsContent value="history"><PurchaseReturnHistory /></TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}
