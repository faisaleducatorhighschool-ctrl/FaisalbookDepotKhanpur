import { Link, useLocation } from "wouter";
import { Home, Search, ShoppingCart, Heart, User } from "lucide-react";
import { useCart } from "@/context/CartContext";

const tabs = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/shop", icon: Search, label: "Shop" },
  { href: "/cart", icon: ShoppingCart, label: "Cart" },
  { href: "/wishlist", icon: Heart, label: "Wishlist" },
  { href: "/profile", icon: User, label: "Profile" },
];

export function BottomNav() {
  const [location] = useLocation();
  const { totalItems } = useCart();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex safe-area-pb">
      {tabs.map(({ href, icon: Icon, label }) => {
        const active =
          href === "/" ? location === "/" : location.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
              active ? "text-indigo-600" : "text-gray-400"
            }`}
          >
            <div className="relative">
              <Icon className="w-5 h-5" />
              {label === "Cart" && totalItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-indigo-600 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5">
                  {totalItems > 99 ? "99+" : totalItems}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium leading-none">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
