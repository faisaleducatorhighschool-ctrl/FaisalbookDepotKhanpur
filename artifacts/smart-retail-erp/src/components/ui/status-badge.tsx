export function StatusBadge({ status }: { status: string }) {
  if (!status) return null;
  const variants: Record<string, string> = {
    active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    inactive: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    delivered: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    received: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    draft: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    settled: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    collected: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    submitted: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    low_stock: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    in_stock: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    out_of_stock: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };
  const cls = variants[status.toLowerCase()] || "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{status.replace(/_/g, " ")}</span>;
}
