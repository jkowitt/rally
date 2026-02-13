"use client";

import { RallyAuthProvider } from "@/lib/rally-auth";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <RallyAuthProvider>
      {children}
    </RallyAuthProvider>
  );
}
