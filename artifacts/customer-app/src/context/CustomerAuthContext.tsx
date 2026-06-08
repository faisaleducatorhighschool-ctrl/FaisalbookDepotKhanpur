import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetStoreCustomerMeQueryKey } from "@workspace/api-client-react";
import type { StoreCustomer } from "@workspace/api-client-react";

interface CustomerAuthContextValue {
  token: string | null;
  customer: StoreCustomer | null;
  setAuth: (token: string, customer: StoreCustomer) => void;
  logout: () => void;
  isLoggedIn: boolean;
}

const CustomerAuthContext = createContext<CustomerAuthContextValue | null>(null);

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem("store_token")
  );
  const [customer, setCustomer] = useState<StoreCustomer | null>(null);

  const setAuth = useCallback((newToken: string, newCustomer: StoreCustomer) => {
    localStorage.setItem("store_token", newToken);
    setToken(newToken);
    setCustomer(newCustomer);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("store_token");
    setToken(null);
    setCustomer(null);
    queryClient.invalidateQueries({ queryKey: getGetStoreCustomerMeQueryKey() });
  }, [queryClient]);

  return (
    <CustomerAuthContext.Provider
      value={{ token, customer, setAuth, logout, isLoggedIn: !!token }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error("useCustomerAuth must be used within CustomerAuthProvider");
  return ctx;
}
