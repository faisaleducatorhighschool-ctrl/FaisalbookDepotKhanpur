export const fmt = (n: number | string | undefined | null) => {
  if (n === undefined || n === null) return "0";
  return typeof n === "string" ? parseFloat(n).toLocaleString() : n.toLocaleString();
};

export const fmtPKR = (n: number | string | undefined | null) => `PKR ${fmt(n)}`;
