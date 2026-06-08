import React, { createContext, useContext, useEffect } from "react";
import { useGetMe, getGetMeQueryKey, User } from "@workspace/api-client-react";
import { useLocation } from "wouter";

type AuthContextType = {
  user: User | undefined;
  isLoading: boolean;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>({
  user: undefined,
  isLoading: true,
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const token = typeof window !== "undefined" ? localStorage.getItem("erp_token") : null;
  
  const { data: user, isLoading, isError } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      enabled: !!token,
      retry: false,
    }
  });

  const logout = () => {
    localStorage.removeItem("erp_token");
    setLocation("/login");
  };

  useEffect(() => {
    if (!token || isError) {
      if (window.location.pathname !== "/login") {
        setLocation("/login");
      }
    }
  }, [token, isError, setLocation]);

  return (
    <AuthContext.Provider value={{ user, isLoading: isLoading && !!token, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
