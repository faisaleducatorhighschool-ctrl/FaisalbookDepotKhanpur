import { useState } from "react";
import { useGetSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, Printer, Eye, FileText, X } from "lucide-react";
import { fmtPKR } from "@/lib/format";
import { printSaleInvoice, exportToCsv, type PrintMode } from "@/lib/print-invoice";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
async function apiFetch<T>(url: string): Promise<T> {
  const token = localStorage.getItem("erp_token") ?? "";
  const r = await fetch(`${BASE}${url}`, {
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: `HTTP ${r.status}` }));
    throw new Error(err.error ?? `HTTP ${r.status}`);
  }
  return r.json();
}

function buildQuery(params: Record<string, string>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v && v.trim()) sp.set(k, v.trim());
  const s = sp.toString();
  return s ? `?${s}` : "";
}

const fmtDate = (s: string) =>
  new Date(s).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" });

// ── Quick date-range filters ─────────────────────────────────────────────────
type QuickFilter = "today" | "yesterday" | "week" | "month" | "custom";

const localISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function quickRange(qf: QuickFilter): { startDate: string; endDate: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (qf === "today") return { startDate: localISO(today), endDate: localISO(today) };
  if (qf === "yesterday") {
    const y = new Date(today);
    y.setDate(y.getDate() - 1);
    return { startDate: localISO(y), endDate: localISO(y) };
  }
  if (qf === "week") {
    const d = new Date(today);
    const dow = (d.getDay() + 6) % 7; // Monday = 0
    d.setDate(d.getDate() - dow);
    return { startDate: localISO(d), endDate: localISO(today) };
  }
  if (qf === "month") {
    const d = new Date(today.getFullYear(), today.getMonth(), 1);
    return { startDate: localISO(d), endDate: localISO(today) };
  }
  return { startDate: "", endDate: "" };
}

const QUICK_LABELS: { key: QuickFilter; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "custom", label: "Custom" },
];

// ── Shared types ─────────────────────────────────────────────────────────────
interface InvoiceRow {
  id: number;
  kind: "sale" | "purchase";
  number: string;
  partyName: string | null;
  partyMobile: string | null;
  paymentMethod: string;
  status: string;
  isReturn: boolean;
  hasReturns: boolean;
  createdByName: string | null;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  createdAt: string;
}

function mapSale(s: any): InvoiceRow {
  return {
    id: s.id,
    kind: "sale",
    number: s.invoiceNumber,
    partyName: s.customerName ?? null,
    partyMobile: s.customerMobile ?? null,
    paymentMethod: s.paymentMethod ?? "—",
    status: s.isReturn ? "return" : s.type,
    isReturn: !!s.isReturn,
    hasReturns: !!s.hasReturns,
    createdByName: s.createdByName ?? null,
    totalAmount: s.totalAmount,
    paidAmount: s.paidAmount,
    dueAmount: s.dueAmount,
    createdAt: s.createdAt,
  };
}

function mapPurchase(p: any): InvoiceRow {
  return {
    id: p.id,
    kind: "purchase",
    number: p.purchaseNumber,
    partyName: p.supplierName ?? null,
    partyMobile: p.supplierMobile ?? null,
    paymentMethod: "—",
    status: p.status,
    isReturn: false,
    hasReturns: !!p.hasReturns,
    createdByName: p.createdByName ?? null,
    totalAmount: p.totalAmount,
    paidAmount: p.paidAmount,
    dueAmount: p.dueAmount,
    createdAt: p.createdAt,
  };
}

// Map a purchase detail into the shape printSaleInvoice expects.
function purchaseToPrintable(p: any) {
  return {
    invoiceNumber: p.purchaseNumber,
    createdAt: p.createdAt,
    customerName: p.supplierName,
    paymentMethod: "",
    type: "purchase",
    subtotal: p.totalAmount,
    discount: 0,
    tax: 0,
    totalAmount: p.totalAmount,
    paidAmount: p.paidAmount,
    dueAmount: p.dueAmount,
    items: (p.items ?? []).map((it: any) => ({
      productName: it.productName,
      quantity: it.quantity,
      price: it.costPrice,
      discount: 0,
    })),
  };
}

