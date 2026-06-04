import React, { createContext, useContext, useEffect, useState } from "react";
import { setAuthTokenGetter, useGetStoreCustomerMe, StoreCustomer, getGetStoreCustomerMeQueryKey } from "@workspace/api-client-react";

interface AuthContextType {
  token: string | null;
  customer: StoreCustomer | null;
  setAuth: (token: string, customer: StoreCustomer) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem("store_token"));
  const [customer, setCustomer] = useState<StoreCustomer | null>(null);

  useEffect(() => {
    setAuthTokenGetter(() => localStorage.getItem("store_token"));
  }, []);

  const { data: customerData } = useGetStoreCustomerMe({
    query: {
      queryKey: getGetStoreCustomerMeQueryKey(),
      enabled: !!token,
    }
  });

  useEffect(() => {
    if (customerData) {
      setCustomer(customerData);
    }
  }, [customerData]);

  const setAuth = (newToken: string, newCustomer: StoreCustomer) => {
    localStorage.setItem("store_token", newToken);
    setTokenState(newToken);
    setCustomer(newCustomer);
  };

  const logout = () => {
    localStorage.removeItem("store_token");
    setTokenState(null);
    setCustomer(null);
  };

  return (
    <AuthContext.Provider value={{ token, customer, setAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useStoreAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useStoreAuth must be used within an AuthProvider");
  }
  return context;
}
