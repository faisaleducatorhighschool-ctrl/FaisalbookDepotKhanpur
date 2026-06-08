import React from "react";
import { Sidebar } from "./Sidebar";
import { useAuth } from "../AuthProvider";
import { Redirect } from "wouter";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-background">Loading...</div>;
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 md:p-8 max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
