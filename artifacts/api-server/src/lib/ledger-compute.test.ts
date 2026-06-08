import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeLedgerRows, type RawLedgerEntry } from "./ledger-compute.js";

// A reconciliation invariant that must hold for any ledger:
//   Closing = Opening + Debit - Credit - Returns
// and the "credit" total must contain ONLY payments — never a return amount.

describe("computeLedgerRows — customer (Sales Return) ledger", () => {
  const opening = 1000;
  const merged: RawLedgerEntry[] = [
    // normal sale: debit = total, credit = paid
    { id: 1, reference: "INV-001", date: "2026-01-01", type: "sale", debit: 5000, credit: 2000 },
    // sales return: type "return", credit carries the return total
    { id: 2, reference: "SR-001", date: "2026-01-05", type: "return", debit: 0, credit: 1500 },
    // payment received against receivable
    { id: 3, reference: "RCPT-001", date: "2026-01-08", type: "payment_received", debit: 0, credit: 1000 },
  ];

  const result = computeLedgerRows(merged, opening);

  it("puts the return amount in its own column, not in credit", () => {
    const returnRow = result.rows.find(r => r.type === "return")!;
    assert.strictEqual(returnRow.returns, 1500);
    assert.strictEqual(returnRow.credit, 0);
    assert.strictEqual(returnRow.debit, 0);
  });

  it("excludes returns from Total Credit (payments only)", () => {
    // 2000 (paid on sale) + 1000 (payment) = 3000 — the 1500 return is NOT here
    assert.strictEqual(result.totalCredit, 3000);
    assert.strictEqual(result.totalReturns, 1500);
    assert.strictEqual(result.totalDebit, 5000);
  });

  it("reconciles: Closing = Opening + Debit - Credit - Returns", () => {
    assert.strictEqual(
      result.closingBalance,
      opening + result.totalDebit - result.totalCredit - result.totalReturns,
    );
    // 1000 + 5000 - 3000 - 1500 = 1500
    assert.strictEqual(result.closingBalance, 1500);
  });

  it("running balance subtracts the return", () => {
    // after sale: 1000 + 5000 - 2000 = 4000
    assert.strictEqual(result.rows[0].balance, 4000);
    // after return: 4000 - 1500 = 2500
    assert.strictEqual(result.rows[1].balance, 2500);
    // after payment: 2500 - 1000 = 1500
    assert.strictEqual(result.rows[2].balance, 1500);
  });
});

describe("computeLedgerRows — supplier (Purchase Return) ledger", () => {
  const opening = 0;
  const merged: RawLedgerEntry[] = [
    { id: 10, reference: "PO-001", date: "2026-02-01", type: "purchase", debit: 8000, credit: 3000 },
    { id: 11, reference: "PR-001", date: "2026-02-04", type: "return", debit: 0, credit: 2750 },
    { id: 12, reference: "PAY-001", date: "2026-02-09", type: "payment_made", debit: 0, credit: 2000 },
  ];

  const result = computeLedgerRows(merged, opening);

  it("keeps the purchase return out of credit", () => {
    const returnRow = result.rows.find(r => r.type === "return")!;
    assert.strictEqual(returnRow.returns, 2750);
    assert.strictEqual(returnRow.credit, 0);
  });

  it("reconciles totals and closing balance", () => {
    assert.strictEqual(result.totalDebit, 8000);
    assert.strictEqual(result.totalCredit, 5000); // 3000 + 2000, no return
    assert.strictEqual(result.totalReturns, 2750);
    assert.strictEqual(
      result.closingBalance,
      opening + result.totalDebit - result.totalCredit - result.totalReturns,
    );
    assert.strictEqual(result.closingBalance, 250);
  });
});

describe("computeLedgerRows — edge cases", () => {
  it("handles string-typed numeric inputs (decimal casts from MySQL)", () => {
    const result = computeLedgerRows(
      [{ id: "1", reference: "SR-9", date: "2026-03-01", type: "return", debit: "0", credit: "999.50" }],
      0,
    );
    assert.strictEqual(result.rows[0].returns, 999.5);
    assert.strictEqual(result.totalReturns, 999.5);
    assert.strictEqual(result.closingBalance, -999.5);
  });

  it("returns zeroed totals for an empty ledger", () => {
    const result = computeLedgerRows([], 500);
    assert.strictEqual(result.rows.length, 0);
    assert.strictEqual(result.totalDebit, 0);
    assert.strictEqual(result.totalCredit, 0);
    assert.strictEqual(result.totalReturns, 0);
    assert.strictEqual(result.closingBalance, 500);
  });
});
