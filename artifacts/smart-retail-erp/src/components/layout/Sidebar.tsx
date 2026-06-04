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
  RotateCcw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "../AuthProvider";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "../ThemeToggle";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pos", label: "POS Billing", icon: ShoppingCart },
  { href: "/orders", label: "Orders", icon: Package },
  { href: "/products", label: "Products", icon: Tags },
  { href: "/categories", label: "Categories", icon: Boxes },
  { href: "/brands", label: "Brands", icon: Tag },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/suppliers", label: "Suppliers", icon: Truck },
  { href: "/purchases", label: "Purchases", icon: CreditCard },
  { href: "/employees", label: "Employees", icon: UsersRound },
  { href: "/routes", label: "Routes", icon: MapPin },
  { href: "/deliveries", label: "Deliveries", icon: Bike },
  { href: "/cash-collections", label: "Cash Collections", icon: Wallet },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/reports", label: "Reports", icon: BarChart },
  { href: "/ledger", label: "Ledger", icon: BookOpen },
  { href: "/returns", label: "Returns", icon: RotateCcw },
  { href: "/whatsapp", label: "WhatsApp Center", icon: MessageCircle },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();
  const { logout, user } = useAuth();

  return (
    <aside className="w-64 flex flex-col bg-sidebar border-r border-sidebar-border h-screen sticky top-0 text-sidebar-foreground">
      <div className="h-16 flex items-center px-6 border-b border-sidebar-border shrink-0">
        <h1 className="font-bold text-lg tracking-tight truncate text-primary">Tech Mentor ERP & POS</h1>
      </div>
      
      <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1 custom-scrollbar">
        {navItems.map((item) => {
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
