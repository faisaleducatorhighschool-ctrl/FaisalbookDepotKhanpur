import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ledgerPrimaryAmount,
  ledgerReceiptRows,
  ledgerTxnReceiptText,
  printLedgerTxnReceipt,
  exportLedgerTxnPdf,
  ledgerRowToCsvRecord,
  buildCsv,
  type PrintMode,
  type LedgerReceipt,
} from "./print-invoice.ts";

// A return statement line as Ledger.tsx builds it for per-row receipts: the
// amount lives in `returns` (debit/credit are 0). The fixed code must surface
// that amount everywhere — a regression here would print/export PKR 0.
const customerReturn: LedgerReceipt = {
  reference: "SR-001",
  date: "2026-01-15T10:00:00Z",
  type: "Sales Return",
  debit: 0,
  credit: 0,
  returns: 1500,
  balance: -1500,
  entityName: "Ali Khan",
  entityType: "Customer",
};

const supplierReturn: LedgerReceipt = {
  reference: "PR-001",
  date: "2026-01-16T10:00:00Z",
  type: "Purchase Return",
  debit: 0,
  credit: 0,
  returns: 2750,
  balance: -2750,
  entityName: "Acme Supplies",
  entityType: "Supplier",
};

// Captures the HTML a print function writes to the popup window, without a DOM:
// stub window.open to return a fake window whose document collects writes.
function captureReceiptHtml(run: () => void): string {
  let html = "";
  const fakeWin = {
    document: { open() {}, write(chunk: string) { html += chunk; }, close() {} },
  };
  const g = globalThis as { window?: unknown };
  const original = g.window;
  g.window = { open: () => fakeWin };
  try {
    run();
  } finally {
    g.window = original;
  }
  return html;
}

function rowsContain(rows: [string, string][], pair: [string, string]): boolean {
  return rows.some(([k, v]) => k === pair[0] && v === pair[1]);
}

describe("ledgerPrimaryAmount — return rows surface the return amount", () => {
  it("falls back to the returns field when debit and credit are 0", () => {
    assert.strictEqual(ledgerPrimaryAmount(customerReturn), 1500);
    assert.strictEqual(ledgerPrimaryAmount(supplierReturn), 2750);
  });

  it("never reports a return as 0", () => {
    assert.notStrictEqual(ledgerPrimaryAmount(customerReturn), 0);
    assert.notStrictEqual(ledgerPrimaryAmount(supplierReturn), 0);
  });

  it("still prefers an explicit amount, then debit, then credit", () => {
    assert.strictEqual(ledgerPrimaryAmount({ amount: 99, debit: 1, credit: 2, returns: 3 }), 99);
    assert.strictEqual(ledgerPrimaryAmount({ debit: 7, credit: 2, returns: 3 }), 7);
    assert.strictEqual(ledgerPrimaryAmount({ debit: 0, credit: 5, returns: 3 }), 5);
  });
});

describe("ledgerReceiptRows — labels and amounts", () => {
  it("labels a customer return 'Sales Return' with its amount", () => {
    const rows = ledgerReceiptRows(customerReturn);
    assert.ok(rowsContain(rows, ["Sales Return", "PKR 1,500.00"]));
  });

  it("labels a supplier return 'Purchase Return' with its amount", () => {
    const rows = ledgerReceiptRows(supplierReturn);
    assert.ok(rowsContain(rows, ["Purchase Return", "PKR 2,750.00"]));
  });
});

describe("printed receipts (58mm / 80mm / A4) and PDF show the return amount", () => {
  const modes: PrintMode[] = ["thermal-58", "thermal-80", "a4"];

  for (const mode of modes) {
    it(`customer return prints its amount and label at ${mode}`, () => {
      const html = captureReceiptHtml(() => printLedgerTxnReceipt(customerReturn, {}, mode));
      assert.ok(html.includes("PKR 1,500.00"));
      assert.ok(html.includes("Sales Return"));
      assert.ok(!html.includes("PKR 0.00"));
    });

    it(`supplier return prints its amount and label at ${mode}`, () => {
      const html = captureReceiptHtml(() => printLedgerTxnReceipt(supplierReturn, {}, mode));
      assert.ok(html.includes("PKR 2,750.00"));
      assert.ok(html.includes("Purchase Return"));
      assert.ok(!html.includes("PKR 0.00"));
    });
  }

  it("PDF export (A4) shows the return amount", () => {
    const html = captureReceiptHtml(() => exportLedgerTxnPdf(customerReturn, {}));
    assert.ok(html.includes("PKR 1,500.00"));
    assert.ok(html.includes("Sales Return"));
  });
});

describe("WhatsApp share text shows the return amount", () => {
  it("customer return text carries the amount, not 0", () => {
    const text = ledgerTxnReceiptText(customerReturn, { storeName: "Tech Mentor" });
    assert.ok(text.includes("Amount: PKR 1,500.00"));
    assert.ok(!text.includes("Amount: PKR 0.00"));
  });

  it("supplier return text carries the amount", () => {
    const text = ledgerTxnReceiptText(supplierReturn);
    assert.ok(text.includes("Amount: PKR 2,750.00"));
  });
});

describe("CSV export carries the return amount in its own column", () => {
  // Raw statement rows as the API returns them (type "return", returns field set).
  const rawCustomerReturn = {
    date: "2026-01-15T10:00:00Z",
    reference: "SR-001",
    type: "return",
    debit: 0,
    credit: 0,
    returns: 1500,
    balance: -1500,
  };
  const rawSupplierReturn = {
    date: "2026-01-16T10:00:00Z",
    reference: "PR-001",
    type: "return",
    debit: 0,
    credit: 0,
    returns: 2750,
    balance: -2750,
  };

  it("maps the return amount into the Returns column (not 0)", () => {
    assert.strictEqual(ledgerRowToCsvRecord(rawCustomerReturn).Returns, 1500);
    assert.strictEqual(ledgerRowToCsvRecord(rawSupplierReturn).Returns, 2750);
  });

  it("serializes the return amount into the CSV string", () => {
    const csv = buildCsv([
      ledgerRowToCsvRecord(rawCustomerReturn),
      ledgerRowToCsvRecord(rawSupplierReturn),
    ]);
    assert.ok(csv.includes("Returns"));
    assert.ok(csv.includes("1500"));
    assert.ok(csv.includes("2750"));
  });
});