function statusBadge(r: InvoiceRow) {
  if (r.isReturn) return <Badge variant="destructive">{r.kind === "purchase" ? "Purchase Return" : "Sales Return"}</Badge>;
  if (r.dueAmount > 0.009) return <Badge variant="secondary">Credit</Badge>;
  return <Badge variant="outline">Paid</Badge>;
}

// ── Detail modal (read-only) ─────────────────────────────────────────────────
function DetailModal({
  detail,
  kind,
  settings,
  onClose,
}: {
  detail: any;
  kind: "sale" | "purchase";
  settings: any;
  onClose: () => void;
}) {
  const [printMode, setPrintMode] = useState<PrintMode>("a4");
  const isPurchase = kind === "purchase";
  const number = isPurchase ? detail.purchaseNumber : detail.invoiceNumber;
  const party = isPurchase ? detail.supplierName : detail.customerName;
  const partyMobile = isPurchase ? detail.supplierMobile : detail.customerMobile;
  const docLabel = isPurchase ? "PURCHASE ORDER" : "SALES INVOICE";

  const doPrint = () => {
    const printable = isPurchase ? purchaseToPrintable(detail) : detail;
    printSaleInvoice(printable, settings, printMode, docLabel);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <CardHeader className="pb-3 flex-row items-center justify-between sticky top-0 bg-card z-10 border-b">
          <CardTitle className="text-base">
            {isPurchase ? "Purchase" : "Invoice"} <span className="font-mono text-primary">{number}</span>
            {detail.isReturn && <Badge variant="destructive" className="ml-2">{isPurchase ? "Purchase Return" : "Sales Return"}</Badge>}
            {detail.hasReturns && !detail.isReturn && <Badge variant="secondary" className="ml-2">Has Returns</Badge>}
            <Badge variant="outline" className="ml-2">Read-only</Badge>
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-muted-foreground">Date: </span>{fmtDate(detail.createdAt)}</div>
            <div><span className="text-muted-foreground">{isPurchase ? "Supplier" : "Customer"}: </span>{party ?? (isPurchase ? "—" : "Walk-in")}</div>
            <div><span className="text-muted-foreground">Mobile: </span>{partyMobile ?? "—"}</div>
            {!isPurchase && <div><span className="text-muted-foreground">Payment: </span>{detail.paymentMethod}</div>}
            <div><span className="text-muted-foreground">{isPurchase ? "Status" : "Type"}: </span>{isPurchase ? detail.status : (detail.isReturn ? "Sales Return" : detail.type)}</div>
            <div><span className="text-muted-foreground">Created By: </span>{detail.createdByName ?? "—"}</div>
          </div>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">{isPurchase ? "Cost" : "Price"}</TableHead>
              {!isPurchase && <TableHead className="text-right">Returned</TableHead>}
              <TableHead className="text-right">Subtotal</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(detail.items ?? []).map((it: any, i: number) => {
                const unit = isPurchase ? Number(it.costPrice) : Number(it.price);
                return (
                  <TableRow key={i}>
                    <TableCell>{it.productName}</TableCell>
                    <TableCell className="text-right">{it.quantity}</TableCell>
                    <TableCell className="text-right">{fmtPKR(unit)}</TableCell>
                    {!isPurchase && <TableCell className="text-right text-muted-foreground">{it.returnedQuantity ?? 0}</TableCell>}
                    <TableCell className="text-right">{fmtPKR(unit * it.quantity - Number(it.discount || 0))}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="flex justify-between items-center text-sm border-t pt-3">
            <div className="space-y-0.5">
              <div><span className="text-muted-foreground">Total: </span><span className="font-semibold">{fmtPKR(detail.totalAmount)}</span></div>
              <div><span className="text-muted-foreground">Paid: </span>{fmtPKR(detail.paidAmount)}</div>
              {detail.dueAmount > 0.009 && <div className="text-destructive"><span className="text-muted-foreground">Remaining: </span>{fmtPKR(detail.dueAmount)}</div>}
            </div>
            <div className="flex items-end gap-2">
              <Select value={printMode} onValueChange={(v) => setPrintMode(v as PrintMode)}>
                <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="a4">A4 / PDF</SelectItem>
                  <SelectItem value="thermal-80">Thermal 80mm</SelectItem>
                  <SelectItem value="thermal-58">Thermal 58mm</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={doPrint}>
                <Printer className="w-4 h-4 mr-2" />Reprint
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">For a PDF, choose A4 / PDF then pick "Save as PDF" in the print dialog.</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Results table ────────────────────────────────────────────────────────────
function ResultsTable({
  rows,
  partyLabel,
  numberLabel,
  onView,
  onReprint,
}: {
  rows: InvoiceRow[];
  partyLabel: string;
  numberLabel: string;
  onView: (r: InvoiceRow) => void;
  onReprint: (r: InvoiceRow) => void;
}) {
  if (rows.length === 0)
    return <p className="text-sm text-muted-foreground py-6 text-center">No records match your filters.</p>;
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader><TableRow>
          <TableHead>{numberLabel}</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>{partyLabel}</TableHead>
          <TableHead>Mobile</TableHead>
          <TableHead>Payment</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Return Status</TableHead>
          <TableHead>By</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead className="text-right">Paid</TableHead>
          <TableHead className="text-right">Remaining</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {rows.map(r => (
            <TableRow key={`${r.kind}-${r.id}`}>
              <TableCell className="font-mono text-xs whitespace-nowrap">{r.number}</TableCell>
              <TableCell className="text-xs whitespace-nowrap">{fmtDate(r.createdAt)}</TableCell>
              <TableCell>{r.partyName ?? <span className="text-muted-foreground">{r.kind === "sale" ? "Walk-in" : "—"}</span>}</TableCell>
              <TableCell className="text-xs">{r.partyMobile ?? "—"}</TableCell>
              <TableCell className="text-xs capitalize">{r.paymentMethod}</TableCell>
              <TableCell>{statusBadge(r)}</TableCell>
              <TableCell>{r.isReturn ? <Badge variant="destructive">{r.kind === "purchase" ? "Purchase Return" : "Sales Return"}</Badge> : r.hasReturns ? <Badge variant="secondary">Returned</Badge> : <span className="text-muted-foreground text-xs">—</span>}</TableCell>
              <TableCell className="text-xs">{r.createdByName ?? "—"}</TableCell>
              <TableCell className="text-right whitespace-nowrap">{fmtPKR(r.totalAmount)}</TableCell>
              <TableCell className="text-right whitespace-nowrap">{fmtPKR(r.paidAmount)}</TableCell>
              <TableCell className="text-right whitespace-nowrap">{r.dueAmount > 0.009 ? fmtPKR(r.dueAmount) : "—"}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="View" onClick={() => onView(r)}>
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Reprint" onClick={() => onReprint(r)}>
                    <Printer className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function exportRows(rows: InvoiceRow[], partyLabel: string, filename: string) {
  if (!rows.length) return;
  exportToCsv(
    rows.map(r => ({
      Number: r.number,
      Date: fmtDate(r.createdAt),
      [partyLabel]: r.partyName ?? "",
      Mobile: r.partyMobile ?? "",
      Payment: r.paymentMethod,
      Status: r.isReturn ? (r.kind === "purchase" ? "Purchase Return" : "Sales Return") : r.status,
      Returned: r.hasReturns ? "Yes" : "No",
      CreatedBy: r.createdByName ?? "",
      Total: r.totalAmount,
      Paid: r.paidAmount,
      Remaining: r.dueAmount,
    })),
    filename,
  );
}

// ── Generic invoice tab (sales or purchases) ─────────────────────────────────
interface TabConfig {
  kind: "sale" | "purchase";
  endpoint: string;
  numberLabel: string;
  numberParam: string;
  partyLabel: string;
  nameParam: string;
  mobileParam: string;
}

const SALES_CFG: TabConfig = {
  kind: "sale", endpoint: "/api/sales", numberLabel: "Invoice #", numberParam: "invoiceNumber",
  partyLabel: "Customer", nameParam: "customerName", mobileParam: "customerMobile",
};
const PURCHASES_CFG: TabConfig = {
  kind: "purchase", endpoint: "/api/purchases", numberLabel: "PO #", numberParam: "purchaseNumber",
  partyLabel: "Supplier", nameParam: "supplierName", mobileParam: "supplierMobile",
};

function InvoiceTab({ cfg, settings }: { cfg: TabConfig; settings: any }) {
  const { toast } = useToast();
  const [number, setNumber] = useState("");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [productName, setProductName] = useState("");
  const [quick, setQuick] = useState<QuickFilter>("custom");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [detail, setDetail] = useState<any>(null);

  const mapper = cfg.kind === "sale" ? mapSale : mapPurchase;

  const runSearch = async (range?: { startDate: string; endDate: string }) => {
    setLoading(true);
    try {
      const r = range ?? { startDate, endDate };
      const qs = buildQuery({
        [cfg.numberParam]: number,
        [cfg.nameParam]: name,
        [cfg.mobileParam]: mobile,
        productName,
        startDate: r.startDate,
        endDate: r.endDate,
        limit: "1000",
      });
      const data = await apiFetch<any[]>(`${cfg.endpoint}${qs}`);
      setRows(data.map(mapper));
      setSearched(true);
    } catch (e: any) {
      toast({ title: "Search failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const applyQuick = (qf: QuickFilter) => {
    setQuick(qf);
    if (qf === "custom") return;
    const range = quickRange(qf);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
    runSearch(range);
  };

  const clearFilters = () => {
    setNumber(""); setName(""); setMobile(""); setProductName("");
    setStartDate(""); setEndDate(""); setQuick("custom");
    setRows([]); setSearched(false);
  };

  const openDetail = async (row: InvoiceRow) => {
    try {
      setDetail(await apiFetch<any>(`${cfg.endpoint}/${row.id}`));
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const reprint = async (row: InvoiceRow) => {
    try {
      const d = await apiFetch<any>(`${cfg.endpoint}/${row.id}`);
      if (cfg.kind === "purchase") printSaleInvoice(purchaseToPrintable(d), settings, "a4", "PURCHASE ORDER");
      else printSaleInvoice(d, settings, "a4");
    } catch (e: any) {
      toast({ title: "Print failed", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-5 pb-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {QUICK_LABELS.map(q => (
              <Button key={q.key} size="sm" variant={quick === q.key ? "default" : "outline"} onClick={() => applyQuick(q.key)}>
                {q.label}
              </Button>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>{cfg.numberLabel}</Label>
              <Input placeholder={cfg.kind === "sale" ? "INV-… / RET-…" : "PO-…"} value={number}
                onChange={e => setNumber(e.target.value)} onKeyDown={e => e.key === "Enter" && runSearch()} />
            </div>
            <div className="space-y-1.5">
              <Label>{cfg.partyLabel} Name</Label>
              <Input placeholder="Name" value={name}
                onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && runSearch()} />
            </div>
            <div className="space-y-1.5">
              <Label>{cfg.partyLabel} Mobile</Label>
              <Input placeholder="Phone" value={mobile}
                onChange={e => setMobile(e.target.value)} onKeyDown={e => e.key === "Enter" && runSearch()} />
            </div>
            <div className="space-y-1.5">
              <Label>Product Name</Label>
              <Input placeholder="Item in invoice" value={productName}
                onChange={e => setProductName(e.target.value)} onKeyDown={e => e.key === "Enter" && runSearch()} />
            </div>
            <div className="space-y-1.5">
              <Label>From Date</Label>
              <Input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setQuick("custom"); }} />
            </div>
            <div className="space-y-1.5">
              <Label>To Date</Label>
              <Input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setQuick("custom"); }} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => runSearch()} disabled={loading} className="flex-1 md:flex-none md:w-40">
              <Search className="w-4 h-4 mr-2" />{loading ? "Searching…" : "Search"}
            </Button>
            <Button variant="outline" onClick={clearFilters} title="Clear filters">
              <X className="w-4 h-4 mr-2" />Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {searched && (
        <Card>
          <CardHeader className="pb-3 flex-row items-center justify-between">
            <CardTitle className="text-base">{rows.length} record(s) found</CardTitle>
            <Button variant="outline" size="sm" disabled={!rows.length}
              onClick={() => exportRows(rows, cfg.partyLabel, `${cfg.kind}-invoices-${localISO(new Date())}.csv`)}>
              <FileText className="w-4 h-4 mr-2" />Export Excel/CSV
            </Button>
          </CardHeader>
          <CardContent>
            <ResultsTable rows={rows} partyLabel={cfg.partyLabel} numberLabel={cfg.numberLabel}
              onView={openDetail} onReprint={reprint} />
          </CardContent>
        </Card>
      )}

      {detail && <DetailModal detail={detail} kind={cfg.kind} settings={settings} onClose={() => setDetail(null)} />}
    </div>
  );
}

// ── Unified search (sales + purchases) ───────────────────────────────────────
function UnifiedSearch({ settings }: { settings: any }) {
  const { toast } = useToast();
  const [term, setTerm] = useState("");
  const [productName, setProductName] = useState("");
  const [quick, setQuick] = useState<QuickFilter>("custom");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [detail, setDetail] = useState<{ data: any; kind: "sale" | "purchase" } | null>(null);

  const runSearch = async (range?: { startDate: string; endDate: string }) => {
    setLoading(true);
    try {
      const r = range ?? { startDate, endDate };
      const common = { productName, startDate: r.startDate, endDate: r.endDate, limit: "1000" };
      // Term applies to multiple fields; query backend per-field then merge unique.
      const [byInv, byCust, byPo, bySup] = await Promise.all([
        apiFetch<any[]>(`/api/sales${buildQuery({ ...common, invoiceNumber: term })}`),
        term.trim() ? apiFetch<any[]>(`/api/sales${buildQuery({ ...common, customerName: term })}`) : Promise.resolve([] as any[]),
        apiFetch<any[]>(`/api/purchases${buildQuery({ ...common, purchaseNumber: term })}`),
        term.trim() ? apiFetch<any[]>(`/api/purchases${buildQuery({ ...common, supplierName: term })}`) : Promise.resolve([] as any[]),
      ]);
      const saleMap = new Map<number, InvoiceRow>();
      [...byInv, ...byCust].forEach(s => saleMap.set(s.id, mapSale(s)));
      const purMap = new Map<number, InvoiceRow>();
      [...byPo, ...bySup].forEach(p => purMap.set(p.id, mapPurchase(p)));
      const merged = [...saleMap.values(), ...purMap.values()].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setRows(merged);
      setSearched(true);
    } catch (e: any) {
      toast({ title: "Search failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const applyQuick = (qf: QuickFilter) => {
    setQuick(qf);
    if (qf === "custom") return;
    const range = quickRange(qf);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
    runSearch(range);
  };

  const clearFilters = () => {
    setTerm(""); setProductName(""); setStartDate(""); setEndDate(""); setQuick("custom");
    setRows([]); setSearched(false);
  };

  const openDetail = async (row: InvoiceRow) => {
    try {
      const ep = row.kind === "sale" ? "/api/sales" : "/api/purchases";
      setDetail({ data: await apiFetch<any>(`${ep}/${row.id}`), kind: row.kind });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const reprint = async (row: InvoiceRow) => {
    try {
      const ep = row.kind === "sale" ? "/api/sales" : "/api/purchases";
      const d = await apiFetch<any>(`${ep}/${row.id}`);
      if (row.kind === "purchase") printSaleInvoice(purchaseToPrintable(d), settings, "a4", "PURCHASE ORDER");
      else printSaleInvoice(d, settings, "a4");
    } catch (e: any) {
      toast({ title: "Print failed", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-5 pb-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {QUICK_LABELS.map(q => (
              <Button key={q.key} size="sm" variant={quick === q.key ? "default" : "outline"} onClick={() => applyQuick(q.key)}>
                {q.label}
              </Button>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Search (invoice #, PO #, customer or supplier name)</Label>
              <Input placeholder="Type a number or name…" value={term}
                onChange={e => setTerm(e.target.value)} onKeyDown={e => e.key === "Enter" && runSearch()} />
            </div>
            <div className="space-y-1.5">
              <Label>Product Name</Label>
              <Input placeholder="Item in invoice" value={productName}
                onChange={e => setProductName(e.target.value)} onKeyDown={e => e.key === "Enter" && runSearch()} />
            </div>
            <div className="space-y-1.5">
              <Label>From Date</Label>
              <Input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setQuick("custom"); }} />
            </div>
            <div className="space-y-1.5">
              <Label>To Date</Label>
              <Input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setQuick("custom"); }} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => runSearch()} disabled={loading} className="flex-1 md:flex-none md:w-40">
              <Search className="w-4 h-4 mr-2" />{loading ? "Searching…" : "Search All"}
            </Button>
            <Button variant="outline" onClick={clearFilters} title="Clear filters">
              <X className="w-4 h-4 mr-2" />Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {searched && (
        <Card>
          <CardHeader className="pb-3 flex-row items-center justify-between">
            <CardTitle className="text-base">{rows.length} record(s) found</CardTitle>
            <Button variant="outline" size="sm" disabled={!rows.length}
              onClick={() => exportRows(rows, "Party", `all-invoices-${localISO(new Date())}.csv`)}>
              <FileText className="w-4 h-4 mr-2" />Export Excel/CSV
            </Button>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No records match your search.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Number</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Party</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>By</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {rows.map(r => (
                      <TableRow key={`${r.kind}-${r.id}`}>
                        <TableCell>{r.kind === "sale" ? <Badge variant="outline">Sale</Badge> : <Badge variant="secondary">Purchase</Badge>}</TableCell>
                        <TableCell className="font-mono text-xs whitespace-nowrap">{r.number}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap">{fmtDate(r.createdAt)}</TableCell>
                        <TableCell>{r.partyName ?? <span className="text-muted-foreground">{r.kind === "sale" ? "Walk-in" : "—"}</span>}</TableCell>
                        <TableCell className="text-xs">{r.partyMobile ?? "—"}</TableCell>
                        <TableCell>{statusBadge(r)}</TableCell>
                        <TableCell className="text-xs">{r.createdByName ?? "—"}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">{fmtPKR(r.totalAmount)}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">{r.dueAmount > 0.009 ? fmtPKR(r.dueAmount) : "—"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="View" onClick={() => openDetail(r)}>
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Reprint" onClick={() => reprint(r)}>
                              <Printer className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {detail && <DetailModal detail={detail.data} kind={detail.kind} settings={settings} onClose={() => setDetail(null)} />}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function Invoices() {
  const { data: settings } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Invoice Reports</h1>
        <p className="text-sm text-muted-foreground">Search, view, reprint and export sales &amp; purchase invoices. Old invoices open read-only.</p>
      </div>
      <Tabs defaultValue="sales">
        <TabsList>
          <TabsTrigger value="sales">Sales Invoices</TabsTrigger>
          <TabsTrigger value="purchases">Purchase Invoices</TabsTrigger>
          <TabsTrigger value="unified">Unified Search</TabsTrigger>
        </TabsList>
        <TabsContent value="sales" className="mt-4">
          <InvoiceTab cfg={SALES_CFG} settings={settings} />
        </TabsContent>
        <TabsContent value="purchases" className="mt-4">
          <InvoiceTab cfg={PURCHASES_CFG} settings={settings} />
        </TabsContent>
        <TabsContent value="unified" className="mt-4">
          <UnifiedSearch settings={settings} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
