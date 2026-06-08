export type PrintMode = "a4" | "thermal-80" | "thermal-58";

function esc(v: unknown): string {
  return String(v ?? "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function fmt(n: unknown): string {
  return Number(n || 0).toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Shared branding for all printed documents ────────────────────────────────
// CSS shared by reports / statements (the invoice has its own inline styles).
export const BRAND_PRINT_CSS = `
  .brand-header{text-align:center;border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:14px;}
  .brand-logo{max-width:72px;max-height:72px;object-fit:contain;display:block;margin:0 auto 6px;}
  .brand-name{font-size:22px;font-weight:bold;letter-spacing:1px;}
  .brand-sub{font-size:12px;color:#444;margin-top:1px;}
  .brand-doclabel{margin-top:6px;font-weight:bold;font-size:14px;letter-spacing:1px;color:#000;}
  .pay-footer{margin-top:18px;border-top:1px dashed #999;padding-top:8px;page-break-inside:avoid;}
  .pay-title-main{font-weight:bold;font-size:12px;margin-bottom:4px;}
  .pay-grid{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;}
  .pay-text{font-size:11px;line-height:1.6;}
  .pay-qr-col img{width:96px;height:96px;object-fit:contain;}
  .pay-qr{width:80px;height:80px;object-fit:contain;display:block;margin:6px auto 0;}
`;

// Centered shop header: logo, name, address, phone/WhatsApp, email + optional label.
export function buildBrandHeader(settings: any, docLabel?: string): string {
  const name = esc(settings?.storeName || "Tech Mentor ERP & POS");
  const logo = settings?.logoUrl ? String(settings.logoUrl) : "";
  const addr = esc(settings?.storeAddress || "");
  const phone = esc(settings?.storePhone || "");
  const wa = esc(settings?.whatsappNumber || "");
  const email = esc(settings?.storeEmail || "");
  const contact = [phone && `Tel: ${phone}`, wa && `WhatsApp: ${wa}`, email].filter(Boolean).join("  |  ");
  return `<div class="brand-header">
    ${logo ? `<img class="brand-logo" src="${logo}" alt="" />` : ""}
    <div class="brand-name">${name}</div>
    ${addr ? `<div class="brand-sub">${addr}</div>` : ""}
    ${contact ? `<div class="brand-sub">${contact}</div>` : ""}
    ${docLabel ? `<div class="brand-doclabel">${esc(docLabel)}</div>` : ""}
  </div>`;
}

// Bank / mobile-payment / QR footer block. Returns "" when nothing is configured.
export function buildPaymentDetails(settings: any, thermal = false): string {
  const bankName = esc(settings?.bankName || "");
  const bankTitle = esc(settings?.bankAccountTitle || "");
  const bankAcct = esc(settings?.bankAccount || "");
  const iban = esc(settings?.bankIban || "");
  const branch = esc(settings?.bankBranchCode || "");
  const jazz = esc(settings?.jazzcashNumber || "");
  const easy = esc(settings?.easypaisaNumber || "");
  const qr = settings?.qrCodeUrl ? String(settings.qrCodeUrl) : "";
  const hasBank = !!(bankName || bankAcct || iban);
  const hasMobile = !!(jazz || easy);
  if (!hasBank && !hasMobile && !qr) return "";

  const lines: string[] = [];
  if (hasBank) {
    const head = [bankName, bankTitle].filter(Boolean).join(" — ");
    if (head) lines.push(`<b>Bank:</b> ${head}`);
    if (bankAcct) lines.push(`Account #: ${bankAcct}`);
    if (iban) lines.push(`IBAN: ${iban}`);
    if (branch) lines.push(`Branch Code: ${branch}`);
  }
  if (jazz) lines.push(`<b>JazzCash:</b> ${jazz}`);
  if (easy) lines.push(`<b>EasyPaisa:</b> ${easy}`);

  if (thermal) {
    return `<div class="pay-footer">
      <div class="pay-title-main">Payment Details</div>
      ${lines.map(l => `<div>${l}</div>`).join("")}
      ${qr ? `<img class="pay-qr" src="${qr}" alt="QR" />` : ""}
    </div>`;
  }
  const textCol = `<div class="pay-text">${lines.map(l => `<div>${l}</div>`).join("")}</div>`;
  const qrCol = qr ? `<div class="pay-qr-col"><img src="${qr}" alt="QR" /></div>` : "";
  return `<div class="pay-footer">
    <div class="pay-title-main">Payment Details</div>
    <div class="pay-grid">${textCol}${qrCol}</div>
  </div>`;
}

export function printSaleInvoice(sale: any, settings: any, mode: PrintMode = "a4", docLabel = "SALES INVOICE") {
  const thermal = mode !== "a4";
  const width = mode === "thermal-58" ? "58mm" : mode === "thermal-80" ? "80mm" : "210mm";
  const fontSize = thermal ? "11px" : "13px";
  const font = thermal ? "monospace" : "Arial, sans-serif";
  const headSize = thermal ? "15px" : "22px";
  const borderStyle = thermal ? "1px dashed #000" : "2px solid #000";

  const items: any[] = sale.items || [];
  const itemRows = items.map((it: any, i: number) => {
    const lineDisc = Number(it.discount || 0);
    const lineTotal = it.quantity * Number(it.price) - lineDisc;
    return `
      <tr>
        <td>${i + 1}</td>
        <td>${esc(it.productName)}</td>
        <td style="text-align:right">${it.quantity}</td>
        <td style="text-align:right">${fmt(it.price)}</td>
        ${!thermal ? `<td style="text-align:right">${lineDisc > 0 ? fmt(lineDisc) : "-"}</td>` : ""}
        <td style="text-align:right">${fmt(lineTotal)}</td>
      </tr>`;
  }).join("");

  const now = new Date().toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" });
  const saleDate = sale.createdAt
    ? new Date(sale.createdAt).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" })
    : now;

  const storeName = esc(settings?.storeName || "Tech Mentor ERP & POS");
  const storeAddr = esc(settings?.storeAddress || "");
  const storePhone = esc(settings?.storePhone || "");
  const storeWa = esc(settings?.whatsappNumber || "");
  const storeEmail = esc(settings?.storeEmail || "");
  const storeLogo = settings?.logoUrl ? String(settings.logoUrl) : "";
  const currency = esc(settings?.currency || "PKR");

  const dueAmt = Number(sale.dueAmount || 0);
  const changeAmt = dueAmt < 0 ? Math.abs(dueAmt) : 0;
  const actualDue = dueAmt > 0 ? dueAmt : 0;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${esc(sale.invoiceNumber)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: ${font};
      font-size: ${fontSize};
      width: ${width};
      margin: 0 auto;
      padding: ${thermal ? "3mm 2mm" : "12mm 15mm"};
      color: #000;
      background: #fff;
    }
    .header { text-align: center; border-bottom: ${borderStyle}; padding-bottom: 8px; margin-bottom: 10px; }
    .store-name { font-size: ${headSize}; font-weight: bold; letter-spacing: 1px; }
    .store-sub { font-size: ${thermal ? "10px" : "12px"}; color: #444; }
    .invoice-label { font-size: ${thermal ? "13px" : "16px"}; font-weight: bold; margin-top: 6px; letter-spacing: 2px; }
    .meta { margin: 8px 0; }
    .meta-row { display: flex; justify-content: space-between; margin: 2px 0; font-size: ${thermal ? "10px" : "12px"}; }
    .divider { border: none; border-top: ${borderStyle}; margin: 8px 0; }
    .dashed { border-top-style: dashed; }
    table { width: 100%; border-collapse: collapse; margin: 6px 0; }
    th { font-size: ${thermal ? "10px" : "12px"}; text-align: left; border-bottom: 1px solid #000; padding: 3px 2px; }
    td { font-size: ${thermal ? "10px" : "12px"}; padding: 3px 2px; border-bottom: 1px dashed #ddd; vertical-align: top; }
    .text-right { text-align: right; }
    .totals { margin-top: 8px; }
    .tot-row { display: flex; justify-content: space-between; padding: 2px 0; font-size: ${thermal ? "11px" : "13px"}; }
    .tot-final { font-size: ${thermal ? "14px" : "18px"}; font-weight: bold; border-top: 2px solid #000; margin-top: 4px; padding-top: 4px; }
    .due-row { color: #c00; }
    .change-row { color: #090; }
    .footer { text-align: center; margin-top: 12px; font-size: ${thermal ? "9px" : "11px"}; color: #666; border-top: 1px dashed #ccc; padding-top: 8px; }
    @media print { @page { size: ${width} auto; margin: 0; } body { padding: ${thermal ? "2mm" : "10mm"}; } }
    ${BRAND_PRINT_CSS}
  </style>
</head>
<body>
  <div class="header">
    ${storeLogo ? `<img src="${storeLogo}" alt="" style="max-width:${thermal ? 44 : 64}px;max-height:${thermal ? 44 : 64}px;object-fit:contain;display:block;margin:0 auto 4px;" />` : ""}
    <div class="store-name">${storeName}</div>
    ${storeAddr ? `<div class="store-sub">${storeAddr}</div>` : ""}
    ${storePhone ? `<div class="store-sub">Tel: ${storePhone}${storeWa ? `  |  WhatsApp: ${storeWa}` : ""}</div>` : (storeWa ? `<div class="store-sub">WhatsApp: ${storeWa}</div>` : "")}
    ${storeEmail ? `<div class="store-sub">${storeEmail}</div>` : ""}
    <div class="invoice-label">${esc(docLabel)}</div>
  </div>

  <div class="meta">
    <div class="meta-row"><span><b>Invoice #:</b></span><span>${esc(sale.invoiceNumber)}</span></div>
    <div class="meta-row"><span><b>Date:</b></span><span>${saleDate}</span></div>
    <div class="meta-row"><span><b>Customer:</b></span><span>${esc(sale.customerName || "Walk-in Customer")}</span></div>
    <div class="meta-row"><span><b>Payment:</b></span><span>${esc(sale.paymentMethod)}</span></div>
    <div class="meta-row"><span><b>Type:</b></span><span>${esc(sale.type)}</span></div>
  </div>

  <hr class="divider">

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Product</th>
        <th class="text-right">Qty</th>
        <th class="text-right">Rate</th>
        ${!thermal ? '<th class="text-right">Disc</th>' : ""}
        <th class="text-right">Amount</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <hr class="divider dashed">

  <div class="totals">
    <div class="tot-row"><span>Subtotal (${currency}):</span><span>${fmt(sale.subtotal)}</span></div>
    ${Number(sale.discount) > 0 ? `<div class="tot-row"><span>Discount:</span><span>- ${fmt(sale.discount)}</span></div>` : ""}
    ${Number(sale.tax) > 0 ? `<div class="tot-row"><span>Tax:</span><span>+ ${fmt(sale.tax)}</span></div>` : ""}
    <div class="tot-row tot-final"><span>TOTAL (${currency}):</span><span>${fmt(sale.totalAmount)}</span></div>
    <div class="tot-row"><span>Paid:</span><span>${fmt(sale.paidAmount)}</span></div>
    ${actualDue > 0 ? `<div class="tot-row due-row"><span>Due:</span><span>${fmt(actualDue)}</span></div>` : ""}
    ${changeAmt > 0 ? `<div class="tot-row change-row"><span>Change:</span><span>${fmt(changeAmt)}</span></div>` : ""}
  </div>

  ${buildPaymentDetails(settings, thermal)}

  <div class="footer">
    <p>Thank you for shopping with us!</p>
    <p>Printed: ${now}</p>
  </div>
  <script>window.onload = function(){ window.print(); }</script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) {
    alert("Please allow popups to print invoices.");
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}

// Printable receipt for a single customer transaction (payment / advance / adjustment).
export function printTransactionReceipt(txn: any, settings: any) {
  const label =
    txn.txnType === "payment_received" ? "PAYMENT RECEIPT"
    : txn.txnType === "advance_deposit" ? "ADVANCE DEPOSIT RECEIPT"
    : txn.txnType === "advance_paid" ? "ADVANCE REFUND RECEIPT"
    : txn.txnType === "advance_applied" ? "ADVANCE APPLIED RECEIPT"
    : "ACCOUNT ADJUSTMENT";
  const prettyType = String(txn.txnType || "").replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
  const dirText = txn.direction === "debit" ? "Debit (charge)" : "Credit (in your favour)";

  const rows: [string, string][] = [
    ["Receipt No", esc(txn.referenceNo)],
    ["Date", new Date(txn.txnDate).toLocaleString("en-PK")],
    ["Customer", esc(txn.customerName)],
    txn.customerPhone ? ["Phone", esc(txn.customerPhone)] : null,
    ["Type", prettyType],
    txn.txnType === "adjustment" ? ["Direction", dirText] : null,
    txn.paymentMethod ? ["Method", esc(String(txn.paymentMethod).toUpperCase())] : null,
    txn.bankRef ? ["Bank / Cheque Ref", esc(txn.bankRef)] : null,
    txn.note ? ["Note", esc(txn.note)] : null,
  ].filter(Boolean) as [string, string][];

  const win = window.open("", "_blank", "width=420,height=640");
  if (!win) { alert("Allow popups to print the receipt."); return; }
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${esc(txn.referenceNo)}</title>
  <style>
    body{font-family:Arial,sans-serif;width:80mm;margin:0 auto;padding:6mm 5mm;color:#000;background:#fff;}
    .amount{text-align:center;margin:10px 0 12px;}
    .amount .lbl{font-size:11px;color:#666;text-transform:uppercase;letter-spacing:0.5px;}
    .amount .val{font-size:26px;font-weight:800;margin-top:2px;}
    table{width:100%;border-collapse:collapse;font-size:12px;}
    td{padding:4px 0;vertical-align:top;}
    td.k{color:#666;width:42%;} td.v{text-align:right;font-weight:600;}
    .thanks{text-align:center;font-size:11px;color:#555;margin-top:14px;border-top:1px dashed #999;padding-top:8px;}
    @media print{@page{margin:0;size:80mm auto;}}
    ${BRAND_PRINT_CSS}
  </style></head><body>
  ${buildBrandHeader(settings, label)}
  <div class="amount"><div class="lbl">Amount</div><div class="val">PKR ${fmt(txn.amount)}</div></div>
  <table>${rows.map(([k, v]) => `<tr><td class="k">${k}</td><td class="v">${v}</td></tr>`).join("")}</table>
  ${buildPaymentDetails(settings, true)}
  <div class="thanks">Thank you!</div>
  <script>window.onload=function(){window.print()}<\/script>
  </body></html>`);
  win.document.close();
}

// A single ledger row (statement line) used for per-transaction receipts/sharing.
export type LedgerReceipt = {
  reference?: string;
  date?: string | number | Date;
  type?: string;
  debit?: number;
  credit?: number;
  returns?: number;
  balance?: number;
  amount?: number;
  entityName?: string;
  entityType?: string;
};

export function ledgerPrimaryAmount(txn: LedgerReceipt): number {
  if (txn.amount != null) return Number(txn.amount);
  const debit = Number(txn.debit ?? 0);
  if (debit > 0) return debit;
  const credit = Number(txn.credit ?? 0);
  return credit > 0 ? credit : Number(txn.returns ?? 0);
}

export function ledgerReceiptRows(txn: LedgerReceipt): [string, string][] {
  const bal = Number(txn.balance ?? 0);
  const returnLabel = String(txn.entityType || "").toLowerCase().startsWith("customer") ? "Sales Return" : "Purchase Return";
  const rows: ([string, string] | null)[] = [
    txn.reference ? ["Reference", esc(txn.reference)] : null,
    txn.date ? ["Date", new Date(txn.date).toLocaleString("en-PK")] : null,
    txn.entityName ? [esc(txn.entityType || "Account"), esc(txn.entityName)] : null,
    txn.type ? ["Type", esc(String(txn.type).replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()))] : null,
    Number(txn.debit ?? 0) > 0 ? ["Debit", `PKR ${fmt(txn.debit)}`] : null,
    Number(txn.credit ?? 0) > 0 ? ["Credit", `PKR ${fmt(txn.credit)}`] : null,
    Number(txn.returns ?? 0) > 0 ? [returnLabel, `PKR ${fmt(txn.returns)}`] : null,
    txn.balance != null ? ["Balance", `PKR ${fmt(Math.abs(bal))} ${bal >= 0 ? "Dr" : "Cr"}`] : null,
  ];
  return rows.filter(Boolean) as [string, string][];
}

// Printable receipt for a single ledger transaction, in 58mm / 80mm / A4.
export function printLedgerTxnReceipt(txn: LedgerReceipt, settings: any, mode: PrintMode = "thermal-80") {
  const thermal = mode !== "a4";
  const width = mode === "thermal-58" ? "58mm" : mode === "thermal-80" ? "80mm" : "210mm";
  const pad = mode === "a4" ? "12mm 15mm" : "6mm 5mm";
  const font = thermal ? "monospace" : "Arial, sans-serif";
  const winW = mode === "a4" ? 900 : 420;
  const rows = ledgerReceiptRows(txn);
  const primary = ledgerPrimaryAmount(txn);

  const win = window.open("", "_blank", `width=${winW},height=700`);
  if (!win) { alert("Allow popups to print the receipt."); return; }
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${esc(txn.reference || "Ledger Receipt")}</title>
  <style>
    body{font-family:${font};width:${width};margin:0 auto;padding:${pad};color:#000;background:#fff;}
    .amount{text-align:center;margin:10px 0 12px;}
    .amount .lbl{font-size:11px;color:#666;text-transform:uppercase;letter-spacing:0.5px;}
    .amount .val{font-size:${thermal ? "24px" : "30px"};font-weight:800;margin-top:2px;}
    table{width:100%;border-collapse:collapse;font-size:${thermal ? "12px" : "13px"};}
    td{padding:4px 0;vertical-align:top;}
    td.k{color:#666;width:42%;} td.v{text-align:right;font-weight:600;}
    .thanks{text-align:center;font-size:11px;color:#555;margin-top:14px;border-top:1px dashed #999;padding-top:8px;}
    @media print{@page{margin:${thermal ? "0" : "10mm"};size:${width} auto;}}
    ${BRAND_PRINT_CSS}
  </style></head><body>
  ${buildBrandHeader(settings, "LEDGER TRANSACTION")}
  <div class="amount"><div class="lbl">Amount</div><div class="val">PKR ${fmt(primary)}</div></div>
  <table>${rows.map(([k, v]) => `<tr><td class="k">${k}</td><td class="v">${v}</td></tr>`).join("")}</table>
  ${buildPaymentDetails(settings, thermal)}
  <div class="thanks">Thank you!</div>
  <script>window.onload=function(){window.print()}<\/script>
  </body></html>`);
  win.document.close();
}

// PDF export: opens an A4 print window — the browser's print dialog can "Save as PDF".
export function exportLedgerTxnPdf(txn: LedgerReceipt, settings: any) {
  printLedgerTxnReceipt(txn, settings, "a4");
}

// Plain-text receipt for WhatsApp sharing (https://wa.me/?text=...).
export function ledgerTxnReceiptText(txn: LedgerReceipt, settings?: any): string {
  const storeName = settings?.storeName || "Tech Mentor ERP & POS";
  const primary = ledgerPrimaryAmount(txn);
  const bal = Number(txn.balance ?? 0);
  const lines = [
    `*${storeName}*`,
    "Ledger Transaction",
    txn.entityName ? `${txn.entityType || "Account"}: ${txn.entityName}` : "",
    txn.reference ? `Ref: ${txn.reference}` : "",
    txn.date ? `Date: ${new Date(txn.date).toLocaleString("en-PK")}` : "",
    txn.type ? `Type: ${String(txn.type).replace(/_/g, " ")}` : "",
    `Amount: PKR ${fmt(primary)}`,
    txn.balance != null ? `Balance: PKR ${fmt(Math.abs(bal))} ${bal >= 0 ? "Dr" : "Cr"}` : "",
    "",
    "Thank you!",
  ];
  return lines.filter(Boolean).join("\n");
}

// Maps one ledger statement row to its CSV record. Returns ride in their own
// `Returns` column so a return row exports its return amount (not 0) — the
// `debit`/`credit` columns are NOT where the return value lives.
export function ledgerRowToCsvRecord(r: {
  date: string | number | Date;
  reference?: string;
  type?: string;
  debit?: number;
  credit?: number;
  returns?: number;
  balance?: number;
}): Record<string, unknown> {
  return {
    Date: new Date(r.date).toLocaleDateString("en-PK"),
    Reference: r.reference,
    Type: r.type,
    Debit: r.debit,
    Credit: r.credit,
    Returns: r.returns ?? 0,
    Balance: r.balance,
  };
}

// Serializes records to a CSV string (RFC-4180 quoting). Pure so it can be
// unit-tested without a DOM.
export function buildCsv(data: Record<string, unknown>[]): string {
  if (!data.length) return "";
  const headers = Object.keys(data[0]);
  const rows = data.map(row =>
    headers.map(h => {
      const v = row[h];
      const s = v == null ? "" : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    }).join(",")
  );
  return [headers.join(","), ...rows].join("\r\n");
}

export function exportToCsv(data: Record<string, unknown>[], filename: string) {
  if (!data.length) return;
  const csv = buildCsv(data);
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
