import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  useGetSalesReport, useGetInventoryReport, useGetProfitLossReport,
  useListSales, useListPurchases, useGetSettings,
  getGetSalesReportQueryKey, getGetProfitLossReportQueryKey, getGetSettingsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { fmtPKR, fmt } from "@/lib/format";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, subDays } from "date-fns";
import { exportToCsv, buildBrandHeader, buildPaymentDetails, BRAND_PRINT_CSS } from "@/lib/print-invoice";
import { Download, Printer, TrendingUp, ShoppingBag, Boxes, DollarSign, ChevronDown, ChevronRight, FileSpreadsheet, PackageX, AlertTriangle, RotateCcw, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
async function apiFetch<T>(url: string): Promise<T> {
  const token = localStorage.getItem("erp_token") ?? "";
  const r = await fetch(`${BASE}${url}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

let reportSettings: any = null;

function printReport(title: string, tableHtml: string) {
  const win = window.open("", "_blank", "width=1100,height=800");
  if (!win) { alert("Allow popups to print reports."); return; }
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title>
  <style>
    body{font-family:Arial,sans-serif;padding:15mm 20mm;color:#000;background:#fff;}
    h2{margin-bottom:12px;font-size:18px;} .subtitle{font-size:12px;color:#666;margin-bottom:16px;}
    table{width:100%;border-collapse:collapse;font-size:12px;}
    th{background:#f3f4f6;border:1px solid #d1d5db;padding:7px 10px;text-align:left;font-weight:600;}
    td{border:1px solid #e5e7eb;padding:6px 10px;}
    .text-right{text-align:right;} .text-center{text-align:center;}
    .kpi{display:inline-block;border:1px solid #e5e7eb;border-radius:6px;padding:10px 18px;margin:0 8px 12px 0;min-width:140px;}
    .kpi-label{font-size:11px;color:#666;} .kpi-value{font-size:20px;font-weight:700;}
    @media print{@page{margin:10mm 15mm;}}
    ${BRAND_PRINT_CSS}
  </style></head><body>
  ${buildBrandHeader(reportSettings, title)}
  <div class="subtitle">Printed: ${new Date().toLocaleString("en-PK")}</div>
  ${tableHtml}
  ${buildPaymentDetails(reportSettings)}
  <script>window.onload=function(){window.print()}<\/script>
  </body></html>`);
  win.document.close();
}

const REPORT_GROUPS = [
  {
    id: "sales", label: "Sales Reports", icon: TrendingUp,
    items: [
      { id: "date-wise", label: "Date-wise Sales" },
      { id: "product-wise", label: "Product-wise Sales" },
      { id: "customer-wise", label: "Customer-wise Sales" },
      { id: "counter", label: "Counter Sales" },
      { id: "cash-sales", label: "Cash Sales" },
      { id: "credit-sales", label: "Credit Sales" },
      { id: "sales-returns", label: "Sales Returns" },
      { id: "discounts", label: "Discount Report" },
    ],
  },
  {
    id: "purchases", label: "Purchase Reports", icon: ShoppingBag,
    items: [
      { id: "date-wise-purchase", label: "Date-wise Purchases" },
      { id: "supplier-wise", label: "Supplier-wise" },
      { id: "product-wise-purchase", label: "Product-wise" },
      { id: "supplier-ledger", label: "Supplier Ledger" },
      { id: "supplier-payments", label: "Supplier Payments / Recovery" },
    ],
  },
  {
    id: "inventory", label: "Inventory Reports", icon: Boxes,
    items: [
      { id: "stock", label: "Stock Report" },
      { id: "low-stock", label: "Low Stock Report" },
      { id: "stock-movements", label: "Stock Movements" },
    ],
  },
  {
    id: "financial", label: "Financial Reports", icon: DollarSign,
    items: [
      { id: "pl", label: "Profit & Loss" },
      { id: "receivables", label: "Receivables" },
      { id: "payables", label: "Payables" },
      { id: "supplier-outstanding", label: "Outstanding Payable" },
      { id: "supplier-advances", label: "Supplier Advance Balance" },
      { id: "expenses", label: "Expense Report" },
      { id: "salary", label: "Salary Report" },
      { id: "cash-handling", label: "Cash Handling" },
      { id: "business-analysis", label: "Business Analysis" },
    ],
  },
  {
    id: "expiry-returns", label: "Expiry & Returns", icon: PackageX,
    items: [
      { id: "expiry-products", label: "Expiry Report" },
      { id: "return-reasons", label: "Return Reasons" },
    ],
  },
  {
    id: "communication", label: "Communication", icon: MessageSquare,
    items: [
      { id: "whatsapp-notifications", label: "WhatsApp Notifications" },
      { id: "message-delivery", label: "Message Delivery" },
    ],
  },
];

function DateFilter({ sd, ed, setSd, setEd, children }: { sd: string; ed: string; setSd: (v: string) => void; setEd: (v: string) => void; children?: React.ReactNode }) {
  return (
    <Card className="print:hidden">
      <CardContent className="pt-4 pb-4 flex items-end gap-4 flex-wrap">
        <div className="space-y-1.5">
          <Label>From Date</Label>
          <Input type="date" value={sd} onChange={e => setSd(e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1.5">
          <Label>To Date</Label>
          <Input type="date" value={ed} onChange={e => setEd(e.target.value)} className="w-40" />
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">{label}</CardTitle></CardHeader>
      <CardContent><div className="text-2xl font-bold">{value}</div>{sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}</CardContent>
    </Card>
  );
}

function ExportRow({ onCsv, onPrint }: { onCsv: () => void; onPrint: () => void }) {
  return (
    <div className="flex gap-2 flex-wrap print:hidden">
      <Button variant="outline" size="sm" onClick={onCsv}><Download className="w-3.5 h-3.5 mr-1.5" />Export CSV</Button>
      <Button variant="outline" size="sm" onClick={onPrint}><Printer className="w-3.5 h-3.5 mr-1.5" />Print / PDF</Button>
    </div>
  );
}

// ── Individual Report Panels ────────────────────────────────────────────────

function DateWiseSales({ sd, ed, setSd, setEd }: { sd: string; ed: string; setSd: (v: string) => void; setEd: (v: string) => void }) {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const { data } = useGetSalesReport(
    { startDate: sd, endDate: ed, period },
    { query: { queryKey: getGetSalesReportQueryKey({ startDate: sd, endDate: ed, period }) } }
  );
  const csvExport = () => exportToCsv((data?.data ?? []).map(r => ({ Date: r.date, Orders: r.orders, Revenue: r.revenue })), `date-wise-sales-${sd}-${ed}.csv`);
  const printIt = () => {
    const rows = (data?.data ?? []).map(r => `<tr><td>${r.date}</td><td class="text-right">${r.orders}</td><td class="text-right">PKR ${Number(r.revenue).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</td></tr>`).join("");
    printReport(`Date-wise Sales: ${sd} to ${ed}`, `
      <div><span class="kpi"><div class="kpi-label">Total Revenue</div><div class="kpi-value">PKR ${Number(data?.totalRevenue ?? 0).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</div></span><span class="kpi"><div class="kpi-label">Total Orders</div><div class="kpi-value">${data?.totalOrders ?? 0}</div></span></div>
      <table><thead><tr><th>Date</th><th class="text-right">Orders</th><th class="text-right">Revenue</th></tr></thead><tbody>${rows}</tbody></table>`);
  };
  return (
    <div className="space-y-4">
      <DateFilter sd={sd} ed={ed} setSd={setSd} setEd={setEd}>
        <div className="space-y-1.5">
          <Label>Group By</Label>
          <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </DateFilter>
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Gross Sales" value={fmtPKR(data?.grossSales ?? data?.totalRevenue)} />
          <KpiCard label="Sales Returns" value={fmtPKR(data?.salesReturns ?? 0)} />
          <KpiCard label="Net Sales (Revenue)" value={fmtPKR(data?.netSales ?? data?.totalRevenue)} />
          <KpiCard label="Total Orders" value={fmt(data?.totalOrders)} />
        </div>
        <ExportRow onCsv={csvExport} onPrint={printIt} />
      </div>
      {data?.data && data.data.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Revenue Trend</CardTitle></CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={v => { try { return format(new Date(v), "MMM dd"); } catch { return v; } }} />
                  <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(val) => fmtPKR(val as number)} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Orders</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data?.data.map((r, i) => (
                <TableRow key={i}>
                  <TableCell>{r.date}</TableCell>
                  <TableCell className="text-right">{r.orders}</TableCell>
                  <TableCell className="text-right font-medium">{fmtPKR(r.revenue)}</TableCell>
                </TableRow>
              ))}
              {!data?.data.length && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No data for selected period</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function ProductWiseSales({ sd, ed, setSd, setEd }: { sd: string; ed: string; setSd: (v: string) => void; setEd: (v: string) => void }) {
  const { data = [], isFetching } = useQuery<any[]>({
    queryKey: ["product-sales", sd, ed],
    queryFn: () => apiFetch(`/api/reports/product-sales?startDate=${sd}&endDate=${ed}`),
  });
  const soldQty = (r: any) => Number(r.soldQty ?? r.totalQty ?? 0);
  const returnedQty = (r: any) => Number(r.returnedQty ?? 0);
  const netQty = (r: any) => Number(r.netQty ?? (soldQty(r) - returnedQty(r)));
  const grossRevenue = (r: any) => Number(r.grossRevenue ?? r.soldRevenue ?? r.totalRevenue ?? 0);
  const returnValue = (r: any) => Number(r.returnValue ?? r.returnedRevenue ?? 0);
  const netRevenue = (r: any) => Number(r.netRevenue ?? (grossRevenue(r) - returnValue(r)));
  const grossProfit = (r: any) => Number(r.grossProfit ?? 0);
  const returnCost = (r: any) => Number(r.returnCost ?? 0);
  const netProfit = (r: any) => Number(r.netProfit ?? (grossProfit(r) - returnCost(r)));
  const csvExport = () => exportToCsv(data.map(r => ({ Product: r.productName, SKU: r.sku, "Sold Qty": soldQty(r), "Returned Qty": returnedQty(r), "Net Qty": netQty(r), "Gross Revenue": grossRevenue(r), "Return Value": returnValue(r), "Net Revenue": netRevenue(r), "Gross Profit": grossProfit(r), "Return Cost": returnCost(r), "Net Profit": netProfit(r) })), `product-sales-${sd}-${ed}.csv`);
  const printIt = () => {
    const cur = (n: number) => `PKR ${Number(n).toLocaleString("en-PK", { minimumFractionDigits: 2 })}`;
    const rows = data.map(r => `<tr><td>${r.productName}</td><td>${r.sku}</td><td class="text-right">${soldQty(r)}</td><td class="text-right">${returnedQty(r)}</td><td class="text-right">${netQty(r)}</td><td class="text-right">${cur(grossRevenue(r))}</td><td class="text-right">${cur(returnValue(r))}</td><td class="text-right">${cur(netRevenue(r))}</td><td class="text-right">${cur(grossProfit(r))}</td><td class="text-right">${cur(returnCost(r))}</td><td class="text-right">${cur(netProfit(r))}</td></tr>`).join("");
    printReport(`Product-wise Sales: ${sd} to ${ed}`, `<table><thead><tr><th>Product</th><th>SKU</th><th class="text-right">Sold Qty</th><th class="text-right">Returned Qty</th><th class="text-right">Net Qty</th><th class="text-right">Gross Revenue</th><th class="text-right">Return Value</th><th class="text-right">Net Revenue</th><th class="text-right">Gross Profit</th><th class="text-right">Return Cost</th><th class="text-right">Net Profit</th></tr></thead><tbody>${rows}</tbody></table>`);
  };
  return (
    <div className="space-y-4">
      <DateFilter sd={sd} ed={ed} setSd={setSd} setEd={setEd} />
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <KpiCard label="Products" value={fmt(data.length)} />
          <KpiCard label="Net Revenue" value={fmtPKR(data.reduce((s, r) => s + netRevenue(r), 0))} />
          <KpiCard label="Return Value" value={fmtPKR(data.reduce((s, r) => s + returnValue(r), 0))} />
          <KpiCard label="Net Profit" value={fmtPKR(data.reduce((s, r) => s + netProfit(r), 0))} />
        </div>
        <ExportRow onCsv={csvExport} onPrint={printIt} />
      </div>
      <Card>
        <CardContent className="pt-4 overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Sold Qty</TableHead>
              <TableHead className="text-right">Returned Qty</TableHead>
              <TableHead className="text-right">Net Qty</TableHead>
              <TableHead className="text-right">Gross Revenue</TableHead>
              <TableHead className="text-right">Return Value</TableHead>
              <TableHead className="text-right">Net Revenue</TableHead>
              <TableHead className="text-right">Gross Profit</TableHead>
              <TableHead className="text-right">Return Cost</TableHead>
              <TableHead className="text-right">Net Profit</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isFetching && <TableRow><TableCell colSpan={11} className="text-center py-6 text-muted-foreground">Loading…</TableCell></TableRow>}
              {data.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{r.productName}</TableCell>
                  <TableCell className="font-mono text-xs">{r.sku}</TableCell>
                  <TableCell className="text-right">{soldQty(r)}</TableCell>
                  <TableCell className={cn("text-right", returnedQty(r) > 0 && "text-destructive")}>{returnedQty(r) > 0 ? returnedQty(r) : "—"}</TableCell>
                  <TableCell className="text-right font-medium">{netQty(r)}</TableCell>
                  <TableCell className="text-right">{fmtPKR(grossRevenue(r))}</TableCell>
                  <TableCell className={cn("text-right", returnValue(r) > 0 && "text-destructive")}>{returnValue(r) > 0 ? fmtPKR(returnValue(r)) : "—"}</TableCell>
                  <TableCell className="text-right font-medium">{fmtPKR(netRevenue(r))}</TableCell>
                  <TableCell className="text-right">{fmtPKR(grossProfit(r))}</TableCell>
                  <TableCell className={cn("text-right", returnCost(r) > 0 && "text-destructive")}>{returnCost(r) > 0 ? fmtPKR(returnCost(r)) : "—"}</TableCell>
                  <TableCell className="text-right font-medium text-green-600 dark:text-green-400">{fmtPKR(netProfit(r))}</TableCell>
                </TableRow>
              ))}
              {!isFetching && !data.length && <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-6">No sales data for selected period</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function CustomerWiseSales({ sd, ed, setSd, setEd }: { sd: string; ed: string; setSd: (v: string) => void; setEd: (v: string) => void }) {
  const { data = [], isFetching } = useQuery<any[]>({
    queryKey: ["customer-sales", sd, ed],
    queryFn: () => apiFetch(`/api/reports/customer-sales?startDate=${sd}&endDate=${ed}`),
  });
  const csvExport = () => exportToCsv(data.map(r => ({ Customer: r.customerName, Phone: r.phone, Orders: r.totalOrders, Amount: r.totalAmount, Discount: r.totalDiscount, Paid: r.totalPaid, Due: r.totalDue })), `customer-sales-${sd}-${ed}.csv`);
  return (
    <div className="space-y-4">
      <DateFilter sd={sd} ed={ed} setSd={setSd} setEd={setEd} />
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="grid gap-3 grid-cols-3">
          <KpiCard label="Customers" value={fmt(data.length)} />
          <KpiCard label="Total Revenue" value={fmtPKR(data.reduce((s, r) => s + r.totalAmount, 0))} />
          <KpiCard label="Outstanding Due" value={fmtPKR(data.reduce((s, r) => s + r.totalDue, 0))} />
        </div>
        <ExportRow onCsv={csvExport} onPrint={() => {
          const rows = data.map(r => `<tr><td>${r.customerName}</td><td>${r.phone ?? ""}</td><td class="text-right">${r.totalOrders}</td><td class="text-right">PKR ${Number(r.totalAmount).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</td><td class="text-right">PKR ${Number(r.totalDue).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</td></tr>`).join("");
          printReport(`Customer-wise Sales: ${sd} to ${ed}`, `<table><thead><tr><th>Customer</th><th>Phone</th><th class="text-right">Orders</th><th class="text-right">Amount</th><th class="text-right">Due</th></tr></thead><tbody>${rows}</tbody></table>`);
        }} />
      </div>
      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-right">Orders</TableHead>
              <TableHead className="text-right">Total Amount</TableHead>
              <TableHead className="text-right">Discount</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Due</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isFetching && <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">Loading…</TableCell></TableRow>}
              {data.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{r.customerName}</TableCell>
                  <TableCell>{r.phone ?? "—"}</TableCell>
                  <TableCell className="text-right">{r.totalOrders}</TableCell>
                  <TableCell className="text-right font-medium">{fmtPKR(r.totalAmount)}</TableCell>
                  <TableCell className="text-right text-orange-500">{r.totalDiscount > 0 ? `−${fmtPKR(r.totalDiscount)}` : "—"}</TableCell>
                  <TableCell className="text-right">{fmtPKR(r.totalPaid)}</TableCell>
                  <TableCell className="text-right">{r.totalDue > 0 ? <span className="text-destructive">{fmtPKR(r.totalDue)}</span> : <span className="text-green-500">Settled</span>}</TableCell>
                </TableRow>
              ))}
              {!isFetching && !data.length && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No customer sales for selected period</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SalesList({ sd, ed, setSd, setEd, filterFn, title, emptyMsg }: { sd: string; ed: string; setSd: (v: string) => void; setEd: (v: string) => void; filterFn: (s: any) => boolean; title: string; emptyMsg: string }) {
  const { data: allSales = [] } = useListSales({}, { query: { queryKey: ["all-sales-reports"] } });
  const rows = allSales.filter(s => {
    const d = new Date(s.createdAt).toISOString().slice(0, 10);
    return d >= sd && d <= ed && filterFn(s);
  });
  const sign = (s: any) => (s.isReturn ? -1 : 1);
  const csvExport = () => exportToCsv(rows.map(s => ({ Invoice: s.invoiceNumber, Date: s.createdAt.slice(0, 10), Type: s.isReturn ? "Sales Return" : "Sale", Customer: s.customerName ?? "Walk-in", Payment: s.paymentMethod, Subtotal: s.subtotal, Discount: s.discount, Total: sign(s) * Number(s.totalAmount), Paid: sign(s) * Number(s.paidAmount), Due: s.dueAmount })), `${title.toLowerCase().replace(/\s+/g, "-")}-${sd}-${ed}.csv`);
  const total = rows.reduce((s, x) => s + sign(x) * Number(x.totalAmount), 0);
  const collected = rows.reduce((s, x) => s + sign(x) * Number(x.paidAmount), 0);
  return (
    <div className="space-y-4">
      <DateFilter sd={sd} ed={ed} setSd={setSd} setEd={setEd} />
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="grid gap-3 grid-cols-3">
          <KpiCard label="Transactions" value={fmt(rows.length)} />
          <KpiCard label="Total Amount" value={fmtPKR(total)} />
          <KpiCard label="Collected" value={fmtPKR(collected)} />
        </div>
        <ExportRow onCsv={csvExport} onPrint={() => {
          const trs = rows.map(s => `<tr><td>${s.invoiceNumber}${s.isReturn ? " (Sales Return)" : ""}</td><td>${s.createdAt.slice(0, 10)}</td><td>${s.customerName ?? "Walk-in"}</td><td>${s.paymentMethod}</td><td class="text-right">${s.isReturn ? "−" : ""}PKR ${Number(s.totalAmount).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</td></tr>`).join("");
          printReport(`${title}: ${sd} to ${ed}`, `<table><thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th>Payment</th><th class="text-right">Total</th></tr></thead><tbody>${trs}</tbody></table>`);
        }} />
      </div>
      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
              <TableHead className="text-right">Discount</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Due</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.map(s => (
                <TableRow key={s.id} className={s.isReturn ? "bg-destructive/5" : undefined}>
                  <TableCell className="font-mono text-xs">{s.invoiceNumber}{s.isReturn && <Badge variant="destructive" className="ml-1 text-[10px]">Sales Return</Badge>}</TableCell>
                  <TableCell>{s.createdAt.slice(0, 10)}</TableCell>
                  <TableCell>{s.customerName || "Walk-in"}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize text-xs">{s.paymentMethod}</Badge></TableCell>
                  <TableCell className="text-right">{fmtPKR(s.subtotal)}</TableCell>
                  <TableCell className="text-right">{Number(s.discount) > 0 ? <span className="text-orange-500">−{fmtPKR(s.discount)}</span> : "—"}</TableCell>
                  <TableCell className={cn("text-right font-medium", s.isReturn && "text-destructive")}>{s.isReturn ? "−" : ""}{fmtPKR(s.totalAmount)}</TableCell>
                  <TableCell className="text-right">{Number(s.dueAmount) > 0 ? <span className="text-destructive">{fmtPKR(s.dueAmount)}</span> : <span className="text-green-500">Paid</span>}</TableCell>
                </TableRow>
              ))}
              {!rows.length && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">{emptyMsg}</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SalesReturns({ sd, ed, setSd, setEd }: { sd: string; ed: string; setSd: (v: string) => void; setEd: (v: string) => void }) {
  const { data = [], isFetching } = useQuery<any[]>({
    queryKey: ["returns-report", sd, ed],
    queryFn: () => apiFetch(`/api/reports/returns?startDate=${sd}&endDate=${ed}`),
  });
  const csvExport = () => exportToCsv(data.map(r => ({ Invoice: r.invoiceNumber, Date: new Date(r.createdAt).toISOString().slice(0, 10), Customer: r.customerName, Amount: r.totalAmount })), `sales-returns-${sd}-${ed}.csv`);
  return (
    <div className="space-y-4">
      <DateFilter sd={sd} ed={ed} setSd={setSd} setEd={setEd} />
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="grid gap-3 grid-cols-2">
          <KpiCard label="Total Returns" value={fmt(data.length)} />
          <KpiCard label="Total Returned Value" value={fmtPKR(data.reduce((s, r) => s + r.totalAmount, 0))} />
        </div>
        <ExportRow onCsv={csvExport} onPrint={() => {
          const rows = data.map(r => `<tr><td>${r.invoiceNumber}</td><td>${new Date(r.createdAt).toISOString().slice(0, 10)}</td><td>${r.customerName}</td><td class="text-right">PKR ${Number(r.totalAmount).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</td></tr>`).join("");
          printReport(`Sales Returns: ${sd} to ${ed}`, `<table><thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th class="text-right">Amount</th></tr></thead><tbody>${rows}</tbody></table>`);
        }} />
      </div>
      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Return Invoice</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Items</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isFetching && <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Loading…</TableCell></TableRow>}
              {data.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="font-mono text-xs">{r.invoiceNumber}</TableCell>
                  <TableCell>{new Date(r.createdAt).toISOString().slice(0, 10)}</TableCell>
                  <TableCell>{r.customerName}</TableCell>
                  <TableCell className="text-right font-medium text-destructive">{fmtPKR(r.totalAmount)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{(r.items ?? []).map((it: any) => `${it.productName} ×${it.quantity}`).join(", ")}</TableCell>
                </TableRow>
              ))}
              {!isFetching && !data.length && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No returns in selected period</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function DiscountReport({ sd, ed, setSd, setEd }: { sd: string; ed: string; setSd: (v: string) => void; setEd: (v: string) => void }) {
  const { data, isFetching } = useQuery<any>({
    queryKey: ["discounts-report", sd, ed],
    queryFn: () => apiFetch(`/api/reports/discounts?startDate=${sd}&endDate=${ed}`),
  });
  const csvExport = () => exportToCsv((data?.rows ?? []).map((r: any) => ({ Invoice: r.invoiceNumber, Date: new Date(r.createdAt).toISOString().slice(0, 10), Customer: r.customerName, Subtotal: r.subtotal, Discount: r.discount, Total: r.totalAmount })), `discounts-${sd}-${ed}.csv`);
  return (
    <div className="space-y-4">
      <DateFilter sd={sd} ed={ed} setSd={setSd} setEd={setEd} />
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="grid gap-3 grid-cols-4">
          <KpiCard label="Total Sales" value={fmt(data?.totalSales)} />
          <KpiCard label="Discounted Sales" value={fmt(data?.discountedSales)} />
          <KpiCard label="Total Discount" value={fmtPKR(data?.totalDiscount)} />
          <KpiCard label="Total Revenue" value={fmtPKR(data?.totalRevenue)} />
        </div>
        <ExportRow onCsv={csvExport} onPrint={() => {
          const rows = (data?.rows ?? []).map((r: any) => `<tr><td>${r.invoiceNumber}</td><td>${new Date(r.createdAt).toISOString().slice(0, 10)}</td><td>${r.customerName}</td><td class="text-right">PKR ${Number(r.subtotal).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</td><td class="text-right">PKR ${Number(r.discount).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</td></tr>`).join("");
          printReport(`Discount Report: ${sd} to ${ed}`, `<table><thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th class="text-right">Subtotal</th><th class="text-right">Discount</th></tr></thead><tbody>${rows}</tbody></table>`);
        }} />
      </div>
      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
              <TableHead className="text-right">Discount</TableHead>
              <TableHead className="text-right">Final Total</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isFetching && <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Loading…</TableCell></TableRow>}
              {(data?.rows ?? []).map((r: any, i: number) => (
                <TableRow key={i}>
                  <TableCell className="font-mono text-xs">{r.invoiceNumber}</TableCell>
                  <TableCell>{new Date(r.createdAt).toISOString().slice(0, 10)}</TableCell>
                  <TableCell>{r.customerName}</TableCell>
                  <TableCell className="text-right">{fmtPKR(r.subtotal)}</TableCell>
                  <TableCell className="text-right text-orange-500 font-medium">−{fmtPKR(r.discount)}</TableCell>
                  <TableCell className="text-right font-medium">{fmtPKR(r.totalAmount)}</TableCell>
                </TableRow>
              ))}
              {!isFetching && !data?.rows?.length && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No discounted sales in selected period</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function PurchasesReport({ sd, ed, setSd, setEd }: { sd: string; ed: string; setSd: (v: string) => void; setEd: (v: string) => void }) {
  const { data: allPurchases = [] } = useListPurchases(undefined, { query: { queryKey: ["purchases-all"] } });
  const rows = allPurchases.filter(p => { const d = new Date(p.createdAt).toISOString().slice(0, 10); return d >= sd && d <= ed; });
  const csvExport = () => exportToCsv(rows.map(p => ({ PO: p.purchaseNumber, Date: p.createdAt.slice(0, 10), Supplier: p.supplierName ?? "", Total: p.totalAmount, Paid: p.paidAmount, Due: p.dueAmount })), `purchases-${sd}-${ed}.csv`);
  return (
    <div className="space-y-4">
      <DateFilter sd={sd} ed={ed} setSd={setSd} setEd={setEd} />
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="grid gap-3 grid-cols-3">
          <KpiCard label="Purchase Orders" value={fmt(rows.length)} />
          <KpiCard label="Total Purchases" value={fmtPKR(rows.reduce((s, p) => s + Number(p.totalAmount), 0))} />
          <KpiCard label="Outstanding Due" value={fmtPKR(rows.reduce((s, p) => s + Number(p.dueAmount), 0))} />
        </div>
        <ExportRow onCsv={csvExport} onPrint={() => {
          const trs = rows.map(p => `<tr><td>${p.purchaseNumber}</td><td>${p.createdAt.slice(0, 10)}</td><td>${p.supplierName ?? "—"}</td><td class="text-right">PKR ${Number(p.totalAmount).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</td></tr>`).join("");
          printReport(`Date-wise Purchases: ${sd} to ${ed}`, `<table><thead><tr><th>PO</th><th>Date</th><th>Supplier</th><th class="text-right">Total</th></tr></thead><tbody>${trs}</tbody></table>`);
        }} />
      </div>
      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader><TableRow>
              <TableHead>PO Number</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Due</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.purchaseNumber}</TableCell>
                  <TableCell className="font-medium">{p.supplierName || "—"}</TableCell>
                  <TableCell>{p.createdAt.slice(0, 10)}</TableCell>
                  <TableCell><Badge variant={p.status === "received" ? "default" : "secondary"} className="capitalize text-xs">{p.status}</Badge></TableCell>
                  <TableCell className="text-right font-medium">{fmtPKR(p.totalAmount)}</TableCell>
                  <TableCell className="text-right">{fmtPKR(p.paidAmount)}</TableCell>
                  <TableCell className="text-right">{Number(p.dueAmount) > 0 ? <span className="text-destructive">{fmtPKR(p.dueAmount)}</span> : <span className="text-green-500">Paid</span>}</TableCell>
                </TableRow>
              ))}
              {!rows.length && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No purchases in selected period</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SupplierWisePurchases({ sd, ed, setSd, setEd }: { sd: string; ed: string; setSd: (v: string) => void; setEd: (v: string) => void }) {
  const { data = [], isFetching } = useQuery<any[]>({
    queryKey: ["supplier-purchases", sd, ed],
    queryFn: () => apiFetch(`/api/reports/supplier-purchases?startDate=${sd}&endDate=${ed}`),
  });
  const csvExport = () => exportToCsv(data.map(r => ({ Supplier: r.supplierName, Company: r.company ?? "", Orders: r.totalOrders, Total: r.totalAmount, Paid: r.totalPaid, Due: r.totalDue })), `supplier-purchases-${sd}-${ed}.csv`);
  return (
    <div className="space-y-4">
      <DateFilter sd={sd} ed={ed} setSd={setSd} setEd={setEd} />
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="grid gap-3 grid-cols-3">
          <KpiCard label="Suppliers" value={fmt(data.length)} />
          <KpiCard label="Total Purchases" value={fmtPKR(data.reduce((s, r) => s + r.totalAmount, 0))} />
          <KpiCard label="Outstanding Due" value={fmtPKR(data.reduce((s, r) => s + r.totalDue, 0))} />
        </div>
        <ExportRow onCsv={csvExport} onPrint={() => {
          const rows = data.map(r => `<tr><td>${r.supplierName}</td><td>${r.company ?? ""}</td><td class="text-right">${r.totalOrders}</td><td class="text-right">PKR ${Number(r.totalAmount).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</td></tr>`).join("");
          printReport(`Supplier-wise Purchases: ${sd} to ${ed}`, `<table><thead><tr><th>Supplier</th><th>Company</th><th class="text-right">Orders</th><th class="text-right">Total</th></tr></thead><tbody>${rows}</tbody></table>`);
        }} />
      </div>
      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Supplier</TableHead>
              <TableHead>Company</TableHead>
              <TableHead className="text-right">Orders</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Due</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isFetching && <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Loading…</TableCell></TableRow>}
              {data.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{r.supplierName}</TableCell>
                  <TableCell>{r.company ?? "—"}</TableCell>
                  <TableCell className="text-right">{r.totalOrders}</TableCell>
                  <TableCell className="text-right font-medium">{fmtPKR(r.totalAmount)}</TableCell>
                  <TableCell className="text-right">{fmtPKR(r.totalPaid)}</TableCell>
                  <TableCell className="text-right">{r.totalDue > 0 ? <span className="text-destructive">{fmtPKR(r.totalDue)}</span> : <span className="text-green-500">Settled</span>}</TableCell>
                </TableRow>
              ))}
              {!isFetching && !data.length && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No purchases in selected period</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function ProductWisePurchases({ sd, ed, setSd, setEd }: { sd: string; ed: string; setSd: (v: string) => void; setEd: (v: string) => void }) {
  const { data = [], isFetching } = useQuery<any[]>({
    queryKey: ["product-purchases", sd, ed],
    queryFn: () => apiFetch(`/api/reports/product-purchases?startDate=${sd}&endDate=${ed}`),
  });
  const csvExport = () => exportToCsv(data.map(r => ({ Product: r.productName, SKU: r.sku, "Qty Purchased": r.totalQty, "Total Cost": r.totalCost })), `product-purchases-${sd}-${ed}.csv`);
  return (
    <div className="space-y-4">
      <DateFilter sd={sd} ed={ed} setSd={setSd} setEd={setEd} />
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="grid gap-3 grid-cols-2">
          <KpiCard label="Products Purchased" value={fmt(data.length)} />
          <KpiCard label="Total Cost" value={fmtPKR(data.reduce((s, r) => s + r.totalCost, 0))} />
        </div>
        <ExportRow onCsv={csvExport} onPrint={() => {
          const rows = data.map(r => `<tr><td>${r.productName}</td><td>${r.sku}</td><td class="text-right">${r.totalQty}</td><td class="text-right">PKR ${Number(r.totalCost).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</td></tr>`).join("");
          printReport(`Product-wise Purchases: ${sd} to ${ed}`, `<table><thead><tr><th>Product</th><th>SKU</th><th class="text-right">Qty</th><th class="text-right">Cost</th></tr></thead><tbody>${rows}</tbody></table>`);
        }} />
      </div>
      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Qty Purchased</TableHead>
              <TableHead className="text-right">Total Cost</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isFetching && <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">Loading…</TableCell></TableRow>}
              {data.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{r.productName}</TableCell>
                  <TableCell className="font-mono text-xs">{r.sku}</TableCell>
                  <TableCell className="text-right">{r.totalQty}</TableCell>
                  <TableCell className="text-right font-medium">{fmtPKR(r.totalCost)}</TableCell>
                </TableRow>
              ))}
              {!isFetching && !data.length && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No purchase data for selected period</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function StockReport() {
  const { data: inventoryReport } = useGetInventoryReport();
  const csvExport = () => exportToCsv((inventoryReport?.items ?? []).map(r => ({ Product: r.productName, SKU: r.sku, Category: r.categoryName ?? "", Stock: r.stock, Value: r.value })), `stock-report-${format(new Date(), "yyyy-MM-dd")}.csv`);
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="grid gap-3 grid-cols-3">
          <KpiCard label="Total Products" value={fmt(inventoryReport?.totalProducts)} />
          <KpiCard label="Total Stock Units" value={fmt(inventoryReport?.totalStock)} />
          <KpiCard label="Total Stock Value" value={fmtPKR(inventoryReport?.totalValue)} />
        </div>
        <ExportRow onCsv={csvExport} onPrint={() => {
          const rows = (inventoryReport?.items ?? []).map(r => `<tr><td>${r.productName}</td><td>${r.sku}</td><td>${r.categoryName ?? ""}</td><td class="text-right">${r.stock}</td><td class="text-right">PKR ${Number(r.value).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</td></tr>`).join("");
          printReport(`Stock Report — ${format(new Date(), "dd MMM yyyy")}`, `<table><thead><tr><th>Product</th><th>SKU</th><th>Category</th><th class="text-right">Stock</th><th class="text-right">Value</th></tr></thead><tbody>${rows}</tbody></table>`);
        }} />
      </div>
      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {inventoryReport?.items.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{r.productName}</TableCell>
                  <TableCell className="font-mono text-xs">{r.sku}</TableCell>
                  <TableCell>{r.categoryName ?? "—"}</TableCell>
                  <TableCell className="text-right">{r.stock}</TableCell>
                  <TableCell className="text-right">{fmtPKR(r.value)}</TableCell>
                  <TableCell>
                    {r.stock === 0 ? <Badge variant="destructive" className="text-xs">Out of Stock</Badge>
                      : r.stock <= (r as any).lowStockLimit ? <Badge variant="outline" className="text-xs text-orange-500 border-orange-400">Low Stock</Badge>
                      : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function LowStockReport() {
  const { data: inventoryReport } = useGetInventoryReport();
  const lowStock = (inventoryReport?.items ?? []).filter((r: any) => r.stock <= (r.lowStockLimit ?? 5));
  const outOfStock = lowStock.filter(r => r.stock === 0);
  const csvExport = () => exportToCsv(lowStock.map(r => ({ Product: r.productName, SKU: r.sku, Category: r.categoryName ?? "", Stock: r.stock, Threshold: (r as any).lowStockLimit ?? 5 })), `low-stock-${format(new Date(), "yyyy-MM-dd")}.csv`);
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="grid gap-3 grid-cols-2">
          <KpiCard label="Low Stock Items" value={fmt(lowStock.length)} sub="At or below threshold" />
          <KpiCard label="Out of Stock" value={fmt(outOfStock.length)} sub="Zero stock" />
        </div>
        <ExportRow onCsv={csvExport} onPrint={() => {
          const rows = lowStock.map(r => `<tr><td>${r.productName}</td><td>${r.sku}</td><td class="text-right">${r.stock}</td><td class="text-right">${(r as any).lowStockLimit ?? 5}</td><td>${r.stock === 0 ? "OUT OF STOCK" : "LOW STOCK"}</td></tr>`).join("");
          printReport(`Low Stock Report — ${format(new Date(), "dd MMM yyyy")}`, `<table><thead><tr><th>Product</th><th>SKU</th><th class="text-right">Stock</th><th class="text-right">Threshold</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`);
        }} />
      </div>
      {outOfStock.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
          <p className="text-sm font-medium text-destructive">⚠ {outOfStock.length} product(s) are completely out of stock and need immediate restocking.</p>
        </div>
      )}
      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Current Stock</TableHead>
              <TableHead className="text-right">Threshold</TableHead>
              <TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {lowStock.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{r.productName}</TableCell>
                  <TableCell className="font-mono text-xs">{r.sku}</TableCell>
                  <TableCell>{r.categoryName ?? "—"}</TableCell>
                  <TableCell className="text-right font-bold">{r.stock}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{(r as any).lowStockLimit ?? 5}</TableCell>
                  <TableCell>{r.stock === 0 ? <Badge variant="destructive" className="text-xs">Out of Stock</Badge> : <Badge variant="outline" className="text-xs text-orange-500 border-orange-400">Low Stock</Badge>}</TableCell>
                </TableRow>
              ))}
              {!lowStock.length && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">All products are well-stocked</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function StockMovements({ sd, ed, setSd, setEd }: { sd: string; ed: string; setSd: (v: string) => void; setEd: (v: string) => void }) {
  const { data = [], isFetching } = useQuery<any[]>({
    queryKey: ["stock-movements", sd, ed],
    queryFn: () => apiFetch(`/api/reports/stock-movements?startDate=${sd}&endDate=${ed}`),
  });
  const typeColor: Record<string, string> = { stock_in: "text-green-500", stock_out: "text-red-500", adjustment: "text-blue-500", transfer: "text-purple-500" };
  const csvExport = () => exportToCsv(data.map(r => ({ Product: r.productName, SKU: r.sku, Type: r.type, Quantity: r.quantity, Notes: r.notes ?? "", Date: new Date(r.createdAt).toISOString().slice(0, 10) })), `stock-movements-${sd}-${ed}.csv`);
  return (
    <div className="space-y-4">
      <DateFilter sd={sd} ed={ed} setSd={setSd} setEd={setEd} />
      <div className="flex justify-between items-center">
        <KpiCard label="Total Movements" value={fmt(data.length)} />
        <ExportRow onCsv={csvExport} onPrint={() => {
          const rows = data.map(r => `<tr><td>${new Date(r.createdAt).toISOString().slice(0, 10)}</td><td>${r.productName}</td><td>${r.type}</td><td class="text-right">${r.quantity}</td><td>${r.notes ?? ""}</td></tr>`).join("");
          printReport(`Stock Movements: ${sd} to ${ed}`, `<table><thead><tr><th>Date</th><th>Product</th><th>Type</th><th class="text-right">Qty</th><th>Notes</th></tr></thead><tbody>${rows}</tbody></table>`);
        }} />
      </div>
      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isFetching && <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Loading…</TableCell></TableRow>}
              {data.map((r, i) => (
                <TableRow key={i}>
                  <TableCell>{new Date(r.createdAt).toISOString().slice(0, 10)}</TableCell>
                  <TableCell className="font-medium">{r.productName}</TableCell>
                  <TableCell className="font-mono text-xs">{r.sku}</TableCell>
                  <TableCell><span className={cn("capitalize font-medium text-sm", typeColor[r.type] ?? "")}>{r.type.replace(/_/g, " ")}</span></TableCell>
                  <TableCell className="text-right font-medium">{r.quantity}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.notes ?? "—"}</TableCell>
                </TableRow>
              ))}
              {!isFetching && !data.length && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No stock movements in selected period</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function PLReport({ sd, ed, setSd, setEd }: { sd: string; ed: string; setSd: (v: string) => void; setEd: (v: string) => void }) {
  const { data: plReport } = useGetProfitLossReport({ startDate: sd, endDate: ed }, { query: { queryKey: getGetProfitLossReportQueryKey({ startDate: sd, endDate: ed }) } });
  return (
    <div className="space-y-4">
      <DateFilter sd={sd} ed={ed} setSd={setSd} setEd={setEd} />
      <div className="flex justify-end">
        <ExportRow onCsv={() => plReport && exportToCsv([{ Period: `${sd} to ${ed}`, Revenue: plReport.revenue, "Cost of Goods": plReport.costOfGoods, "Gross Profit": plReport.grossProfit, Expenses: plReport.expenses, "Net Profit": plReport.netProfit }], `pl-${sd}-${ed}.csv`)} onPrint={() => {
          if (!plReport) return;
          printReport(`Profit & Loss: ${sd} to ${ed}`, `
            <table>
              <tbody>
                <tr><th style="text-align:left">Gross Sales</th><td class="text-right">PKR ${Number(plReport.grossSales ?? plReport.revenue).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</td></tr>
                <tr><th style="text-align:left">Sales Returns</th><td class="text-right">−PKR ${Number(plReport.salesReturns ?? 0).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</td></tr>
                <tr style="background:#f9fafb"><th style="text-align:left">Net Sales (Revenue)</th><td class="text-right">PKR ${Number(plReport.revenue).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</td></tr>
                <tr><th style="text-align:left">Cost of Goods Sold (Net)</th><td class="text-right">−PKR ${Number(plReport.costOfGoods).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</td></tr>
                <tr style="background:#f9fafb"><th style="text-align:left">Gross Profit</th><td class="text-right">PKR ${Number(plReport.grossProfit).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</td></tr>
                <tr><th style="text-align:left">Total Expenses</th><td class="text-right">−PKR ${Number(plReport.expenses).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</td></tr>
                <tr style="background:#f0fdf4;font-weight:bold"><th style="text-align:left">Net Profit</th><td class="text-right">PKR ${Number(plReport.netProfit).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</td></tr>
              </tbody>
            </table>`);
        }} />
      </div>
      {plReport && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            { label: "Gross Sales", value: plReport.grossSales ?? plReport.revenue, color: "text-foreground" },
            { label: "Sales Returns", value: plReport.salesReturns ?? 0, color: "text-red-500", prefix: "−" },
            { label: "Net Sales (Revenue)", value: plReport.revenue, color: "text-foreground" },
            { label: "Cost of Goods (Net)", value: plReport.costOfGoods, color: "text-red-500", prefix: "−" },
            { label: "Gross Profit", value: plReport.grossProfit, color: "text-blue-500" },
            { label: "Total Expenses", value: plReport.expenses, color: "text-red-500", prefix: "−" },
            { label: "Net Profit", value: plReport.netProfit, color: plReport.netProfit >= 0 ? "text-green-500" : "text-red-500" },
          ].map(item => (
            <Card key={item.label}>
              <CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">{item.label}</CardTitle></CardHeader>
              <CardContent><div className={cn("text-3xl font-bold", item.color)}>{item.prefix ?? ""}{fmtPKR(item.value)}</div></CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ReceivablesReport() {
  const { data, isFetching } = useQuery<any>({
    queryKey: ["receivables"],
    queryFn: () => apiFetch("/api/reports/receivables"),
  });
  const csvExport = () => exportToCsv((data?.rows ?? []).map((r: any) => ({ Customer: r.name, Phone: r.phone, Email: r.email ?? "", Orders: r.totalOrders, "Total Spent": r.totalSpent, "Outstanding": r.balance })), `receivables-${format(new Date(), "yyyy-MM-dd")}.csv`);
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="grid gap-3 grid-cols-2">
          <KpiCard label="Customers with Balance" value={fmt(data?.totalCustomers)} />
          <KpiCard label="Total Receivable" value={fmtPKR(data?.totalReceivable)} />
        </div>
        <ExportRow onCsv={csvExport} onPrint={() => {
          const rows = (data?.rows ?? []).map((r: any) => `<tr><td>${r.name}</td><td>${r.phone ?? ""}</td><td class="text-right">${r.totalOrders}</td><td class="text-right">PKR ${Number(r.balance).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</td></tr>`).join("");
          printReport(`Receivables Report — ${format(new Date(), "dd MMM yyyy")}`, `<table><thead><tr><th>Customer</th><th>Phone</th><th class="text-right">Orders</th><th class="text-right">Outstanding</th></tr></thead><tbody>${rows}</tbody></table>`);
        }} />
      </div>
      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Orders</TableHead>
              <TableHead className="text-right">Total Spent</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isFetching && <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Loading…</TableCell></TableRow>}
              {(data?.rows ?? []).map((r: any, i: number) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.phone ?? "—"}</TableCell>
                  <TableCell>{r.email ?? "—"}</TableCell>
                  <TableCell className="text-right">{r.totalOrders}</TableCell>
                  <TableCell className="text-right">{fmtPKR(r.totalSpent)}</TableCell>
                  <TableCell className="text-right font-bold text-destructive">{fmtPKR(r.balance)}</TableCell>
                </TableRow>
              ))}
              {!isFetching && !data?.rows?.length && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No outstanding receivables</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function PayablesReport() {
  const { data, isFetching } = useQuery<any>({
    queryKey: ["payables"],
    queryFn: () => apiFetch("/api/reports/payables"),
  });
  const csvExport = () => exportToCsv((data?.rows ?? []).map((r: any) => ({ Supplier: r.name, Company: r.company ?? "", Phone: r.phone ?? "", "Outstanding": r.balance })), `payables-${format(new Date(), "yyyy-MM-dd")}.csv`);
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="grid gap-3 grid-cols-2">
          <KpiCard label="Suppliers with Balance" value={fmt(data?.totalSuppliers)} />
          <KpiCard label="Total Payable" value={fmtPKR(data?.totalPayable)} />
        </div>
        <ExportRow onCsv={csvExport} onPrint={() => {
          const rows = (data?.rows ?? []).map((r: any) => `<tr><td>${r.name}</td><td>${r.company ?? ""}</td><td class="text-right">PKR ${Number(r.balance).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</td></tr>`).join("");
          printReport(`Payables Report — ${format(new Date(), "dd MMM yyyy")}`, `<table><thead><tr><th>Supplier</th><th>Company</th><th class="text-right">Outstanding</th></tr></thead><tbody>${rows}</tbody></table>`);
        }} />
      </div>
      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Supplier</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-right">Outstanding Payable</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isFetching && <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">Loading…</TableCell></TableRow>}
              {(data?.rows ?? []).map((r: any, i: number) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.company ?? "—"}</TableCell>
                  <TableCell>{r.phone ?? "—"}</TableCell>
                  <TableCell className="text-right font-bold text-destructive">{fmtPKR(r.balance)}</TableCell>
                </TableRow>
              ))}
              {!isFetching && !data?.rows?.length && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No outstanding payables</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

const PIE_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];

function ExpenseReport({ sd, ed, setSd, setEd }: { sd: string; ed: string; setSd: (v: string) => void; setEd: (v: string) => void }) {
  const { data, isFetching } = useQuery<any>({
    queryKey: ["expenses-summary", sd, ed],
    queryFn: () => apiFetch(`/api/reports/expenses-summary?startDate=${sd}&endDate=${ed}`),
  });
  const csvExport = () => exportToCsv((data?.rows ?? []).map((r: any) => ({ Title: r.title, Category: r.category, Amount: r.amount, Date: r.date, Notes: r.notes ?? "" })), `expenses-${sd}-${ed}.csv`);
  return (
    <div className="space-y-4">
      <DateFilter sd={sd} ed={ed} setSd={setSd} setEd={setEd} />
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="grid gap-3 grid-cols-2">
          <KpiCard label="Total Expenses" value={fmtPKR(data?.totalAmount)} />
          <KpiCard label="Transactions" value={fmt(data?.totalCount)} />
        </div>
        <ExportRow onCsv={csvExport} onPrint={() => {
          const rows = (data?.rows ?? []).map((r: any) => `<tr><td>${r.date}</td><td>${r.title}</td><td>${r.category}</td><td class="text-right">PKR ${Number(r.amount).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</td></tr>`).join("");
          printReport(`Expense Report: ${sd} to ${ed}`, `<table><thead><tr><th>Date</th><th>Title</th><th>Category</th><th class="text-right">Amount</th></tr></thead><tbody>${rows}</tbody></table>`);
        }} />
      </div>
      {data?.categories?.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">By Category</CardTitle></CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.categories} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={70} label={({ category, percent }) => `${category} (${(percent * 100).toFixed(0)}%)`} labelLine={false}>
                      {data.categories.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => fmtPKR(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Category Breakdown</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Category</TableHead><TableHead className="text-right">Count</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                <TableBody>
                  {data.categories.map((c: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{c.category}</TableCell>
                      <TableCell className="text-right">{c.count}</TableCell>
                      <TableCell className="text-right font-medium">{fmtPKR(c.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isFetching && <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Loading…</TableCell></TableRow>}
              {(data?.rows ?? []).map((r: any, i: number) => (
                <TableRow key={i}>
                  <TableCell>{r.date}</TableCell>
                  <TableCell className="font-medium">{r.title}</TableCell>
                  <TableCell><Badge variant="secondary" className="capitalize text-xs">{r.category}</Badge></TableCell>
                  <TableCell className="text-right font-medium text-destructive">{fmtPKR(r.amount)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.notes ?? "—"}</TableCell>
                </TableRow>
              ))}
              {!isFetching && !data?.rows?.length && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No expenses in selected period</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SalaryReport() {
  const { data, isFetching } = useQuery<any>({
    queryKey: ["salary-report"],
    queryFn: () => apiFetch("/api/reports/salary"),
  });
  const csvExport = () => exportToCsv((data?.rows ?? []).map((r: any) => ({ "Emp ID": r.employeeId, Name: r.name, Role: r.role, Salary: r.salary, Status: r.status, "Joining Date": r.joiningDate })), `salary-report-${format(new Date(), "yyyy-MM-dd")}.csv`);
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="grid gap-3 grid-cols-3">
          <KpiCard label="Total Employees" value={fmt(data?.totalEmployees)} />
          <KpiCard label="Active Employees" value={fmt(data?.activeEmployees)} />
          <KpiCard label="Monthly Payroll" value={fmtPKR(data?.totalMonthlySalary)} />
        </div>
        <ExportRow onCsv={csvExport} onPrint={() => {
          const rows = (data?.rows ?? []).map((r: any) => `<tr><td>${r.employeeId}</td><td>${r.name}</td><td>${r.role}</td><td class="text-right">PKR ${Number(r.salary).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</td><td>${r.status}</td></tr>`).join("");
          printReport(`Salary Report — ${format(new Date(), "dd MMM yyyy")}`, `<table><thead><tr><th>Emp ID</th><th>Name</th><th>Role</th><th class="text-right">Salary</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`);
        }} />
      </div>
      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Emp ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joining Date</TableHead>
              <TableHead className="text-right">Monthly Salary</TableHead>
              <TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isFetching && <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Loading…</TableCell></TableRow>}
              {(data?.rows ?? []).map((r: any, i: number) => (
                <TableRow key={i}>
                  <TableCell className="font-mono text-xs">{r.employeeId}</TableCell>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="capitalize">{r.role}</TableCell>
                  <TableCell>{r.joiningDate}</TableCell>
                  <TableCell className="text-right font-medium">{fmtPKR(r.salary)}</TableCell>
                  <TableCell><Badge variant={r.status === "active" ? "default" : "secondary"} className="capitalize text-xs">{r.status}</Badge></TableCell>
                </TableRow>
              ))}
              {!isFetching && !data?.rows?.length && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No employees found</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function CashHandlingReport({ sd, ed, setSd, setEd }: { sd: string; ed: string; setSd: (v: string) => void; setEd: (v: string) => void }) {
  const { data, isFetching } = useQuery<any>({
    queryKey: ["cash-handling", sd, ed],
    queryFn: () => apiFetch(`/api/reports/cash-handling?startDate=${sd}&endDate=${ed}`),
  });
  const csvExport = () => exportToCsv((data?.byMethod ?? []).map((m: any) => ({ Method: m.paymentMethod, Transactions: m.count, Total: m.total, Collected: m.collected, Outstanding: m.outstanding })), `cash-handling-${sd}-${ed}.csv`);
  return (
    <div className="space-y-4">
      <DateFilter sd={sd} ed={ed} setSd={setSd} setEd={setEd} />
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="grid gap-3 grid-cols-4">
          <KpiCard label="Total Sales" value={fmtPKR(data?.totalSales)} />
          <KpiCard label="Collected" value={fmtPKR(data?.totalCollected)} />
          <KpiCard label="Outstanding" value={fmtPKR(data?.totalDue)} />
          <KpiCard label="Transactions" value={fmt(data?.totalTransactions)} />
        </div>
        <ExportRow onCsv={csvExport} onPrint={() => {
          const rows = (data?.byMethod ?? []).map((m: any) => `<tr><td class="capitalize">${m.paymentMethod}</td><td class="text-right">${m.count}</td><td class="text-right">PKR ${Number(m.total).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</td><td class="text-right">PKR ${Number(m.collected).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</td></tr>`).join("");
          printReport(`Cash Handling Report: ${sd} to ${ed}`, `<table><thead><tr><th>Payment Method</th><th class="text-right">Count</th><th class="text-right">Total</th><th class="text-right">Collected</th></tr></thead><tbody>${rows}</tbody></table>`);
        }} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">By Payment Method</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Count</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Collected</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {isFetching && <TableRow><TableCell colSpan={5} className="text-center py-4">Loading…</TableCell></TableRow>}
                {(data?.byMethod ?? []).map((m: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="capitalize font-medium">{m.paymentMethod}</TableCell>
                    <TableCell className="text-right">{m.count}</TableCell>
                    <TableCell className="text-right">{fmtPKR(m.total)}</TableCell>
                    <TableCell className="text-right text-green-600">{fmtPKR(m.collected)}</TableCell>
                    <TableCell className="text-right text-destructive">{m.outstanding > 0 ? fmtPKR(m.outstanding) : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Credit Sales (Due Outstanding)</CardTitle></CardHeader>
          <CardContent className="max-h-72 overflow-y-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Due</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {(data?.creditSales ?? []).map((r: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">{r.invoiceNumber}</TableCell>
                    <TableCell>{r.customerName}</TableCell>
                    <TableCell className="text-right font-medium text-destructive">{fmtPKR(r.due)}</TableCell>
                  </TableRow>
                ))}
                {!data?.creditSales?.length && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">No outstanding credit sales</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function BusinessAnalysis({ sd, ed, setSd, setEd }: { sd: string; ed: string; setSd: (v: string) => void; setEd: (v: string) => void }) {
  const { data, isFetching } = useQuery<any>({
    queryKey: ["business-analysis", sd, ed],
    queryFn: () => apiFetch(`/api/reports/business-analysis?startDate=${sd}&endDate=${ed}`),
  });
  return (
    <div className="space-y-4">
      <DateFilter sd={sd} ed={ed} setSd={setSd} setEd={setEd} />
      {isFetching && <p className="text-muted-foreground text-sm">Loading…</p>}
      {data && (
        <>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Gross Sales" value={fmtPKR(data.grossSales ?? data.revenue)} />
            <KpiCard label="Net Sales (Revenue)" value={fmtPKR(data.revenue)} sub={`After ${fmtPKR(data.salesReturns ?? data.returnsTotal ?? 0)} returns`} />
            <KpiCard label="Gross Profit" value={fmtPKR(data.grossProfit)} sub={`Margin: ${data.grossMargin}%`} />
            <KpiCard label="Net Profit" value={fmtPKR(data.netProfit)} sub={`Margin: ${data.netMargin}%`} />
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Avg Order Value" value={fmtPKR(data.avgOrderValue)} />
            <KpiCard label="Total Orders" value={fmt(data.orders)} />
            <KpiCard label="Unique Customers" value={fmt(data.uniqueCustomers)} />
            <KpiCard label="Total Discounts" value={fmtPKR(data.discounts)} />
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Purchases" value={fmtPKR(data.purchases)} />
            <KpiCard label="Purchase Returns" value={fmtPKR(data.purchaseReturns ?? 0)} sub={`${data.purchaseReturnsCount ?? 0} returns · Net ${fmtPKR(data.netPurchases ?? data.purchases)}`} />
            <KpiCard label="Expenses" value={fmtPKR(data.expenses)} />
            <KpiCard label="Sales Returns" value={fmtPKR(data.returnsTotal)} sub={`${data.returnsCount} transactions`} />
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">Top 5 Products by Revenue</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Qty Sold</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {(data.topProducts ?? []).map((p: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">#{i + 1} {p.name}</TableCell>
                      <TableCell className="text-right">{p.qty}</TableCell>
                      <TableCell className="text-right font-medium">{fmtPKR(p.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ── Expiry Products Report ────────────────────────────────────────────────────

const EXPIRY_STATUS_COLORS: Record<string, string> = {
  expired:  "bg-destructive/10 text-destructive",
  critical: "bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400",
  warning:  "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400",
  near:     "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
  ok:       "",
  no_expiry: "text-muted-foreground",
};
const EXPIRY_STATUS_LABELS: Record<string, string> = {
  expired: "Expired", critical: "≤ 7 Days", warning: "≤ 15 Days", near: "≤ 30 Days", ok: "OK", no_expiry: "No Date",
};

function ExpiryProductsReport() {
  const { data = [], isFetching } = useQuery<any[]>({
    queryKey: ["expiry-products-report"],
    queryFn: () => apiFetch("/api/reports/expiry-products"),
  });
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all" ? data : data.filter(r => r.expiryStatus === filter);
  const counts = { expired: 0, critical: 0, warning: 0, near: 0, ok: 0, no_expiry: 0 };
  data.forEach(r => { counts[r.expiryStatus as keyof typeof counts] = (counts[r.expiryStatus as keyof typeof counts] ?? 0) + 1; });

  const onPrint = () => {
    const rows = filtered.map(r =>
      `<tr class="${r.expiryStatus === "expired" ? "bg-red" : ""}"><td>${r.name}</td><td>${r.sku}</td><td>${r.batchNumber ?? "—"}</td><td>${r.mfgDate ?? "—"}</td><td>${r.expiryDate ?? "—"}</td><td>${r.daysToExpiry !== null ? r.daysToExpiry + " days" : "—"}</td><td>${r.stock}</td><td style="text-align:right">${fmtPKR(r.stockValue)}</td><td>${EXPIRY_STATUS_LABELS[r.expiryStatus] ?? r.expiryStatus}</td></tr>`
    ).join("");
    printReport("Expiry Report — All Products",
      `<table><thead><tr><th>Product</th><th>SKU</th><th>Batch</th><th>Mfg Date</th><th>Expiry Date</th><th>Days Left</th><th>Stock</th><th class="text-right">Stock Value</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`);
  };

  const onCsv = () => exportToCsv(
    filtered.map(r => ({
      "Product": r.name, "SKU": r.sku, "Batch #": r.batchNumber ?? "",
      "Mfg Date": r.mfgDate ?? "", "Expiry Date": r.expiryDate ?? "",
      "Days Left": r.daysToExpiry ?? "", "Stock": r.stock,
      "Stock Value": Number(r.stockValue).toFixed(2),
      "Status": EXPIRY_STATUS_LABELS[r.expiryStatus] ?? "",
    })),
    "expiry-report"
  );

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {(["expired","critical","warning","near","ok","no_expiry"] as const).map(k => (
          <button key={k} onClick={() => setFilter(filter === k ? "all" : k)}
            className={`rounded-lg border p-3 text-center transition-all ${filter === k ? "ring-2 ring-primary" : ""} ${counts[k] > 0 && k !== "ok" && k !== "no_expiry" ? EXPIRY_STATUS_COLORS[k] : ""}`}>
            <div className="text-xl font-bold">{counts[k]}</div>
            <div className="text-xs mt-0.5">{EXPIRY_STATUS_LABELS[k]}</div>
          </button>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <PackageX className="w-4 h-4" />
            Expiry Report
            {filter !== "all" && <Badge variant="secondary">{EXPIRY_STATUS_LABELS[filter]}</Badge>}
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onCsv}><Download className="w-4 h-4 mr-1.5" />CSV</Button>
            <Button variant="outline" size="sm" onClick={onPrint}><Printer className="w-4 h-4 mr-1.5" />Print</Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Batch #</TableHead>
              <TableHead>Mfg Date</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead className="text-right">Days Left</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Stock Value</TableHead>
              <TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isFetching && <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>}
              {filtered.map((r, i) => (
                <TableRow key={i} className={r.expiryStatus !== "ok" && r.expiryStatus !== "no_expiry" ? EXPIRY_STATUS_COLORS[r.expiryStatus] + " hover:opacity-90" : ""}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="font-mono text-xs">{r.sku}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{r.batchNumber ?? "—"}</TableCell>
                  <TableCell className="text-sm">{r.mfgDate ?? "—"}</TableCell>
                  <TableCell className="font-medium text-sm">{r.expiryDate ?? "—"}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {r.daysToExpiry !== null ? (r.daysToExpiry < 0 ? <span className="text-destructive font-bold">{r.daysToExpiry}d</span> : `${r.daysToExpiry}d`) : "—"}
                  </TableCell>
                  <TableCell className="text-right">{fmt(r.stock)}</TableCell>
                  <TableCell className="text-right">{fmtPKR(r.stockValue)}</TableCell>
                  <TableCell>
                    <Badge variant={r.expiryStatus === "expired" ? "destructive" : "secondary"} className="text-xs">
                      {EXPIRY_STATUS_LABELS[r.expiryStatus] ?? r.expiryStatus}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {!isFetching && !filtered.length && <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No products found</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Return Reasons Report ─────────────────────────────────────────────────────

const CUSTOMER_REASON_LABELS: Record<string, string> = {
  expired_product: "Product Expired", damaged_product: "Product Damaged",
  wrong_product: "Wrong Product", quality_issue: "Quality Issue",
  customer_changed_mind: "Changed Mind", packaging_issue: "Packaging Issue",
  other: "Other", not_specified: "Not Specified",
};
const SUPPLIER_REASON_LABELS: Record<string, string> = {
  expired_stock: "Expired Stock", damaged_stock: "Damaged Stock",
  wrong_supply: "Wrong Supply", excess_inventory: "Excess Inventory",
  quality_issue: "Quality Issue", other: "Other", not_specified: "Not Specified",
};
const REASON_COLORS = ["hsl(var(--primary))", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"];

function ReturnReasonsReport({ sd, ed, setSd, setEd }: { sd: string; ed: string; setSd: (v: string) => void; setEd: (v: string) => void }) {
  const { data, isFetching } = useQuery<{ customerReturns: any[]; supplierReturns: any[] }>({
    queryKey: ["return-reasons-report", sd, ed],
    queryFn: () => apiFetch(`/api/reports/return-reasons?startDate=${sd}&endDate=${ed}`),
    placeholderData: { customerReturns: [], supplierReturns: [] },
  });

  const cTotal = (data?.customerReturns ?? []).reduce((s, r) => s + r.count, 0);
  const sTotal = (data?.supplierReturns ?? []).reduce((s, r) => s + r.count, 0);

  const onPrint = () => {
    const cRows = (data?.customerReturns ?? []).map(r =>
      `<tr><td>${CUSTOMER_REASON_LABELS[r.reason] ?? r.reason}</td><td style="text-align:right">${r.count}</td><td style="text-align:right">${fmtPKR(r.totalValue)}</td></tr>`).join("");
    const sRows = (data?.supplierReturns ?? []).map(r =>
      `<tr><td>${SUPPLIER_REASON_LABELS[r.reason] ?? r.reason}</td><td style="text-align:right">${r.count}</td><td style="text-align:right">${fmtPKR(r.totalValue)}</td></tr>`).join("");
    printReport("Return Reasons Analysis", `
      <h3>Customer Returns</h3>
      <table><thead><tr><th>Reason</th><th class="text-right">Count</th><th class="text-right">Value</th></tr></thead><tbody>${cRows}</tbody></table>
      <br/>
      <h3>Supplier Returns</h3>
      <table><thead><tr><th>Reason</th><th class="text-right">Count</th><th class="text-right">Value</th></tr></thead><tbody>${sRows}</tbody></table>
    `);
  };

  return (
    <div className="space-y-4">
      <DateFilter sd={sd} ed={ed} setSd={setSd} setEd={setEd}>
        <Button variant="outline" size="sm" className="print:hidden" onClick={onPrint}><Printer className="w-4 h-4 mr-1.5" />Print</Button>
      </DateFilter>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Customer Returns */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <RotateCcw className="w-4 h-4" />Customer Return Reasons
              {cTotal > 0 && <Badge variant="secondary">{cTotal} returns</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isFetching && <div className="text-center py-8 text-muted-foreground">Loading…</div>}
            {!isFetching && !(data?.customerReturns?.length) && <div className="text-center py-8 text-muted-foreground">No customer returns in selected period</div>}
            {!isFetching && (data?.customerReturns?.length ?? 0) > 0 && (
              <>
                <div className="h-48 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data!.customerReturns.map(r => ({ name: CUSTOMER_REASON_LABELS[r.reason] ?? r.reason, value: r.count }))}
                        dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                        {data!.customerReturns.map((_, i) => <Cell key={i} fill={REASON_COLORS[i % REASON_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {data!.customerReturns.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>{CUSTOMER_REASON_LABELS[r.reason] ?? r.reason}</TableCell>
                        <TableCell className="text-right font-medium">{r.count}</TableCell>
                        <TableCell className="text-right">{fmtPKR(r.totalValue)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{cTotal > 0 ? Math.round(r.count / cTotal * 100) + "%" : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </CardContent>
        </Card>

        {/* Supplier Returns */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />Supplier Return Reasons
              {sTotal > 0 && <Badge variant="secondary">{sTotal} returns</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isFetching && <div className="text-center py-8 text-muted-foreground">Loading…</div>}
            {!isFetching && !(data?.supplierReturns?.length) && <div className="text-center py-8 text-muted-foreground">No supplier returns in selected period</div>}
            {!isFetching && (data?.supplierReturns?.length ?? 0) > 0 && (
              <>
                <div className="h-48 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data!.supplierReturns.map(r => ({ name: SUPPLIER_REASON_LABELS[r.reason] ?? r.reason, value: r.count }))}
                        dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                        {data!.supplierReturns.map((_, i) => <Cell key={i} fill={REASON_COLORS[i % REASON_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {data!.supplierReturns.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>{SUPPLIER_REASON_LABELS[r.reason] ?? r.reason}</TableCell>
                        <TableCell className="text-right font-medium">{r.count}</TableCell>
                        <TableCell className="text-right">{fmtPKR(r.totalValue)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{sTotal > 0 ? Math.round(r.count / sTotal * 100) + "%" : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Supplier & Communication Reports ────────────────────────────────────────

const TXN_TYPE_LABELS: Record<string, string> = {
  payment_made: "Payment Made", payment_received: "Payment Received",
  advance_paid: "Advance Paid", advance_received: "Advance Received",
  supplier_refund: "Supplier Refund", advance_applied: "Advance Applied",
  adjustment: "Adjustment",
};

function txnDate(v: any) { try { return new Date(v).toISOString().slice(0, 10); } catch { return String(v ?? ""); } }

function SupplierLedgerReport({ sd, ed, setSd, setEd }: { sd: string; ed: string; setSd: (v: string) => void; setEd: (v: string) => void }) {
  const [supplierId, setSupplierId] = useState("");
  const { data, isFetching } = useQuery<any>({
    queryKey: ["supplier-transactions-report", sd, ed, supplierId],
    queryFn: () => apiFetch(`/api/reports/supplier-transactions?startDate=${sd}&endDate=${ed}${supplierId ? `&supplierId=${supplierId}` : ""}`),
  });
  const rows = data?.rows ?? [];
  const totals = data?.totals ?? {};
  const csvExport = () => exportToCsv(rows.map((r: any) => ({ Date: txnDate(r.txnDate), Reference: r.referenceNo, Supplier: r.supplierName, Type: TXN_TYPE_LABELS[r.txnType] ?? r.txnType, Account: r.account, Direction: r.direction, Method: r.paymentMethod, Amount: r.amount, "Bank Ref": r.bankRef ?? "", Notes: r.note ?? "", "By": r.createdByName ?? "" })), `supplier-ledger-${sd}-${ed}.csv`);
  return (
    <div className="space-y-4">
      <DateFilter sd={sd} ed={ed} setSd={setSd} setEd={setEd}>
        <div className="space-y-1.5">
          <Label>Supplier ID (optional)</Label>
          <Input type="number" value={supplierId} onChange={e => setSupplierId(e.target.value)} placeholder="All suppliers" className="w-40" />
        </div>
      </DateFilter>
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Transactions" value={fmt(rows.length)} />
          <KpiCard label="Payments Made" value={fmtPKR(totals.paymentMade)} />
          <KpiCard label="Advances Paid" value={fmtPKR(totals.advancePaid)} />
          <KpiCard label="Payments Received" value={fmtPKR(totals.paymentReceived)} />
        </div>
        <ExportRow onCsv={csvExport} onPrint={() => {
          const trs = rows.map((r: any) => `<tr><td>${txnDate(r.txnDate)}</td><td>${r.referenceNo}</td><td>${r.supplierName ?? ""}</td><td>${TXN_TYPE_LABELS[r.txnType] ?? r.txnType}</td><td>${r.paymentMethod ?? ""}</td><td class="text-right">PKR ${Number(r.amount).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</td></tr>`).join("");
          printReport(`Supplier Ledger: ${sd} to ${ed}`, `<table><thead><tr><th>Date</th><th>Reference</th><th>Supplier</th><th>Type</th><th>Method</th><th class="text-right">Amount</th></tr></thead><tbody>${trs}</tbody></table>`);
        }} />
      </div>
      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Method</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isFetching && <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">Loading…</TableCell></TableRow>}
              {rows.map((r: any, i: number) => (
                <TableRow key={i}>
                  <TableCell>{txnDate(r.txnDate)}</TableCell>
                  <TableCell className="font-mono text-xs">{r.referenceNo}</TableCell>
                  <TableCell className="font-medium">{r.supplierName ?? "—"}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{TXN_TYPE_LABELS[r.txnType] ?? r.txnType}</Badge></TableCell>
                  <TableCell><Badge variant="secondary" className="capitalize text-xs">{r.paymentMethod}</Badge></TableCell>
                  <TableCell className={cn("text-right font-medium", r.direction === "credit" ? "text-green-600 dark:text-green-400" : "text-destructive")}>{r.direction === "credit" ? "+" : "−"}{fmtPKR(r.amount)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.note ?? "—"}</TableCell>
                </TableRow>
              ))}
              {!isFetching && !rows.length && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No supplier transactions in selected period</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SupplierPaymentsReport({ sd, ed, setSd, setEd }: { sd: string; ed: string; setSd: (v: string) => void; setEd: (v: string) => void }) {
  const { data, isFetching } = useQuery<any>({
    queryKey: ["supplier-payments-report", sd, ed],
    queryFn: () => apiFetch(`/api/reports/supplier-payments?startDate=${sd}&endDate=${ed}`),
  });
  const rows = data?.rows ?? [];
  const byMethod = data?.byMethod ?? [];
  const csvExport = () => exportToCsv(rows.map((r: any) => ({ Date: txnDate(r.txnDate), Reference: r.referenceNo, Supplier: r.supplierName, Type: TXN_TYPE_LABELS[r.txnType] ?? r.txnType, Method: r.paymentMethod, Amount: r.amount })), `supplier-payments-${sd}-${ed}.csv`);
  return (
    <div className="space-y-4">
      <DateFilter sd={sd} ed={ed} setSd={setSd} setEd={setEd} />
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="grid gap-3 grid-cols-2">
          <KpiCard label="Total Paid" value={fmtPKR(data?.total)} />
          <KpiCard label="Transactions" value={fmt(rows.length)} />
        </div>
        <ExportRow onCsv={csvExport} onPrint={() => {
          const trs = rows.map((r: any) => `<tr><td>${txnDate(r.txnDate)}</td><td>${r.referenceNo}</td><td>${r.supplierName ?? ""}</td><td>${TXN_TYPE_LABELS[r.txnType] ?? r.txnType}</td><td>${r.paymentMethod ?? ""}</td><td class="text-right">PKR ${Number(r.amount).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</td></tr>`).join("");
          printReport(`Supplier Payments / Recovery: ${sd} to ${ed}`, `<table><thead><tr><th>Date</th><th>Reference</th><th>Supplier</th><th>Type</th><th>Method</th><th class="text-right">Amount</th></tr></thead><tbody>${trs}</tbody></table>`);
        }} />
      </div>
      {byMethod.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">By Payment Method</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {byMethod.map((m: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="capitalize font-medium">{m.method}</TableCell>
                    <TableCell className="text-right font-medium">{fmtPKR(m.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Method</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isFetching && <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Loading…</TableCell></TableRow>}
              {rows.map((r: any, i: number) => (
                <TableRow key={i}>
                  <TableCell>{txnDate(r.txnDate)}</TableCell>
                  <TableCell className="font-mono text-xs">{r.referenceNo}</TableCell>
                  <TableCell className="font-medium">{r.supplierName ?? "—"}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{TXN_TYPE_LABELS[r.txnType] ?? r.txnType}</Badge></TableCell>
                  <TableCell><Badge variant="secondary" className="capitalize text-xs">{r.paymentMethod}</Badge></TableCell>
                  <TableCell className="text-right font-medium">{fmtPKR(r.amount)}</TableCell>
                </TableRow>
              ))}
              {!isFetching && !rows.length && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No payments in selected period</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SupplierOutstandingReport() {
  const { data, isFetching } = useQuery<any>({
    queryKey: ["supplier-outstanding-report"],
    queryFn: () => apiFetch("/api/reports/supplier-outstanding"),
  });
  const rows = data?.rows ?? [];
  const totals = data?.totals ?? {};
  const csvExport = () => exportToCsv(rows.map((r: any) => ({ Supplier: r.name, Phone: r.phone ?? "", Payable: r.payable, Advance: r.advance, Net: r.net })), `supplier-outstanding-${format(new Date(), "yyyy-MM-dd")}.csv`);
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="grid gap-3 grid-cols-3">
          <KpiCard label="Total Payable" value={fmtPKR(totals.payable)} />
          <KpiCard label="Total Advance" value={fmtPKR(totals.advance)} />
          <KpiCard label="Net Outstanding" value={fmtPKR(totals.net)} />
        </div>
        <ExportRow onCsv={csvExport} onPrint={() => {
          const trs = rows.map((r: any) => `<tr><td>${r.name}</td><td>${r.phone ?? ""}</td><td class="text-right">PKR ${Number(r.payable).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</td><td class="text-right">PKR ${Number(r.advance).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</td><td class="text-right">PKR ${Number(r.net).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</td></tr>`).join("");
          printReport(`Outstanding Payable — ${format(new Date(), "dd MMM yyyy")}`, `<table><thead><tr><th>Supplier</th><th>Phone</th><th class="text-right">Payable</th><th class="text-right">Advance</th><th class="text-right">Net</th></tr></thead><tbody>${trs}</tbody></table>`);
        }} />
      </div>
      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Supplier</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-right">Payable</TableHead>
              <TableHead className="text-right">Advance</TableHead>
              <TableHead className="text-right">Net Outstanding</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isFetching && <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Loading…</TableCell></TableRow>}
              {rows.map((r: any, i: number) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.phone ?? "—"}</TableCell>
                  <TableCell className="text-right font-medium text-destructive">{r.payable > 0 ? fmtPKR(r.payable) : "—"}</TableCell>
                  <TableCell className="text-right text-green-600 dark:text-green-400">{r.advance > 0 ? fmtPKR(r.advance) : "—"}</TableCell>
                  <TableCell className="text-right font-bold">{fmtPKR(r.net)}</TableCell>
                </TableRow>
              ))}
              {!isFetching && !rows.length && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No outstanding supplier balances</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SupplierAdvancesReport() {
  const { data, isFetching } = useQuery<any>({
    queryKey: ["supplier-advances-report"],
    queryFn: () => apiFetch("/api/reports/supplier-advances"),
  });
  const rows = data?.rows ?? [];
  const csvExport = () => exportToCsv(rows.map((r: any) => ({ Supplier: r.name, Phone: r.phone ?? "", "Advance Balance": r.advanceBalance, "Advance Paid (Lifetime)": r.advancePaidBalance })), `supplier-advances-${format(new Date(), "yyyy-MM-dd")}.csv`);
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="grid gap-3 grid-cols-2">
          <KpiCard label="Suppliers with Advance" value={fmt(rows.length)} />
          <KpiCard label="Total Advance Held" value={fmtPKR(data?.totalAdvance)} />
        </div>
        <ExportRow onCsv={csvExport} onPrint={() => {
          const trs = rows.map((r: any) => `<tr><td>${r.name}</td><td>${r.phone ?? ""}</td><td class="text-right">PKR ${Number(r.advanceBalance).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</td><td class="text-right">PKR ${Number(r.advancePaidBalance).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</td></tr>`).join("");
          printReport(`Supplier Advance Balance — ${format(new Date(), "dd MMM yyyy")}`, `<table><thead><tr><th>Supplier</th><th>Phone</th><th class="text-right">Advance Balance</th><th class="text-right">Advance Paid (Lifetime)</th></tr></thead><tbody>${trs}</tbody></table>`);
        }} />
      </div>
      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Supplier</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-right">Advance Balance</TableHead>
              <TableHead className="text-right">Advance Paid (Lifetime)</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isFetching && <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">Loading…</TableCell></TableRow>}
              {rows.map((r: any, i: number) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.phone ?? "—"}</TableCell>
                  <TableCell className="text-right font-bold text-green-600 dark:text-green-400">{fmtPKR(r.advanceBalance)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{fmtPKR(r.advancePaidBalance)}</TableCell>
                </TableRow>
              ))}
              {!isFetching && !rows.length && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No supplier advances held</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function WhatsAppNotificationsReport({ sd, ed, setSd, setEd }: { sd: string; ed: string; setSd: (v: string) => void; setEd: (v: string) => void }) {
  const { data, isFetching } = useQuery<any>({
    queryKey: ["whatsapp-notifications-report", sd, ed],
    queryFn: () => apiFetch(`/api/reports/whatsapp-notifications?startDate=${sd}&endDate=${ed}`),
  });
  const totals = data?.totals ?? {};
  const byTrigger = data?.byTrigger ?? [];
  const byEntity = data?.byEntity ?? [];
  const rows = data?.rows ?? [];
  const csvExport = () => exportToCsv(rows.map((r: any) => ({ Date: txnDate(r.createdAt), Recipient: r.recipientName, Phone: r.phone, Entity: r.entityType, Trigger: r.trigger ?? "manual", Template: r.templateName ?? "", Status: r.status, Provider: r.provider ?? "" })), `whatsapp-notifications-${sd}-${ed}.csv`);
  return (
    <div className="space-y-4">
      <DateFilter sd={sd} ed={ed} setSd={setSd} setEd={setEd} />
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="grid gap-3 grid-cols-3">
          <KpiCard label="Total Messages" value={fmt(totals.total)} />
          <KpiCard label="Sent" value={fmt(totals.sent)} />
          <KpiCard label="Failed" value={fmt(totals.failed)} />
        </div>
        <ExportRow onCsv={csvExport} onPrint={() => {
          const trs = rows.map((r: any) => `<tr><td>${txnDate(r.createdAt)}</td><td>${r.recipientName ?? ""}</td><td>${r.phone ?? ""}</td><td>${r.trigger ?? "manual"}</td><td>${r.status}</td></tr>`).join("");
          printReport(`WhatsApp Notifications: ${sd} to ${ed}`, `
            <div><span class="kpi"><div class="kpi-label">Total</div><div class="kpi-value">${totals.total ?? 0}</div></span><span class="kpi"><div class="kpi-label">Sent</div><div class="kpi-value">${totals.sent ?? 0}</div></span><span class="kpi"><div class="kpi-label">Failed</div><div class="kpi-value">${totals.failed ?? 0}</div></span></div>
            <table><thead><tr><th>Date</th><th>Recipient</th><th>Phone</th><th>Trigger</th><th>Status</th></tr></thead><tbody>${trs}</tbody></table>`);
        }} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">By Trigger</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Trigger</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Sent</TableHead>
                <TableHead className="text-right">Failed</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {isFetching && <TableRow><TableCell colSpan={4} className="text-center py-4">Loading…</TableCell></TableRow>}
                {byTrigger.map((t: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{t.trigger}</TableCell>
                    <TableCell className="text-right">{t.total}</TableCell>
                    <TableCell className="text-right text-green-600">{t.sent}</TableCell>
                    <TableCell className="text-right text-destructive">{t.failed > 0 ? t.failed : "—"}</TableCell>
                  </TableRow>
                ))}
                {!isFetching && !byTrigger.length && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">No data</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">By Entity</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Entity Type</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {byEntity.map((e: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="capitalize font-medium">{e.entityType}</TableCell>
                    <TableCell className="text-right">{e.total}</TableCell>
                  </TableRow>
                ))}
                {!byEntity.length && <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-4">No data</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Trigger</TableHead>
              <TableHead>Template</TableHead>
              <TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isFetching && <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">Loading…</TableCell></TableRow>}
              {rows.map((r: any, i: number) => (
                <TableRow key={i}>
                  <TableCell>{txnDate(r.createdAt)}</TableCell>
                  <TableCell className="font-medium">{r.recipientName ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{r.phone ?? "—"}</TableCell>
                  <TableCell><Badge variant="secondary" className="capitalize text-xs">{r.entityType}</Badge></TableCell>
                  <TableCell className="text-xs">{r.trigger ?? "manual"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.templateName ?? "—"}</TableCell>
                  <TableCell><Badge variant={r.status === "sent" ? "default" : "destructive"} className="text-xs capitalize">{r.status}</Badge></TableCell>
                </TableRow>
              ))}
              {!isFetching && !rows.length && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No messages in selected period</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function MessageDeliveryReport({ sd, ed, setSd, setEd }: { sd: string; ed: string; setSd: (v: string) => void; setEd: (v: string) => void }) {
  const { data, isFetching } = useQuery<any>({
    queryKey: ["whatsapp-delivery-report", sd, ed],
    queryFn: () => apiFetch(`/api/reports/whatsapp-delivery?startDate=${sd}&endDate=${ed}`),
  });
  const byProvider = data?.byProvider ?? [];
  const failures = data?.failures ?? [];
  const csvExport = () => exportToCsv(failures.map((r: any) => ({ Date: txnDate(r.createdAt), Recipient: r.recipientName, Phone: r.phone, Trigger: r.trigger ?? "manual", Template: r.templateName ?? "", Provider: r.provider ?? "", Error: r.error ?? "" })), `message-delivery-failures-${sd}-${ed}.csv`);
  return (
    <div className="space-y-4">
      <DateFilter sd={sd} ed={ed} setSd={setSd} setEd={setEd} />
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="grid gap-3 grid-cols-2">
          <KpiCard label="Providers" value={fmt(byProvider.length)} />
          <KpiCard label="Failures" value={fmt(failures.length)} />
        </div>
        <ExportRow onCsv={csvExport} onPrint={() => {
          const pRows = byProvider.map((p: any) => `<tr><td>${p.provider ?? ""}</td><td class="text-right">${p.total}</td><td class="text-right">${p.sent}</td><td class="text-right">${p.failed}</td></tr>`).join("");
          const fRows = failures.map((r: any) => `<tr><td>${txnDate(r.createdAt)}</td><td>${r.recipientName ?? ""}</td><td>${r.phone ?? ""}</td><td>${r.provider ?? ""}</td><td>${r.error ?? ""}</td></tr>`).join("");
          printReport(`Message Delivery: ${sd} to ${ed}`, `
            <h3>By Provider</h3>
            <table><thead><tr><th>Provider</th><th class="text-right">Total</th><th class="text-right">Sent</th><th class="text-right">Failed</th></tr></thead><tbody>${pRows}</tbody></table>
            <br/>
            <h3>Failures</h3>
            <table><thead><tr><th>Date</th><th>Recipient</th><th>Phone</th><th>Provider</th><th>Error</th></tr></thead><tbody>${fRows}</tbody></table>`);
        }} />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">By Provider</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Provider</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Sent</TableHead>
              <TableHead className="text-right">Failed</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isFetching && <TableRow><TableCell colSpan={4} className="text-center py-4">Loading…</TableCell></TableRow>}
              {byProvider.map((p: any, i: number) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{p.provider ?? "—"}</TableCell>
                  <TableCell className="text-right">{p.total}</TableCell>
                  <TableCell className="text-right text-green-600">{p.sent}</TableCell>
                  <TableCell className="text-right text-destructive">{p.failed > 0 ? p.failed : "—"}</TableCell>
                </TableRow>
              ))}
              {!isFetching && !byProvider.length && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">No delivery data</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-4 h-4" />Failures</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Trigger</TableHead>
              <TableHead>Template</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Error</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isFetching && <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">Loading…</TableCell></TableRow>}
              {failures.map((r: any, i: number) => (
                <TableRow key={i}>
                  <TableCell>{txnDate(r.createdAt)}</TableCell>
                  <TableCell className="font-medium">{r.recipientName ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{r.phone ?? "—"}</TableCell>
                  <TableCell className="text-xs">{r.trigger ?? "manual"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.templateName ?? "—"}</TableCell>
                  <TableCell className="text-xs">{r.provider ?? "—"}</TableCell>
                  <TableCell className="text-xs text-destructive">{r.error ?? "—"}</TableCell>
                </TableRow>
              ))}
              {!isFetching && !failures.length && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No delivery failures in selected period</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function Reports() {
  const [activeReport, setActiveReport] = useState("date-wise");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [sd, setSd] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [ed, setEd] = useState(format(new Date(), "yyyy-MM-dd"));
  const { data: settingsData } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });
  reportSettings = settingsData ?? reportSettings;

  const activeGroup = REPORT_GROUPS.find(g => g.items.some(i => i.id === activeReport));
  const activeItem = activeGroup?.items.find(i => i.id === activeReport);

  const toggleGroup = (id: string) => setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));

  const renderReport = () => {
    switch (activeReport) {
      case "date-wise": return <DateWiseSales sd={sd} ed={ed} setSd={setSd} setEd={setEd} />;
      case "product-wise": return <ProductWiseSales sd={sd} ed={ed} setSd={setSd} setEd={setEd} />;
      case "customer-wise": return <CustomerWiseSales sd={sd} ed={ed} setSd={setSd} setEd={setEd} />;
      case "counter": return <SalesList sd={sd} ed={ed} setSd={setSd} setEd={setEd} filterFn={s => !s.customerId} title="Counter Sales" emptyMsg="No counter sales in selected period" />;
      case "cash-sales": return <SalesList sd={sd} ed={ed} setSd={setSd} setEd={setEd} filterFn={s => s.paymentMethod === "cash"} title="Cash Sales" emptyMsg="No cash sales in selected period" />;
      case "credit-sales": return <SalesList sd={sd} ed={ed} setSd={setSd} setEd={setEd} filterFn={s => Number(s.dueAmount) > 0} title="Credit Sales" emptyMsg="No credit sales in selected period" />;
      case "sales-returns": return <SalesReturns sd={sd} ed={ed} setSd={setSd} setEd={setEd} />;
      case "discounts": return <DiscountReport sd={sd} ed={ed} setSd={setSd} setEd={setEd} />;
      case "date-wise-purchase": return <PurchasesReport sd={sd} ed={ed} setSd={setSd} setEd={setEd} />;
      case "supplier-wise": return <SupplierWisePurchases sd={sd} ed={ed} setSd={setSd} setEd={setEd} />;
      case "product-wise-purchase": return <ProductWisePurchases sd={sd} ed={ed} setSd={setSd} setEd={setEd} />;
      case "supplier-ledger": return <SupplierLedgerReport sd={sd} ed={ed} setSd={setSd} setEd={setEd} />;
      case "supplier-payments": return <SupplierPaymentsReport sd={sd} ed={ed} setSd={setSd} setEd={setEd} />;
      case "stock": return <StockReport />;
      case "low-stock": return <LowStockReport />;
      case "stock-movements": return <StockMovements sd={sd} ed={ed} setSd={setSd} setEd={setEd} />;
      case "pl": return <PLReport sd={sd} ed={ed} setSd={setSd} setEd={setEd} />;
      case "receivables": return <ReceivablesReport />;
      case "payables": return <PayablesReport />;
      case "supplier-outstanding": return <SupplierOutstandingReport />;
      case "supplier-advances": return <SupplierAdvancesReport />;
      case "expenses": return <ExpenseReport sd={sd} ed={ed} setSd={setSd} setEd={setEd} />;
      case "salary": return <SalaryReport />;
      case "cash-handling": return <CashHandlingReport sd={sd} ed={ed} setSd={setSd} setEd={setEd} />;
      case "business-analysis": return <BusinessAnalysis sd={sd} ed={ed} setSd={setSd} setEd={setEd} />;
      case "expiry-products": return <ExpiryProductsReport />;
      case "return-reasons": return <ReturnReasonsReport sd={sd} ed={ed} setSd={setSd} setEd={setEd} />;
      case "whatsapp-notifications": return <WhatsAppNotificationsReport sd={sd} ed={ed} setSd={setSd} setEd={setEd} />;
      case "message-delivery": return <MessageDeliveryReport sd={sd} ed={ed} setSd={setSd} setEd={setEd} />;
      default: return null;
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Left sidebar */}
      <aside className="w-56 shrink-0 border-r bg-sidebar/40 overflow-y-auto py-3 px-2 flex flex-col gap-1 print:hidden">
        {REPORT_GROUPS.map(group => {
          const Icon = group.icon;
          const isOpen = !collapsed[group.id];
          const hasActive = group.items.some(i => i.id === activeReport);
          return (
            <div key={group.id}>
              <button
                onClick={() => toggleGroup(group.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm font-semibold transition-colors",
                  hasActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-left">{group.label}</span>
                {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
              {isOpen && (
                <div className="ml-6 mt-0.5 flex flex-col gap-0.5">
                  {group.items.map(item => (
                    <button
                      key={item.id}
                      onClick={() => setActiveReport(item.id)}
                      className={cn(
                        "w-full text-left px-2 py-1.5 rounded text-sm transition-colors",
                        activeReport === item.id
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </aside>

      {/* Right content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{activeGroup?.label}</p>
              <h1 className="text-2xl font-bold tracking-tight">{activeItem?.label ?? "Reports"}</h1>
            </div>
          </div>
          {renderReport()}
        </div>
      </main>
    </div>
  );
}
