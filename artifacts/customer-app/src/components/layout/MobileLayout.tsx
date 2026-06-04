import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

interface MobileLayoutProps {
  children: ReactNode;
  hideNav?: boolean;
}

export function MobileLayout({ children, hideNav = false }: MobileLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto relative">
      <main className={`flex-1 overflow-y-auto ${hideNav ? "pb-0" : "pb-20"}`}>
        {children}
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
}
