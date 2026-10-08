import "./globals.css";
import type { ReactNode } from "react";

// Dynamic rendering so Next can tag its inline scripts with the per-request CSP nonce.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-CL">
      <body>{children}</body>
    </html>
  );
}
