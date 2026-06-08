import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Tags, 
  Tag, 
  Boxes, 
  Users, 
  Truck, 
  CreditCard, 
  UsersRound, 
  MapPin, 
  Bike, 
  Wallet, 
  Receipt, 
  BarChart, 
  MessageCircle, 
  Bell, 
  Settings,
  LogOut,
  BookOpen,
  RotateCcw,
  FileSearch,
  Building2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "../AuthProvider";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "../ThemeToggle";
import { useGetSettings, getGetSettingsQueryKey, useGetBusinessModules, getGetBusinessModulesQueryKey } from "@workspace/api-client-react";

// `module` ties a nav item to a toggle in the Business Manager. Items without a
// `module` always show. A module is hidden only when explicitly disabled.
const navItems: { href: string; label: string; icon: typeof LayoutDashboard; module?: string }[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pos", label: "POS Billing", icon: ShoppingCart, module: "pos" },
  { href: "/orders", label: "Orders", icon: Package },
  { href: "/invoices", label: "Invoice Management", icon: FileSearch },
  { href: "/products", label: "Products", icon: Tags },
  { href: "/categories", label: "Categories", icon: Boxes },
  { href: "/brands", label: "Brands", icon: Tag },
  { href: "/inventory", label: "Inventory", icon: Boxes, module: "inventory" },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/suppliers", label: "Suppliers", icon: Truck },
  { href: "/purchases", label: "Purchases", icon: CreditCard },
  { href: "/employees", label: "Employees", icon: UsersRound },
  { href: "/routes", label: "Routes", icon: MapPin },
  { href: "/deliveries", label: "Deliveries", icon: Bike },
  { href: "/cash-collections", label: "Cash Collections", icon: Wallet },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/reports", label: "Reports", icon: BarChart, module: "reports" },
  { href: "/ledger", label: "Ledger", icon: BookOpen },
  { href: "/returns", label: "Returns", icon: RotateCcw },
  { href: "/whatsapp", label: "WhatsApp Center", icon: MessageCircle, module: "whatsapp" },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/business", label: "Business Manager", icon: Building2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();
  const { logout, user } = useAuth();
  const { data: settings } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });
  const { data: businessModules } = useGetBusinessModules({ query: { queryKey: getGetBusinessModulesQueryKey() } });
  const enabledModules = (businessModules as any)?.enabledModules as Record<string, boolean> | undefined;
  const storeName = (settings as any)?.storeName || "Tech Mentor ERP & POS";
  const logoUrl = (settings as any)?.logoUrl;
  const visibleItems = navItems.filter((item) => !item.module || (enabledModules?.[item.module] ?? true));

  return (
    <aside className="w-64 flex flex-col bg-sidebar border-r border-sidebar-border h-screen sticky top-0 text-sidebar-foreground">
      <div className="h-16 flex items-center gap-2 px-6 border-b border-sidebar-border shrink-0">
        {logoUrl && (
          <img src={logoUrl} alt={storeName} className="w-8 h-8 rounded object-contain shrink-0" />
        )}
        <h1 className="font-bold text-lg tracking-tight truncate text-primary">{storeName}</h1>
      </div>
      
      <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1 custom-scrollbar">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
      
      <div className="p-4 border-t border-sidebar-border shrink-0 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-semibold truncate">{user?.name || 'Loading...'}</span>
            <span className="text-xs text-sidebar-foreground/60 truncate">{user?.role || '...'}</span>
          </div>
          <ThemeToggle />
        </div>
        <Button 
          variant="secondary" 
          className="w-full justify-start gap-2 bg-sidebar-accent hover:bg-sidebar-accent/80 text-sidebar-foreground" 
          onClick={logout}
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4" />
          Log out
        </Button>
      </div>
    </aside>
  );
}
