// Pure ledger reconciliation used by both the customer and supplier ledger
// routes. Kept free of any DB/driver imports so it can be unit-tested directly.
//
// Returns are kept in their OWN column (never lumped into "credit"): a sales or
// purchase return is goods coming back, not a payment, so it must not inflate
// the payments/credit total. It still reduces the running balance.

export interface RawLedgerEntry {
  id: number | string;
  reference: string;
  date: unknown;
  // "return" marks a sales/purchase return row; anything else is a normal
  // sale/purchase/payment entry.
  type: string;
  debit: number | string;
  // For a return row this holds the return total; for other rows it is the
  // payment/credit amount.
  credit: number | string;
  method?: string | null;
  note?: string | null;
}

export interface LedgerRow {
  id: number;
  reference: string;
  date: unknown;
  type: string;
  method: string | null;
  note: string | null;
  debit: number;
  credit: number;
  returns: number;
  balance: number;
}

export interface ComputedLedger {
  rows: LedgerRow[];
  totalDebit: number;
  totalCredit: number;
  totalReturns: number;
  closingBalance: number;
}

export function computeLedgerRows(merged: RawLedgerEntry[], openingBalance: number): ComputedLedger {
  let runningBalance = openingBalance;
  const rows: LedgerRow[] = merged.map(t => {
    const isReturn = t.type === "return";
    const debit = Number(t.debit);
    const returns = isReturn ? Number(t.credit) : 0;
    const credit = isReturn ? 0 : Number(t.credit);
    runningBalance = runningBalance + debit - credit - returns;
    return {
      id: Number(t.id),
      reference: t.reference,
      date: t.date,
      type: t.type,
      method: t.method ?? null,
      note: t.note ?? null,
      debit,
      credit,
      returns,
      balance: runningBalance,
    };
  });

  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
  const totalReturns = rows.reduce((s, r) => s + r.returns, 0);
  const closingBalance = openingBalance + totalDebit - totalCredit - totalReturns;

  return { rows, totalDebit, totalCredit, totalReturns, closingBalance };
}
