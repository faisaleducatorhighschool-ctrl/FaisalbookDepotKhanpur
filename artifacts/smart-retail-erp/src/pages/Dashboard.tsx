import { useGetDashboardStats, useGetRecentOrders, useGetSalesChart } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import {
  DollarSign, ShoppingCart, Package, Users, Clock, AlertTriangle,
  TrendingUp, Calendar, RotateCcw, AlertCircle, PackageX, Timer,
} from "lucide-react";
import { fmt, fmtPKR } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { data: stats } = useGetDashboardStats();
  const { data: recentOrders } = useGetRecentOrders();
  const { data: salesChart } = useGetSalesChart();

  const hasExpiry =
    Number(stats?.expiredCount ?? 0) > 0 ||
    Number(stats?.expiring7Days ?? 0) > 0 ||
    Number(stats?.expiring15Days ?? 0) > 0 ||
    Number(stats?.expiring30Days ?? 0) > 0;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

      {/* ── Primary KPIs ─────────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Revenue" value={fmtPKR(stats?.totalRevenue)} icon={<DollarSign className="w-4 h-4" />} />
        <StatCard title="Total Orders" value={fmt(stats?.totalOrders)} icon={<ShoppingCart className="w-4 h-4" />} />
        <StatCard title="Total Products" value={fmt(stats?.totalProducts)} icon={<Package className="w-4 h-4" />} />
        <StatCard title="Total Customers" value={fmt(stats?.totalCustomers)} icon={<Users className="w-4 h-4" />} />
        <StatCard title="Pending Orders" value={fmt(stats?.pendingOrders)} icon={<Clock className="w-4 h-4 text-yellow-500" />} />
        <StatCard title="Low Stock Items" value={fmt(stats?.lowStockCount)} icon={<AlertTriangle className="w-4 h-4 text-orange-500" />} />
        <StatCard title="Today's Sales" value={fmtPKR(stats?.todaySales)} icon={<TrendingUp className="w-4 h-4 text-green-500" />} />
        <StatCard title="This Month" value={fmtPKR(stats?.monthSales)} icon={<Calendar className="w-4 h-4 text-blue-500" />} />
      </div>

      {/* ── Expiry Alerts ─────────────────────────────────────────────────── */}
      {(hasExpiry || true) && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Timer className="w-5 h-5 text-destructive" />
            <h2 className="text-lg font-semibold">Expiry Alerts</h2>
            {!hasExpiry && <span className="text-sm text-muted-foreground">(No expiry issues detected)</span>}
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <ExpiryCard
              title="Expired Products"
              value={Number(stats?.expiredCount ?? 0)}
              subtitle="In-stock expired items"
              severity="expired"
              icon={<PackageX className="w-4 h-4" />}
            />
            <ExpiryCard
              title="Expiring in 7 Days"
              value={Number(stats?.expiring7Days ?? 0)}
              subtitle="Critical — act immediately"
              severity="critical"
              icon={<AlertCircle className="w-4 h-4" />}
            />
            <ExpiryCard
              title="Expiring in 15 Days"
              value={Number(stats?.expiring15Days ?? 0)}
              subtitle="Warning — review stock"
              severity="warning"
              icon={<AlertTriangle className="w-4 h-4" />}
            />
            <ExpiryCard
              title="Expiring in 30 Days"
              value={Number(stats?.expiring30Days ?? 0)}
              subtitle={`Near-expiry value: ${fmtPKR(stats?.nearExpiryValue)}`}
              severity="near"
              icon={<Clock className="w-4 h-4" />}
            />
          </div>
        </div>
      )}

      {/* ── Returns & Operations Row ────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Total Returns" value={fmt(stats?.totalReturns)} icon={<RotateCcw className="w-4 h-4 text-purple-500" />} />
        <StatCard title="Out of Stock" value={fmt(stats?.outOfStockCount)} icon={<PackageX className="w-4 h-4 text-red-500" />} />
        <StatCard title="Month Revenue" value={fmtPKR(stats?.monthSales)} icon={<TrendingUp className="w-4 h-4 text-emerald-500" />} />
      </div>

      {/* ── Charts & Recent Orders ────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Sales Overview (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full">
              {salesChart && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesChart} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={(v) => format(new Date(v), 'MMM dd')} />
                    <YAxis tickFormatter={(v) => `Rs ${v}`} />
                    <Tooltip formatter={(value: number) => [fmtPKR(value), "Sales"]} labelFormatter={(l) => format(new Date(l), 'MMM dd, yyyy')} />
                    <Area type="monotone" dataKey="sales" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorSales)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader><CardTitle>Recent Orders</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders?.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">#{order.id}</TableCell>
                    <TableCell>{order.customerId ? `Customer ${order.customerId}` : "Walk-in"}</TableCell>
                    <TableCell>{fmtPKR(order.totalAmount)}</TableCell>
                    <TableCell><StatusBadge status={order.status} /></TableCell>
                  </TableRow>
                ))}
                {!recentOrders?.length && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No recent orders.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: string | undefined; icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value ?? "—"}</div>
      </CardContent>
    </Card>
  );
}

type ExpirySeverity = "expired" | "critical" | "warning" | "near";

const severityStyles: Record<ExpirySeverity, { border: string; bg: string; text: string; badge: string }> = {
  expired:  { border: "border-destructive/60",   bg: "bg-destructive/5",   text: "text-destructive",        badge: "destructive" },
  critical: { border: "border-orange-500/60",    bg: "bg-orange-50 dark:bg-orange-950/20", text: "text-orange-600 dark:text-orange-400", badge: "bg-orange-500" },
  warning:  { border: "border-yellow-500/60",    bg: "bg-yellow-50 dark:bg-yellow-950/20", text: "text-yellow-700 dark:text-yellow-400", badge: "bg-yellow-500" },
  near:     { border: "border-blue-400/60",      bg: "bg-blue-50 dark:bg-blue-950/20",     text: "text-blue-600 dark:text-blue-400",     badge: "bg-blue-500" },
};

function ExpiryCard({ title, value, subtitle, severity, icon }: {
  title: string; value: number; subtitle: string; severity: ExpirySeverity; icon: React.ReactNode;
}) {
  const s = severityStyles[severity];
  const isAlert = value > 0;
  return (
    <Card className={`border-2 ${isAlert ? s.border : "border-border"} ${isAlert ? s.bg : ""} transition-colors`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <span className={isAlert ? s.text : "text-muted-foreground"}>{icon}</span>
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold ${isAlert ? s.text : "text-muted-foreground"}`}>
          {value}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        {isAlert && (
          <Badge variant="outline" className={`mt-2 text-xs ${s.text} border-current`}>
            {severity === "expired" ? "Action Required" : severity === "critical" ? "Critical" : severity === "warning" ? "Warning" : "Monitor"}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
