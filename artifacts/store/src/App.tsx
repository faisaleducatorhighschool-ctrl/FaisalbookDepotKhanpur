import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster as SonnerToaster } from "sonner";
import NotFound from "@/pages/not-found";

import { ThemeProvider } from "@/components/ThemeProvider";
import { CustomerAuthProvider } from "@/context/CustomerAuthContext";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { StoreLayout } from "@/components/StoreLayout";

import Home from "@/pages/Home";
import Products from "@/pages/Products";
import ProductDetail from "@/pages/ProductDetail";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";
import OrderSuccess from "@/pages/OrderSuccess";
import TrackOrder from "@/pages/TrackOrder";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Account from "@/pages/Account";
import Wishlist from "@/pages/Wishlist";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function Router() {
  return (
    <StoreLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/products" component={Products} />
        <Route path="/products/:id" component={ProductDetail} />
        <Route path="/cart" component={Cart} />
        <Route path="/checkout" component={Checkout} />
        <Route path="/order-success" component={OrderSuccess} />
        <Route path="/track" component={TrackOrder} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/account" component={Account} />
        <Route path="/wishlist" component={Wishlist} />
        <Route component={NotFound} />
      </Switch>
    </StoreLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <CustomerAuthProvider>
          <CartProvider>
            <WishlistProvider>
              <TooltipProvider>
                <WouterRouter base={__APP_BASE_PATH__.replace(/\/$/, "")}>
                  <Router />
                </WouterRouter>
                <Toaster />
                <SonnerToaster position="top-center" richColors />
              </TooltipProvider>
            </WishlistProvider>
          </CartProvider>
        </CustomerAuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
