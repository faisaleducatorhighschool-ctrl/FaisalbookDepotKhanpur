export type PrintMode = "a4" | "thermal-80" | "thermal-58";

function esc(v: unknown): string {
  return String(v ?? "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function fmt(n: unknown): string {
  return Number(n || 0).toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function printSaleInvoice(sale: any, settings: any, mode: PrintMode = "a4") {
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
  const storeEmail = esc(settings?.storeEmail || "");
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
  </style>
</head>
<body>
  <div class="header">
    <div class="store-name">${storeName}</div>
    ${storeAddr ? `<div class="store-sub">${storeAddr}</div>` : ""}
    ${storePhone ? `<div class="store-sub">Tel: ${storePhone}</div>` : ""}
    ${storeEmail ? `<div class="store-sub">${storeEmail}</div>` : ""}
    <div class="invoice-label">SALES INVOICE</div>
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

export function exportToCsv(data: Record<string, unknown>[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(row =>
    headers.map(h => {
      const v = row[h];
      const s = v == null ? "" : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    }).join(",")
  );
  const csv = [headers.join(","), ...rows].join("\r\n");
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
