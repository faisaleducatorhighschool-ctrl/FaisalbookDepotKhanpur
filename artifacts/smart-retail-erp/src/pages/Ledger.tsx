import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useListCustomers, useListSuppliers, useGetSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Printer, Download, BookOpen, AlertCircle, HandCoins, PiggyBank, Undo2, Scale, Wallet, TrendingUp, FileText, MoreVertical, MessageCircle, Send } from "lucide-react";
import { fmtPKR } from "@/lib/format";
import { exportToCsv, ledgerRowToCsvRecord, buildBrandHeader, buildPaymentDetails, BRAND_PRINT_CSS, printLedgerTxnReceipt, exportLedgerTxnPdf, ledgerTxnReceiptText } from "@/lib/print-invoice";
import { format, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
async function apiFetch<T>(url: string): Promise<T> {
  const token = localStorage.getItem("erp_token") ?? "";
  const r = await fetch(`${BASE}${url}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}
async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const token = localStorage.getItem("erp_token") ?? "";
  const r = await fetch(`${BASE}${url}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((json as any)?.error || `HTTP ${r.status}`);
  return json as T;
}

const PAYMENT_METHODS = ["cash", "bank", "jazzcash", "easypaisa", "cheque", "card"] as const;

type TxnKind = "payment_received" | "advance_deposit" | "advance_paid" | "adjustment";
const TXN_META: Record<TxnKind, { title: string; desc: string }> = {
  payment_received: { title: "Receive Payment", desc: "Record a payment received against the customer's outstanding balance." },
  advance_deposit: { title: "Advance Received", desc: "Customer gives you an advance amount. It auto-applies to future sales." },
  advance_paid: { title: "Advance Paid", desc: "Pay an advance back to the customer from their available balance." },
  adjustment: { title: "Account Adjustment", desc: "Manually debit or credit the receivable account." },
};

type SupplierTxnKind = "payment_made" | "advance_paid" | "supplier_refund" | "adjustment";
const SUPPLIER_TXN_META: Record<SupplierTxnKind, { title: string; desc: string }> = {
  payment_made: { title: "Pay Supplier", desc: "Record a payment made to the supplier against what you owe." },
  advance_paid: { title: "Advance to Supplier", desc: "Pay an advance to the supplier. It auto-applies to future purchases." },
  supplier_refund: { title: "Refund from Supplier", desc: "Record a refund received from the supplier's advance." },
  adjustment: { title: "Adjustment", desc: "Manually debit or credit the payable account." },
};

type ToastFn = ReturnType<typeof useToast>["toast"];
async function sendWhatsappAction(kind: "statement" | "summary", entityType: "customer" | "supplier", id: number | string, toast: ToastFn) {
  try {
    const res = await apiPost<{ success?: boolean; message?: string }>(`/api/whatsapp/send-${kind}`, { entityType, id: Number(id) });
    if (res?.success === false) {
      toast({ title: "WhatsApp not sent", description: res.message || "Failed to send", variant: "destructive" });
    } else {
      toast({ title: kind === "statement" ? "Statement sent" : "Summary sent", description: res?.message });
    }
  } catch (e: any) {
    toast({ title: "Could not send", description: e?.message ?? "Unknown error", variant: "destructive" });
  }
}

// Friendly, entity-aware balance label spelling out who owes whom (no raw Dr/Cr).
// Customer: +ve "Customer Owes Business", -ve "Business Owes Customer".
// Supplier: +ve "Business Owes Supplier", -ve "Supplier Owes Business".
function balanceLabel(balance: number, entityType: string): string {
  const isCustomer = String(entityType).toLowerCase().startsWith("customer");
  if (isCustomer) return balance >= 0 ? "Customer Owes Business" : "Business Owes Customer";
  return balance >= 0 ? "Business Owes Supplier" : "Supplier Owes Business";
}

// Friendly ledger row type label. A bare "return" is shown as "Sales Return"
// (customer ledger) or "Purchase Return" (supplier ledger); everything else is
// passed through with underscores turned into spaces.
function ledgerTypeLabel(type: string, entityType: string): string {
  const t = String(type ?? "").toLowerCase();
  if (t === "return") return String(entityType).toLowerCase().startsWith("customer") ? "Sales Return" : "Purchase Return";
  return String(type ?? "").replace(/_/g, " ");
}

function printLedger(entityName: string, entityType: string, startDate: string, endDate: string, data: any, settings?: any) {
  const typeColor: Record<string, string> = { sale: "#1d4ed8", return: "#dc2626", purchase: "#1d4ed8", payment: "#16a34a" };

  const rows = (data.rows ?? []).map((r: any) => `
    <tr>
      <td>${new Date(r.date).toLocaleDateString("en-PK")}</td>
      <td>${r.reference}</td>
      <td class="capitalize">${ledgerTypeLabel(r.type, entityType)}</td>
      <td class="text-right" style="color:#dc2626">${r.debit > 0 ? "PKR " + Number(r.debit).toLocaleString("en-PK", { minimumFractionDigits: 2 }) : "—"}</td>
      <td class="text-right" style="color:#16a34a">${r.credit > 0 ? "PKR " + Number(r.credit).toLocaleString("en-PK", { minimumFractionDigits: 2 }) : "—"}</td>
      <td class="text-right" style="color:#d97706">${r.returns > 0 ? "PKR " + Number(r.returns).toLocaleString("en-PK", { minimumFractionDigits: 2 }) : "—"}</td>
      <td class="text-right" style="font-weight:600;color:${r.balance >= 0 ? "#dc2626" : "#16a34a"}">PKR ${Number(Math.abs(r.balance)).toLocaleString("en-PK", { minimumFractionDigits: 2 })} ${balanceLabel(r.balance, entityType)}</td>
    </tr>
  `).join("");

  const win = window.open("", "_blank", "width=1100,height=800");
  if (!win) { alert("Allow popups to print."); return; }
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${entityName} Ledger</title>
  <style>
    body{font-family:Arial,sans-serif;padding:12mm 15mm;color:#000;background:#fff;}
    h2{margin:0;font-size:20px;} h3{margin:4px 0 0;font-size:14px;color:#666;}
    .header{border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:14px;}
    .store-name{font-size:16px;font-weight:bold;color:#1a1a1a;}
    .meta{display:flex;justify-content:space-between;font-size:12px;color:#444;margin-bottom:14px;}
    .summary{display:flex;gap:24px;margin-bottom:14px;}
    .sum-box{border:1px solid #d1d5db;border-radius:4px;padding:8px 14px;}
    .sum-label{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:0.5px;}
    .sum-val{font-size:16px;font-weight:700;}
    table{width:100%;border-collapse:collapse;font-size:12px;}
    th{background:#f3f4f6;border:1px solid #d1d5db;padding:7px 10px;text-align:left;font-weight:600;}
    td{border:1px solid #e5e7eb;padding:6px 10px;}
    .text-right{text-align:right;}
    @media print{@page{margin:10mm;}}
    ${BRAND_PRINT_CSS}
  </style></head><body>
  ${buildBrandHeader(settings, `${entityType} Ledger`)}
  <div style="text-align:center;margin:-6px 0 14px;"><h3 style="margin:0;font-size:14px;color:#444;">${entityName}</h3></div>
  <div class="meta">
    <span>Period: <b>${startDate}</b> to <b>${endDate}</b></span>
    <span>Printed: ${new Date().toLocaleString("en-PK")}</span>
  </div>
  <div class="summary">
    <div class="sum-box"><div class="sum-label">Opening Balance</div><div class="sum-val">PKR ${Number(data.openingBalance).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</div></div>
    <div class="sum-box"><div class="sum-label">Total Debit</div><div class="sum-val" style="color:#dc2626">PKR ${Number(data.totalDebit).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</div></div>
    <div class="sum-box"><div class="sum-label">Total Credit (Payments)</div><div class="sum-val" style="color:#16a34a">PKR ${Number(data.totalCredit).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</div></div>
    <div class="sum-box"><div class="sum-label">${String(entityType).toLowerCase().startsWith("customer") ? "Sales Returns" : "Purchase Returns"}</div><div class="sum-val" style="color:#d97706">PKR ${Number(data.totalReturns ?? 0).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</div></div>
    <div class="sum-box"><div class="sum-label">Closing Balance</div><div class="sum-val" style="color:${data.closingBalance >= 0 ? "#dc2626" : "#16a34a"}">PKR ${Number(Math.abs(data.closingBalance)).toLocaleString("en-PK", { minimumFractionDigits: 2 })} ${balanceLabel(data.closingBalance, entityType)}</div></div>
  </div>
  <table>
    <thead><tr><th>Date</th><th>Reference</th><th>Type</th><th class="text-right">Debit</th><th class="text-right">Credit</th><th class="text-right">Returns</th><th class="text-right">Balance</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  ${buildPaymentDetails(settings)}
  <script>window.onload=function(){window.print()}<\/script>
  </body></html>`);
  win.document.close();
}

function LedgerTable({ data, loading, entityName, entityType, startDate, endDate }: { data: any; loading: boolean; entityName: string; entityType: string; startDate: string; endDate: string }) {
  const { data: settings } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });
  if (loading) return <p className="text-center text-muted-foreground py-12">Loading ledger…</p>;
  if (!data) return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
      <BookOpen className="w-10 h-10 opacity-40" />
      <p className="text-base">Select a {entityType.toLowerCase()} and date range, then click View Ledger</p>
    </div>
  );

  const csvExport = () => exportToCsv(
    (data.rows ?? []).map(ledgerRowToCsvRecord),
    `${entityName.toLowerCase().replace(/\s+/g, "-")}-ledger-${startDate}-${endDate}.csv`
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold">{entityName}</h2>
          <p className="text-sm text-muted-foreground">Ledger: {startDate} to {endDate}</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={csvExport}><Download className="w-3.5 h-3.5 mr-1.5" />Export CSV</Button>
          <Button variant="outline" size="sm" onClick={() => printLedger(entityName, entityType, startDate, endDate, data, settings)}><Printer className="w-3.5 h-3.5 mr-1.5" />Print / PDF</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Opening Balance", value: data.openingBalance, color: "" },
          { label: "Total Debit", value: data.totalDebit, color: "text-destructive" },
          { label: "Total Credit (Payments)", value: data.totalCredit, color: "text-green-600 dark:text-green-400" },
          { label: entityType.toLowerCase().startsWith("customer") ? "Sales Returns" : "Purchase Returns", value: data.totalReturns ?? 0, color: "text-amber-600 dark:text-amber-400" },
          { label: "Closing Balance", value: Math.abs(data.closingBalance), color: data.closingBalance >= 0 ? "text-destructive" : "text-green-600 dark:text-green-400", sub: balanceLabel(data.closingBalance, entityType) },
        ].map(item => (
          <Card key={item.label}>
            <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">{item.label}</CardTitle></CardHeader>
            <CardContent>
              <div className={cn("text-xl font-bold", item.color)}>{fmtPKR(item.value)}</div>
              {item.sub && <p className="text-xs text-muted-foreground mt-0.5">{item.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right text-destructive/80">Debit</TableHead>
                <TableHead className="text-right text-green-600/80">Credit</TableHead>
                <TableHead className="text-right text-amber-600/80">{entityType.toLowerCase().startsWith("customer") ? "Sales Return" : "Purchase Return"}</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="w-10 print:hidden"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="bg-muted/50 font-medium text-sm">
                <TableCell colSpan={6}>Opening Balance</TableCell>
                <TableCell className="text-right font-bold">{fmtPKR(data.openingBalance)}</TableCell>
                <TableCell className="print:hidden" />
              </TableRow>
              {(data.rows ?? []).map((r: any, i: number) => {
                const receipt = { reference: r.reference, date: r.date, type: ledgerTypeLabel(r.type, entityType), debit: r.debit, credit: r.credit, returns: r.returns, balance: r.balance, entityName, entityType };
                return (
                <TableRow key={i}>
                  <TableCell>{new Date(r.date).toLocaleDateString("en-PK")}</TableCell>
                  <TableCell className="font-mono text-xs">{r.reference}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize text-xs">{ledgerTypeLabel(r.type, entityType)}</Badge>
                  </TableCell>
                  <TableCell className="text-right text-destructive">{r.debit > 0 ? fmtPKR(r.debit) : "—"}</TableCell>
                  <TableCell className="text-right text-green-600 dark:text-green-400">{r.credit > 0 ? fmtPKR(r.credit) : "—"}</TableCell>
                  <TableCell className="text-right text-amber-600 dark:text-amber-400">{r.returns > 0 ? fmtPKR(r.returns) : "—"}</TableCell>
                  <TableCell className={cn("text-right font-semibold", r.balance >= 0 ? "text-destructive" : "text-green-600 dark:text-green-400")}>
                    {fmtPKR(Math.abs(r.balance))} {balanceLabel(r.balance, entityType)}
                  </TableCell>
                  <TableCell className="text-right print:hidden">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => printLedgerTxnReceipt(receipt, settings, "thermal-58")}><Printer className="w-3.5 h-3.5 mr-2" />Print 58mm</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => printLedgerTxnReceipt(receipt, settings, "thermal-80")}><Printer className="w-3.5 h-3.5 mr-2" />Print 80mm</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => printLedgerTxnReceipt(receipt, settings, "a4")}><Printer className="w-3.5 h-3.5 mr-2" />Print A4</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => exportLedgerTxnPdf(receipt, settings)}><Download className="w-3.5 h-3.5 mr-2" />Download PDF</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(ledgerTxnReceiptText(receipt, settings))}`, "_blank")}><MessageCircle className="w-3.5 h-3.5 mr-2" />WhatsApp Share</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
                );
              })}
              {(data.rows ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">No transactions in selected period</TableCell>
                </TableRow>
              )}
              <TableRow className="bg-muted/50 font-bold text-sm">
                <TableCell colSpan={3}>Closing Balance</TableCell>
                <TableCell className="text-right text-destructive">{fmtPKR(data.totalDebit)}</TableCell>
                <TableCell className="text-right text-green-600 dark:text-green-400">{fmtPKR(data.totalCredit)}</TableCell>
                <TableCell className="text-right text-amber-600 dark:text-amber-400">{fmtPKR(data.totalReturns ?? 0)}</TableCell>
                <TableCell className={cn("text-right", data.closingBalance >= 0 ? "text-destructive" : "text-green-600 dark:text-green-400")}>
                  {fmtPKR(Math.abs(data.closingBalance))} {balanceLabel(data.closingBalance, entityType)}
                </TableCell>
                <TableCell className="print:hidden" />
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function TransactionDialog({ open, onOpenChange, kind, customer, onDone }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  kind: TxnKind;
  customer: { id: number | string; name: string; availableAdvance: number };
  onDone: (txn: any) => void;
}) {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<string>("cash");
  const [bankRef, setBankRef] = useState("");
  const [direction, setDirection] = useState<"debit" | "credit">("debit");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const meta = TXN_META[kind];
  const reset = () => { setAmount(""); setMethod("cash"); setBankRef(""); setDirection("debit"); setNote(""); };

  const submit = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) { toast({ title: "Enter a valid amount", variant: "destructive" }); return; }
    if (kind === "advance_paid" && amt > customer.availableAdvance) {
      toast({ title: "Advance paid exceeds available advance", description: `Available: ${fmtPKR(customer.availableAdvance)}`, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const body: any = { txnType: kind, amount: amt, paymentMethod: method, note: note || undefined };
      if (method === "bank" || method === "cheque") body.bankRef = bankRef || undefined;
      if (kind === "adjustment") body.direction = direction;
      const txn = await apiPost<any>(`/api/customers/${customer.id}/transactions`, body);
      toast({ title: `${meta.title} recorded`, description: `${txn.referenceNo} · ${fmtPKR(txn.amount)}` });
      reset();
      onOpenChange(false);
      onDone(txn);
    } catch (e: any) {
      toast({ title: "Could not save", description: e?.message ?? "Unknown error", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{meta.title}</DialogTitle>
          <DialogDescription>{customer.name} — {meta.desc}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          {kind === "advance_paid" && (
            <div className="rounded-md bg-muted px-3 py-2 text-sm">
              Available advance: <span className="font-semibold">{fmtPKR(customer.availableAdvance)}</span>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Amount (PKR)</Label>
            <Input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" autoFocus />
          </div>
          {kind === "adjustment" && (
            <div className="space-y-1.5">
              <Label>Direction</Label>
              <Select value={direction} onValueChange={v => setDirection(v as "debit" | "credit")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="debit">Debit — increase what they owe</SelectItem>
                  <SelectItem value="credit">Credit — reduce what they owe</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Payment Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {(method === "bank" || method === "cheque") && (
            <div className="space-y-1.5">
              <Label>{method === "cheque" ? "Cheque No." : "Bank / Transaction Ref"}</Label>
              <Input value={bankRef} onChange={e => setBankRef(e.target.value)} placeholder="Optional reference" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Note</Label>
            <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Optional note" rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>{submitting ? "Saving…" : meta.title}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SupplierTransactionDialog({ open, onOpenChange, kind, supplier, onDone }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  kind: SupplierTxnKind;
  supplier: { id: number | string; name: string; availableAdvance: number };
  onDone: (txn: any) => void;
}) {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<string>("cash");
  const [bankRef, setBankRef] = useState("");
  const [direction, setDirection] = useState<"debit" | "credit">("credit");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const meta = SUPPLIER_TXN_META[kind];
  const reset = () => { setAmount(""); setMethod("cash"); setBankRef(""); setDirection("credit"); setNote(""); };

  const submit = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) { toast({ title: "Enter a valid amount", variant: "destructive" }); return; }
    if (kind === "supplier_refund" && amt > supplier.availableAdvance) {
      toast({ title: "Refund exceeds available advance", description: `Available: ${fmtPKR(supplier.availableAdvance)}`, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const body: any = { txnType: kind, amount: amt, paymentMethod: method, note: note || undefined };
      if (method === "bank" || method === "cheque") body.bankRef = bankRef || undefined;
      if (kind === "adjustment") body.direction = direction;
      const txn = await apiPost<any>(`/api/suppliers/${supplier.id}/transactions`, body);
      toast({ title: `${meta.title} recorded`, description: `${txn.referenceNo} · ${fmtPKR(txn.amount)}` });
      reset();
      onOpenChange(false);
      onDone(txn);
    } catch (e: any) {
      toast({ title: "Could not save", description: e?.message ?? "Unknown error", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{meta.title}</DialogTitle>
          <DialogDescription>{supplier.name} — {meta.desc}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          {kind === "supplier_refund" && (
            <div className="rounded-md bg-muted px-3 py-2 text-sm">
              Available advance: <span className="font-semibold">{fmtPKR(supplier.availableAdvance)}</span>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Amount (PKR)</Label>
            <Input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" autoFocus />
          </div>
          {kind === "adjustment" && (
            <div className="space-y-1.5">
              <Label>Direction</Label>
              <Select value={direction} onValueChange={v => setDirection(v as "debit" | "credit")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">Credit — increase what you owe</SelectItem>
                  <SelectItem value="debit">Debit — reduce what you owe</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Payment Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {(method === "bank" || method === "cheque") && (
            <div className="space-y-1.5">
              <Label>{method === "cheque" ? "Cheque No." : "Bank / Transaction Ref"}</Label>
              <Input value={bankRef} onChange={e => setBankRef(e.target.value)} placeholder="Optional reference" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Note</Label>
            <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Optional note" rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>{submitting ? "Saving…" : meta.title}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdvanceLedgerTable({ advance, settings }: { advance: any; settings?: any }) {
  const rows: any[] = advance?.rows ?? [];
  if (!advance) return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2"><PiggyBank className="w-4 h-4 text-primary" /> Advance / Deposit Sub-Ledger</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">In</TableHead>
              <TableHead className="text-right">Out</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="bg-muted/50 font-medium text-sm">
              <TableCell colSpan={5}>Opening Advance</TableCell>
              <TableCell className="text-right font-bold">{fmtPKR(advance.openingBalance)}</TableCell>
            </TableRow>
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell>{new Date(r.date).toLocaleDateString("en-PK")}</TableCell>
                <TableCell className="font-mono text-xs">{r.reference}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize text-xs">{String(r.type).replace(/_/g, " ")}</Badge></TableCell>
                <TableCell className="text-right text-green-600 dark:text-green-400">{r.direction === "credit" ? fmtPKR(r.amount) : "—"}</TableCell>
                <TableCell className="text-right text-destructive">{r.direction === "debit" ? fmtPKR(r.amount) : "—"}</TableCell>
                <TableCell className="text-right font-semibold">{fmtPKR(r.balance)}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No advance activity in selected period</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function PrintReceiptDialog({ open, onOpenChange, txn, entityName, entityType, settings }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  txn: any | null;
  entityName: string;
  entityType: string;
  settings: any;
}) {
  if (!txn) return null;
  const receipt = {
    reference: txn.referenceNo,
    date: txn.txnDate ?? txn.createdAt ?? new Date(),
    type: txn.txnType,
    amount: Number(txn.amount),
    entityName: txn.customerName ?? txn.supplierName ?? entityName,
    entityType,
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Print Receipt</DialogTitle>
          <DialogDescription>
            {txn.referenceNo} · {fmtPKR(txn.amount)} recorded. Choose a format to print, save, or share.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 py-1">
          <Button variant="outline" onClick={() => printLedgerTxnReceipt(receipt, settings, "thermal-58")}><Printer className="w-4 h-4 mr-2" />Thermal 58mm</Button>
          <Button variant="outline" onClick={() => printLedgerTxnReceipt(receipt, settings, "thermal-80")}><Printer className="w-4 h-4 mr-2" />Thermal 80mm</Button>
          <Button variant="outline" onClick={() => printLedgerTxnReceipt(receipt, settings, "a4")}><Printer className="w-4 h-4 mr-2" />A4 Sheet</Button>
          <Button variant="outline" onClick={() => exportLedgerTxnPdf(receipt, settings)}><Download className="w-4 h-4 mr-2" />Download PDF</Button>
          <Button variant="outline" className="col-span-2" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(ledgerTxnReceiptText(receipt, settings))}`, "_blank")}><MessageCircle className="w-4 h-4 mr-2" />WhatsApp Share</Button>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CustomerLedger() {
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 90), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedId, setSelectedId] = useState<string>("");
  const [queryId, setQueryId] = useState<string>("");
  const [queryDates, setQueryDates] = useState({ sd: "", ed: "" });
  const [dialog, setDialog] = useState<{ open: boolean; kind: TxnKind }>({ open: false, kind: "payment_received" });
  const [printTxn, setPrintTxn] = useState<any | null>(null);

  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: customers = [] } = useListCustomers({}, { query: { queryKey: ["customers-for-ledger"] } });
  const { data: settings } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });

  const { data, isFetching } = useQuery<any>({
    queryKey: ["customer-ledger", queryId, queryDates.sd, queryDates.ed],
    queryFn: () => apiFetch(`/api/ledger/customer/${queryId}?startDate=${queryDates.sd}&endDate=${queryDates.ed}`),
    enabled: !!queryId && !!queryDates.sd && !!queryDates.ed,
  });

  const selectedCustomer = customers.find(c => String(c.id) === selectedId);
  const summary = data?.summary;

  const handleView = () => {
    if (!selectedId) return;
    setQueryId(selectedId);
    setQueryDates({ sd: startDate, ed: endDate });
  };

  const openDialog = (kind: TxnKind) => setDialog({ open: true, kind });

  const handleTxnDone = (txn: any) => {
    qc.invalidateQueries({ queryKey: ["customer-ledger"] });
    qc.invalidateQueries({ queryKey: ["customers-for-ledger"] });
    setPrintTxn(txn);
  };

  const summaryCards = summary ? [
    { label: "Receivable (Owed to You)", value: summary.receivable, icon: HandCoins, color: summary.receivable > 0 ? "text-destructive" : "text-green-600 dark:text-green-400", sub: summary.receivable > 0 ? "Outstanding" : summary.receivable < 0 ? "In credit" : "Settled" },
    { label: "Available Advance", value: summary.availableAdvance, icon: PiggyBank, color: "text-blue-600 dark:text-blue-400", sub: "Auto-applies to sales" },
    { label: "Advance Refunded (Lifetime)", value: summary.advancePaidLifetime, icon: Undo2, color: "text-muted-foreground", sub: "Audit total" },
    { label: "Net Position", value: Math.abs(summary.net), icon: Scale, color: summary.net > 0 ? "text-destructive" : "text-green-600 dark:text-green-400", sub: summary.net > 0 ? "Net owed to you" : summary.net < 0 ? "Net in their favour" : "Balanced" },
  ] : [];

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-end gap-4 flex-wrap">
            <div className="space-y-1.5">
              <Label>From Date</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1.5">
              <Label>To Date</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1.5 flex-1 min-w-52">
              <Label>Select Customer</Label>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger><SelectValue placeholder="Choose a customer…" /></SelectTrigger>
                <SelectContent>
                  {customers.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name} — {c.phone}
                      {Number(c.balance) > 0 && <span className="ml-2 text-destructive text-xs">({fmtPKR(c.balance)} due)</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleView} disabled={!selectedId || isFetching}>
              <BookOpen className="w-4 h-4 mr-2" />
              {isFetching ? "Loading…" : "View Ledger"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {selectedCustomer && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex gap-4 flex-wrap text-sm items-center">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className="font-medium text-foreground">{selectedCustomer.name}</span>
              {selectedCustomer.phone && <span>· {selectedCustomer.phone}</span>}
              {selectedCustomer.email && <span>· {selectedCustomer.email}</span>}
            </div>
            {Number(selectedCustomer.balance) > 0 && (
              <Badge variant="destructive" className="text-xs">
                <AlertCircle className="w-3 h-3 mr-1" />
                Balance Due: {fmtPKR(selectedCustomer.balance)}
              </Badge>
            )}
          </div>
          <div className="flex gap-2 flex-wrap print:hidden">
            <Button size="sm" onClick={() => openDialog("payment_received")}><HandCoins className="w-3.5 h-3.5 mr-1.5" />Receive Payment</Button>
            <Button size="sm" variant="outline" onClick={() => openDialog("advance_deposit")}><PiggyBank className="w-3.5 h-3.5 mr-1.5" />Advance Received</Button>
            <Button size="sm" variant="outline" onClick={() => openDialog("advance_paid")}><Undo2 className="w-3.5 h-3.5 mr-1.5" />Advance Paid</Button>
            <Button size="sm" variant="outline" onClick={() => openDialog("adjustment")}><Scale className="w-3.5 h-3.5 mr-1.5" />Adjustment</Button>
            <Button size="sm" variant="outline" onClick={() => sendWhatsappAction("statement", "customer", selectedCustomer.id, toast)}><MessageCircle className="w-3.5 h-3.5 mr-1.5" />Send Statement</Button>
            <Button size="sm" variant="outline" onClick={() => sendWhatsappAction("summary", "customer", selectedCustomer.id, toast)}><Send className="w-3.5 h-3.5 mr-1.5" />Send Summary</Button>
          </div>
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {summaryCards.map(c => (
            <Card key={c.label}>
              <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5"><c.icon className="w-3.5 h-3.5" />{c.label}</CardTitle></CardHeader>
              <CardContent>
                <div className={cn("text-xl font-bold", c.color)}>{fmtPKR(c.value)}</div>
                <p className="text-xs text-muted-foreground mt-0.5">{c.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <LedgerTable
        data={queryId ? data : null}
        loading={isFetching}
        entityName={data?.customer?.name ?? selectedCustomer?.name ?? "Customer"}
        entityType="Customer"
        startDate={queryDates.sd || startDate}
        endDate={queryDates.ed || endDate}
      />

      {queryId && data && <AdvanceLedgerTable advance={data.advance} settings={settings} />}

      {selectedCustomer && (
        <TransactionDialog
          open={dialog.open}
          onOpenChange={(v) => setDialog(d => ({ ...d, open: v }))}
          kind={dialog.kind}
          customer={{ id: selectedCustomer.id, name: selectedCustomer.name, availableAdvance: summary?.availableAdvance ?? Number((selectedCustomer as any).advanceBalance ?? 0) }}
          onDone={handleTxnDone}
        />
      )}

      <PrintReceiptDialog
        open={!!printTxn}
        onOpenChange={(v) => { if (!v) setPrintTxn(null); }}
        txn={printTxn}
        entityName={selectedCustomer?.name ?? "Customer"}
        entityType="Customer"
        settings={settings}
      />
    </div>
  );
}

function SupplierLedger() {
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 90), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedId, setSelectedId] = useState<string>("");
  const [queryId, setQueryId] = useState<string>("");
  const [queryDates, setQueryDates] = useState({ sd: "", ed: "" });
  const [dialog, setDialog] = useState<{ open: boolean; kind: SupplierTxnKind }>({ open: false, kind: "payment_made" });
  const [printTxn, setPrintTxn] = useState<any | null>(null);

  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: suppliers = [] } = useListSuppliers({ query: { queryKey: ["suppliers-for-ledger"] } });
  const { data: settings } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });

  const { data, isFetching } = useQuery<any>({
    queryKey: ["supplier-ledger", queryId, queryDates.sd, queryDates.ed],
    queryFn: () => apiFetch(`/api/ledger/supplier/${queryId}?startDate=${queryDates.sd}&endDate=${queryDates.ed}`),
    enabled: !!queryId && !!queryDates.sd && !!queryDates.ed,
  });

  const selectedSupplier = suppliers.find(s => String(s.id) === selectedId);
  const summary = data?.summary;

  const handleView = () => {
    if (!selectedId) return;
    setQueryId(selectedId);
    setQueryDates({ sd: startDate, ed: endDate });
  };

  const openDialog = (kind: SupplierTxnKind) => setDialog({ open: true, kind });

  const handleTxnDone = (txn: any) => {
    qc.invalidateQueries({ queryKey: ["supplier-ledger"] });
    qc.invalidateQueries({ queryKey: ["suppliers-for-ledger"] });
    setPrintTxn(txn);
  };

  const summaryCards = summary ? [
    { label: "Payable (You Owe)", value: summary.payable, icon: HandCoins, color: summary.payable > 0 ? "text-destructive" : "text-green-600 dark:text-green-400", sub: summary.payable > 0 ? "Outstanding" : summary.payable < 0 ? "In credit" : "Settled" },
    { label: "Available Advance", value: summary.availableAdvance, icon: PiggyBank, color: "text-blue-600 dark:text-blue-400", sub: "Auto-applies to purchases" },
    { label: "Advance Used (Lifetime)", value: summary.advancePaidLifetime, icon: Undo2, color: "text-muted-foreground", sub: "Audit total" },
    { label: "Net Position", value: Math.abs(summary.net), icon: Scale, color: summary.net > 0 ? "text-destructive" : "text-green-600 dark:text-green-400", sub: summary.net > 0 ? "Net you owe" : summary.net < 0 ? "Net in your favour" : "Balanced" },
  ] : [];

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-end gap-4 flex-wrap">
            <div className="space-y-1.5">
              <Label>From Date</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1.5">
              <Label>To Date</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1.5 flex-1 min-w-52">
              <Label>Select Supplier</Label>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger><SelectValue placeholder="Choose a supplier…" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}{s.company ? ` (${s.company})` : ""}
                      {Number(s.balance) > 0 && <span className="ml-2 text-destructive text-xs">({fmtPKR(s.balance)} due)</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleView} disabled={!selectedId || isFetching}>
              <BookOpen className="w-4 h-4 mr-2" />
              {isFetching ? "Loading…" : "View Ledger"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {selectedSupplier && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex gap-4 flex-wrap text-sm items-center">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className="font-medium text-foreground">{selectedSupplier.name}</span>
              {selectedSupplier.company && <span>· {selectedSupplier.company}</span>}
              {selectedSupplier.phone && <span>· {selectedSupplier.phone}</span>}
            </div>
            {Number(selectedSupplier.balance) > 0 && (
              <Badge variant="destructive" className="text-xs">
                <AlertCircle className="w-3 h-3 mr-1" />
                Balance Due: {fmtPKR(selectedSupplier.balance)}
              </Badge>
            )}
          </div>
          <div className="flex gap-2 flex-wrap print:hidden">
            <Button size="sm" onClick={() => openDialog("payment_made")}><HandCoins className="w-3.5 h-3.5 mr-1.5" />Pay Supplier</Button>
            <Button size="sm" variant="outline" onClick={() => openDialog("advance_paid")}><PiggyBank className="w-3.5 h-3.5 mr-1.5" />Advance to Supplier</Button>
            <Button size="sm" variant="outline" onClick={() => openDialog("supplier_refund")}><Undo2 className="w-3.5 h-3.5 mr-1.5" />Refund from Supplier</Button>
            <Button size="sm" variant="outline" onClick={() => openDialog("adjustment")}><Scale className="w-3.5 h-3.5 mr-1.5" />Adjustment</Button>
            <Button size="sm" variant="outline" onClick={() => sendWhatsappAction("statement", "supplier", selectedSupplier.id, toast)}><MessageCircle className="w-3.5 h-3.5 mr-1.5" />Send Statement</Button>
            <Button size="sm" variant="outline" onClick={() => sendWhatsappAction("summary", "supplier", selectedSupplier.id, toast)}><Send className="w-3.5 h-3.5 mr-1.5" />Send Summary</Button>
          </div>
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {summaryCards.map(c => (
            <Card key={c.label}>
              <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5"><c.icon className="w-3.5 h-3.5" />{c.label}</CardTitle></CardHeader>
              <CardContent>
                <div className={cn("text-xl font-bold", c.color)}>{fmtPKR(c.value)}</div>
                <p className="text-xs text-muted-foreground mt-0.5">{c.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <LedgerTable
        data={queryId ? data : null}
        loading={isFetching}
        entityName={data?.supplier?.name ?? selectedSupplier?.name ?? "Supplier"}
        entityType="Supplier"
        startDate={queryDates.sd || startDate}
        endDate={queryDates.ed || endDate}
      />

      {queryId && data && <AdvanceLedgerTable advance={data.advance} settings={settings} />}

      {selectedSupplier && (
        <SupplierTransactionDialog
          open={dialog.open}
          onOpenChange={(v) => setDialog(d => ({ ...d, open: v }))}
          kind={dialog.kind}
          supplier={{ id: selectedSupplier.id, name: selectedSupplier.name, availableAdvance: summary?.availableAdvance ?? Number((selectedSupplier as any).advanceBalance ?? 0) }}
          onDone={handleTxnDone}
        />
      )}

      <PrintReceiptDialog
        open={!!printTxn}
        onOpenChange={(v) => { if (!v) setPrintTxn(null); }}
        txn={printTxn}
        entityName={selectedSupplier?.name ?? "Supplier"}
        entityType="Supplier"
        settings={settings}
      />
    </div>
  );
}

const CUSTOMER_REPORTS = [
  { key: "customer-transactions", label: "Transactions", icon: FileText, desc: "All account transactions in the period." },
  { key: "customer-collections", label: "Collections", icon: HandCoins, desc: "Payments & advances received, grouped by method." },
  { key: "customer-advances", label: "Advances", icon: PiggyBank, desc: "Customers holding an available advance." },
  { key: "customer-outstanding", label: "Outstanding", icon: Wallet, desc: "Receivable, advance and net per customer." },
  { key: "customer-aging", label: "Aging", icon: TrendingUp, desc: "Outstanding receivable bucketed by age." },
] as const;

type ReportKey = typeof CUSTOMER_REPORTS[number]["key"];

function fmtDate(d: any) { return d ? new Date(d).toLocaleDateString("en-PK") : "—"; }

function ReportTable({ reportKey, data }: { reportKey: ReportKey; data: any }) {
  if (reportKey === "customer-transactions") {
    const rows: any[] = data.rows ?? [];
    return (
      <Table>
        <TableHeader><TableRow>
          <TableHead>Date</TableHead><TableHead>Reference</TableHead><TableHead>Customer</TableHead>
          <TableHead>Type</TableHead><TableHead>Account</TableHead><TableHead>Method</TableHead><TableHead className="text-right">Amount</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}>
              <TableCell>{fmtDate(r.txnDate ?? r.date)}</TableCell>
              <TableCell className="font-mono text-xs">{r.referenceNo ?? r.reference}</TableCell>
              <TableCell>{r.customerName}</TableCell>
              <TableCell><Badge variant="outline" className="capitalize text-xs">{String(r.txnType ?? r.type).replace(/_/g, " ")}</Badge></TableCell>
              <TableCell className="capitalize">{r.account}</TableCell>
              <TableCell className="capitalize">{r.paymentMethod ?? r.method ?? "—"}</TableCell>
              <TableCell className="text-right font-semibold">{fmtPKR(r.amount)}</TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>}
        </TableBody>
      </Table>
    );
  }
  if (reportKey === "customer-collections") {
    const rows: any[] = data.byMethod ?? [];
    return (
      <Table>
        <TableHeader><TableRow><TableHead>Payment Method</TableHead><TableHead className="text-right">Amount Collected</TableHead></TableRow></TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}><TableCell className="capitalize">{r.method}</TableCell><TableCell className="text-right font-semibold">{fmtPKR(r.amount)}</TableCell></TableRow>
          ))}
          {rows.length === 0 && <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-8">No collections</TableCell></TableRow>}
        </TableBody>
      </Table>
    );
  }
  if (reportKey === "customer-advances") {
    const rows: any[] = data.rows ?? [];
    return (
      <Table>
        <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Phone</TableHead><TableHead className="text-right">Available Advance</TableHead></TableRow></TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}><TableCell>{r.customerName ?? r.name}</TableCell><TableCell>{r.phone ?? "—"}</TableCell><TableCell className="text-right font-semibold text-blue-600 dark:text-blue-400">{fmtPKR(r.advanceBalance ?? r.advance)}</TableCell></TableRow>
          ))}
          {rows.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No advances held</TableCell></TableRow>}
        </TableBody>
      </Table>
    );
  }
  if (reportKey === "customer-outstanding") {
    const rows: any[] = data.rows ?? [];
    return (
      <Table>
        <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Phone</TableHead><TableHead className="text-right">Receivable</TableHead><TableHead className="text-right">Advance</TableHead><TableHead className="text-right">Net</TableHead></TableRow></TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}>
              <TableCell>{r.customerName ?? r.name}</TableCell>
              <TableCell>{r.phone ?? "—"}</TableCell>
              <TableCell className="text-right">{fmtPKR(r.receivable)}</TableCell>
              <TableCell className="text-right text-blue-600 dark:text-blue-400">{fmtPKR(r.advance)}</TableCell>
              <TableCell className={cn("text-right font-semibold", Number(r.net) > 0 ? "text-destructive" : "text-green-600 dark:text-green-400")}>{fmtPKR(Math.abs(Number(r.net)))} {balanceLabel(Number(r.net), "customer")}</TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nothing outstanding</TableCell></TableRow>}
        </TableBody>
      </Table>
    );
  }
  // aging
  const rows: any[] = data.rows ?? [];
  return (
    <Table>
      <TableHeader><TableRow>
        <TableHead>Customer</TableHead><TableHead className="text-right">Current</TableHead><TableHead className="text-right">1–30d</TableHead>
        <TableHead className="text-right">31–60d</TableHead><TableHead className="text-right">61–90d</TableHead><TableHead className="text-right">90d+</TableHead><TableHead className="text-right">Total</TableHead>
      </TableRow></TableHeader>
      <TableBody>
        {rows.map((r, i) => (
          <TableRow key={i}>
            <TableCell>{r.customerName ?? r.name}</TableCell>
            <TableCell className="text-right">{fmtPKR(r.current)}</TableCell>
            <TableCell className="text-right">{fmtPKR(r.days30)}</TableCell>
            <TableCell className="text-right">{fmtPKR(r.days60)}</TableCell>
            <TableCell className="text-right">{fmtPKR(r.days90)}</TableCell>
            <TableCell className="text-right text-destructive">{fmtPKR(r.days90plus)}</TableCell>
            <TableCell className="text-right font-semibold">{fmtPKR(r.total)}</TableCell>
          </TableRow>
        ))}
        {rows.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No outstanding receivables</TableCell></TableRow>}
      </TableBody>
    </Table>
  );
}

function CustomerReports() {
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 90), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [reportKey, setReportKey] = useState<ReportKey>("customer-transactions");
  const [query, setQuery] = useState<{ key: ReportKey; sd: string; ed: string } | null>(null);

  const meta = CUSTOMER_REPORTS.find(r => r.key === reportKey)!;
  const dateScoped = reportKey === "customer-transactions" || reportKey === "customer-collections";

  const { data, isFetching } = useQuery<any>({
    queryKey: ["customer-report", query?.key, query?.sd, query?.ed],
    queryFn: () => apiFetch(`/api/reports/${query!.key}?startDate=${query!.sd}&endDate=${query!.ed}`),
    enabled: !!query,
  });

  const run = () => setQuery({ key: reportKey, sd: startDate, ed: endDate });

  const csvExport = () => {
    const rows: any[] = reportKey === "customer-collections" ? (data?.byMethod ?? []) : (data?.rows ?? []);
    if (!rows.length) return;
    exportToCsv(rows, `${reportKey}-${startDate}-${endDate}.csv`);
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-end gap-4 flex-wrap">
            <div className="space-y-1.5 flex-1 min-w-52">
              <Label>Report</Label>
              <Select value={reportKey} onValueChange={v => setReportKey(v as ReportKey)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CUSTOMER_REPORTS.map(r => <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>From Date</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-40" disabled={!dateScoped} />
            </div>
            <div className="space-y-1.5">
              <Label>To Date</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-40" disabled={!dateScoped} />
            </div>
            <Button onClick={run} disabled={isFetching}><FileText className="w-4 h-4 mr-2" />{isFetching ? "Loading…" : "Run Report"}</Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">{meta.desc}{!dateScoped && " (date range not applicable)"}</p>
        </CardContent>
      </Card>

      {!query ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <FileText className="w-10 h-10 opacity-40" />
          <p className="text-base">Choose a report and click Run Report</p>
        </div>
      ) : isFetching ? (
        <p className="text-center text-muted-foreground py-12">Loading report…</p>
      ) : (
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><meta.icon className="w-4 h-4 text-primary" />{meta.label}</CardTitle>
            <Button variant="outline" size="sm" onClick={csvExport} className="print:hidden"><Download className="w-3.5 h-3.5 mr-1.5" />Export CSV</Button>
          </CardHeader>
          <CardContent className="pt-2">
            {data && <ReportTable reportKey={query.key} data={data} />}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function Ledger() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <BookOpen className="w-7 h-7 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">Ledger</h1>
      </div>

      <Tabs defaultValue="customer">
        <TabsList>
          <TabsTrigger value="customer">Customer Ledger</TabsTrigger>
          <TabsTrigger value="supplier">Supplier Ledger</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="customer" className="mt-5">
          <CustomerLedger />
        </TabsContent>

        <TabsContent value="supplier" className="mt-5">
          <SupplierLedger />
        </TabsContent>

        <TabsContent value="reports" className="mt-5">
          <CustomerReports />
        </TabsContent>
      </Tabs>
    </div>
  );
}
