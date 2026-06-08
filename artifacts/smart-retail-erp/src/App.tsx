import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/components/AuthProvider";
import { AdminLayout } from "@/components/layout/AdminLayout";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";

import Dashboard from "@/pages/Dashboard";
import POS from "@/pages/POS";
import Orders from "@/pages/Orders";
import Products from "@/pages/Products";
import Categories from "@/pages/Categories";
import Brands from "@/pages/Brands";
import Inventory from "@/pages/Inventory";
import Customers from "@/pages/Customers";
import Suppliers from "@/pages/Suppliers";
import Purchases from "@/pages/Purchases";
import Employees from "@/pages/Employees";
import RoutesPage from "@/pages/Routes";
import Deliveries from "@/pages/Deliveries";
import CashCollections from "@/pages/CashCollections";
import Expenses from "@/pages/Expenses";
import Reports from "@/pages/Reports";
import Ledger from "@/pages/Ledger";
import Returns from "@/pages/Returns";
import Invoices from "@/pages/Invoices";
import WhatsApp from "@/pages/WhatsApp";
import Notifications from "@/pages/Notifications";
import Settings from "@/pages/Settings";
import BusinessManager from "@/pages/BusinessManager";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AdminRouter() {
  return (
    <AdminLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/pos" component={POS} />
        <Route path="/orders" component={Orders} />
        <Route path="/products" component={Products} />
        <Route path="/categories" component={Categories} />
        <Route path="/brands" component={Brands} />
        <Route path="/inventory" component={Inventory} />
        <Route path="/customers" component={Customers} />
        <Route path="/suppliers" component={Suppliers} />
        <Route path="/purchases" component={Purchases} />
        <Route path="/employees" component={Employees} />
        <Route path="/routes" component={RoutesPage} />
        <Route path="/deliveries" component={Deliveries} />
        <Route path="/cash-collections" component={CashCollections} />
        <Route path="/expenses" component={Expenses} />
        <Route path="/reports" component={Reports} />
        <Route path="/ledger" component={Ledger} />
        <Route path="/returns" component={Returns} />
        <Route path="/invoices" component={Invoices} />
        <Route path="/whatsapp" component={WhatsApp} />
        <Route path="/notifications" component={Notifications} />
        <Route path="/settings" component={Settings} />
        <Route path="/business" component={BusinessManager} />
        <Route component={NotFound} />
      </Switch>
    </AdminLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/*" component={AdminRouter} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="erp-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AuthProvider>
              <Router />
            </AuthProvider>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
