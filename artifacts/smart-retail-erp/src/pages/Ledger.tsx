import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useListCustomers, useListSuppliers } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Printer, Download, BookOpen, AlertCircle } from "lucide-react";
import { fmtPKR } from "@/lib/format";
import { exportToCsv } from "@/lib/print-invoice";
import { format, subDays } from "date-fns";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
async function apiFetch<T>(url: string): Promise<T> {
  const token = localStorage.getItem("erp_token") ?? "";
  const r = await fetch(`${BASE}${url}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

function printLedger(entityName: string, entityType: string, startDate: string, endDate: string, data: any) {
  const storeName = "Tech Mentor ERP & POS";
  const typeColor: Record<string, string> = { sale: "#1d4ed8", return: "#dc2626", purchase: "#1d4ed8", payment: "#16a34a" };

  const rows = (data.rows ?? []).map((r: any) => `
    <tr>
      <td>${new Date(r.date).toLocaleDateString("en-PK")}</td>
      <td>${r.reference}</td>
      <td class="capitalize">${r.type}</td>
      <td class="text-right" style="color:#dc2626">${r.debit > 0 ? "PKR " + Number(r.debit).toLocaleString("en-PK", { minimumFractionDigits: 2 }) : "—"}</td>
      <td class="text-right" style="color:#16a34a">${r.credit > 0 ? "PKR " + Number(r.credit).toLocaleString("en-PK", { minimumFractionDigits: 2 }) : "—"}</td>
      <td class="text-right" style="font-weight:600;color:${r.balance >= 0 ? "#dc2626" : "#16a34a"}">${r.balance >= 0 ? "PKR " + Number(r.balance).toLocaleString("en-PK", { minimumFractionDigits: 2 }) + " Dr" : "PKR " + Number(Math.abs(r.balance)).toLocaleString("en-PK", { minimumFractionDigits: 2 }) + " Cr"}</td>
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
  </style></head><body>
  <div class="header">
    <div class="store-name">${storeName}</div>
    <div style="margin-top:6px"><h2>${entityType} Ledger</h2><h3>${entityName}</h3></div>
  </div>
  <div class="meta">
    <span>Period: <b>${startDate}</b> to <b>${endDate}</b></span>
    <span>Printed: ${new Date().toLocaleString("en-PK")}</span>
  </div>
  <div class="summary">
    <div class="sum-box"><div class="sum-label">Opening Balance</div><div class="sum-val">PKR ${Number(data.openingBalance).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</div></div>
    <div class="sum-box"><div class="sum-label">Total Debit</div><div class="sum-val" style="color:#dc2626">PKR ${Number(data.totalDebit).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</div></div>
    <div class="sum-box"><div class="sum-label">Total Credit</div><div class="sum-val" style="color:#16a34a">PKR ${Number(data.totalCredit).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</div></div>
    <div class="sum-box"><div class="sum-label">Closing Balance</div><div class="sum-val" style="color:${data.closingBalance >= 0 ? "#dc2626" : "#16a34a"}">PKR ${Number(Math.abs(data.closingBalance)).toLocaleString("en-PK", { minimumFractionDigits: 2 })} ${data.closingBalance >= 0 ? "Dr" : "Cr"}</div></div>
  </div>
  <table>
    <thead><tr><th>Date</th><th>Reference</th><th>Type</th><th class="text-right">Debit</th><th class="text-right">Credit</th><th class="text-right">Balance</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <script>window.onload=function(){window.print()}<\/script>
  </body></html>`);
  win.document.close();
}

function LedgerTable({ data, loading, entityName, entityType, startDate, endDate }: { data: any; loading: boolean; entityName: string; entityType: string; startDate: string; endDate: string }) {
  if (loading) return <p className="text-center text-muted-foreground py-12">Loading ledger…</p>;
  if (!data) return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
      <BookOpen className="w-10 h-10 opacity-40" />
      <p className="text-base">Select a {entityType.toLowerCase()} and date range, then click View Ledger</p>
    </div>
  );

  const csvExport = () => exportToCsv(
    (data.rows ?? []).map((r: any) => ({
      Date: new Date(r.date).toLocaleDateString("en-PK"),
      Reference: r.reference,
      Type: r.type,
      Debit: r.debit,
      Credit: r.credit,
      Balance: r.balance,
    })),
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
          <Button variant="outline" size="sm" onClick={() => printLedger(entityName, entityType, startDate, endDate, data)}><Printer className="w-3.5 h-3.5 mr-1.5" />Print / PDF</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Opening Balance", value: data.openingBalance, color: "" },
          { label: "Total Debit", value: data.totalDebit, color: "text-destructive" },
          { label: "Total Credit", value: data.totalCredit, color: "text-green-600 dark:text-green-400" },
          { label: "Closing Balance", value: Math.abs(data.closingBalance), color: data.closingBalance >= 0 ? "text-destructive" : "text-green-600 dark:text-green-400", sub: data.closingBalance >= 0 ? "Debit (owed to you)" : "Credit (you owe)" },
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
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="bg-muted/50 font-medium text-sm">
                <TableCell colSpan={5}>Opening Balance</TableCell>
                <TableCell className="text-right font-bold">{fmtPKR(data.openingBalance)}</TableCell>
              </TableRow>
              {(data.rows ?? []).map((r: any, i: number) => (
                <TableRow key={i}>
                  <TableCell>{new Date(r.date).toLocaleDateString("en-PK")}</TableCell>
                  <TableCell className="font-mono text-xs">{r.reference}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize text-xs">{r.type}</Badge>
                  </TableCell>
                  <TableCell className="text-right text-destructive">{r.debit > 0 ? fmtPKR(r.debit) : "—"}</TableCell>
                  <TableCell className="text-right text-green-600 dark:text-green-400">{r.credit > 0 ? fmtPKR(r.credit) : "—"}</TableCell>
                  <TableCell className={cn("text-right font-semibold", r.balance >= 0 ? "text-destructive" : "text-green-600 dark:text-green-400")}>
                    {fmtPKR(Math.abs(r.balance))} {r.balance >= 0 ? "Dr" : "Cr"}
                  </TableCell>
                </TableRow>
              ))}
              {(data.rows ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No transactions in selected period</TableCell>
                </TableRow>
              )}
              <TableRow className="bg-muted/50 font-bold text-sm">
                <TableCell colSpan={3}>Closing Balance</TableCell>
                <TableCell className="text-right text-destructive">{fmtPKR(data.totalDebit)}</TableCell>
                <TableCell className="text-right text-green-600 dark:text-green-400">{fmtPKR(data.totalCredit)}</TableCell>
                <TableCell className={cn("text-right", data.closingBalance >= 0 ? "text-destructive" : "text-green-600 dark:text-green-400")}>
                  {fmtPKR(Math.abs(data.closingBalance))} {data.closingBalance >= 0 ? "Dr" : "Cr"}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function CustomerLedger() {
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 90), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedId, setSelectedId] = useState<string>("");
  const [queryId, setQueryId] = useState<string>("");
  const [queryDates, setQueryDates] = useState({ sd: "", ed: "" });

  const { data: customers = [] } = useListCustomers({}, { query: { queryKey: ["customers-for-ledger"] } });

  const { data, isFetching } = useQuery<any>({
    queryKey: ["customer-ledger", queryId, queryDates.sd, queryDates.ed],
    queryFn: () => apiFetch(`/api/ledger/customer/${queryId}?startDate=${queryDates.sd}&endDate=${queryDates.ed}`),
    enabled: !!queryId && !!queryDates.sd && !!queryDates.ed,
  });

  const selectedCustomer = customers.find(c => String(c.id) === selectedId);

  const handleView = () => {
    if (!selectedId) return;
    setQueryId(selectedId);
    setQueryDates({ sd: startDate, ed: endDate });
  };

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
        <div className="flex gap-4 flex-wrap text-sm">
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
      )}

      <LedgerTable
        data={queryId ? data : null}
        loading={isFetching}
        entityName={data?.customer?.name ?? selectedCustomer?.name ?? "Customer"}
        entityType="Customer"
        startDate={queryDates.sd || startDate}
        endDate={queryDates.ed || endDate}
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

  const { data: suppliers = [] } = useListSuppliers({ query: { queryKey: ["suppliers-for-ledger"] } });

  const { data, isFetching } = useQuery<any>({
    queryKey: ["supplier-ledger", queryId, queryDates.sd, queryDates.ed],
    queryFn: () => apiFetch(`/api/ledger/supplier/${queryId}?startDate=${queryDates.sd}&endDate=${queryDates.ed}`),
    enabled: !!queryId && !!queryDates.sd && !!queryDates.ed,
  });

  const selectedSupplier = suppliers.find(s => String(s.id) === selectedId);

  const handleView = () => {
    if (!selectedId) return;
    setQueryId(selectedId);
    setQueryDates({ sd: startDate, ed: endDate });
  };

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
        <div className="flex gap-4 flex-wrap text-sm">
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
      )}

      <LedgerTable
        data={queryId ? data : null}
        loading={isFetching}
        entityName={data?.supplier?.name ?? selectedSupplier?.name ?? "Supplier"}
        entityType="Supplier"
        startDate={queryDates.sd || startDate}
        endDate={queryDates.ed || endDate}
      />
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
        </TabsList>

        <TabsContent value="customer" className="mt-5">
          <CustomerLedger />
        </TabsContent>

        <TabsContent value="supplier" className="mt-5">
          <SupplierLedger />
        </TabsContent>
      </Tabs>
    </div>
  );
}
