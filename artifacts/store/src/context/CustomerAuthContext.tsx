import React, { createContext, useContext, useEffect, useState } from "react";
import { useGetStoreCustomerMe, getGetStoreCustomerMeQueryKey, StoreCustomer } from "@workspace/api-client-react";
import { initStoreAuth } from "@/lib/store-auth";
import { useQueryClient } from "@tanstack/react-query";

type CustomerAuthContextType = {
  customer: StoreCustomer | null;
  isLoading: boolean;
  login: (token: string, customer: StoreCustomer) => void;
  logout: () => void;
};

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

export function CustomerAuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("store_token"));

  useEffect(() => {
    initStoreAuth();
  }, []);

  const { data: customer, isLoading } = useGetStoreCustomerMe({
    query: {
      enabled: !!token,
      queryKey: getGetStoreCustomerMeQueryKey(),
      retry: false,
    },
  });

  const login = (newToken: string, newCustomer: StoreCustomer) => {
    localStorage.setItem("store_token", newToken);
    setToken(newToken);
    queryClient.setQueryData(getGetStoreCustomerMeQueryKey(), newCustomer);
    initStoreAuth();
  };

  const logout = () => {
    localStorage.removeItem("store_token");
    setToken(null);
    queryClient.setQueryData(getGetStoreCustomerMeQueryKey(), null);
    queryClient.clear();
  };

  return (
    <CustomerAuthContext.Provider
      value={{
        customer: customer || null,
        isLoading: isLoading && !!token,
        login,
        logout,
      }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext);
  if (!context) throw new Error("useCustomerAuth must be used within a CustomerAuthProvider");
  return context;
}
