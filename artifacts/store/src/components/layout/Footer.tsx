import { Link } from "wouter";
import { useGetStoreSettings, getGetStoreSettingsQueryKey } from "@workspace/api-client-react";

export function Footer() {
  const { data: settings } = useGetStoreSettings({
    query: { queryKey: getGetStoreSettingsQueryKey() }
  });

  return (
    <footer className="bg-muted text-muted-foreground border-t mt-auto">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-foreground tracking-tight">
              {settings?.storeName || "Tech Mentor"}
            </h3>
            <p className="text-sm leading-relaxed max-w-xs">
              Your trusted destination for premium tech products. Fast delivery, genuine items, and excellent customer support.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold text-foreground mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="hover:text-primary transition-colors">Home</Link></li>
              <li><Link href="/products" className="hover:text-primary transition-colors">Products</Link></li>
              <li><Link href="/track" className="hover:text-primary transition-colors">Track Order</Link></li>
              <li><Link href="/cart" className="hover:text-primary transition-colors">Cart</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Support</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/auth" className="hover:text-primary transition-colors">Login / Register</Link></li>
              <li><Link href="/account" className="hover:text-primary transition-colors">My Account</Link></li>
              <li><Link href="/wishlist" className="hover:text-primary transition-colors">Wishlist</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Contact Us</h4>
            <ul className="space-y-2 text-sm">
              {settings?.storeAddress && (
                <li className="flex items-start gap-2">
                  <span>{settings.storeAddress}</span>
                </li>
              )}
              {settings?.storePhone && (
                <li className="flex items-start gap-2">
                  <span>{settings.storePhone}</span>
                </li>
              )}
              {settings?.storeEmail && (
                <li className="flex items-start gap-2">
                  <span>{settings.storeEmail}</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
          <p>© {new Date().getFullYear()} {settings?.companyName || settings?.storeName || "Tech Mentor"}. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground/50">Prices are in {settings?.currency || "PKR"}</span>
            <a
              href="/"
              className="text-muted-foreground/50 hover:text-primary transition-colors text-xs"
              data-testid="link-admin"
            >
              Admin
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
