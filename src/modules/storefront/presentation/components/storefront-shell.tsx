import type { ReactNode } from "react";
import type { StoreConfig } from "@/modules/store-config/application";
import { storeThemeStyle } from "../theme";

export interface StorefrontShellProps {
  readonly config: StoreConfig;
  readonly children: ReactNode;
}

/** Page frame of every storefront page: theme scope, header and footer. */
export function StorefrontShell({ config, children }: StorefrontShellProps) {
  const { identity } = config;
  return (
    <div
      style={storeThemeStyle(config.theme)}
      className="storefront-theme flex min-h-dvh flex-col bg-bg font-body text-text"
    >
      <header className="sticky top-0 z-10 border-b border-border bg-bg px-4 md:px-8">
        <div className="mx-auto flex min-h-14 max-w-5xl items-center gap-3">
          <a
            href="/"
            className="flex min-h-touch items-center font-display text-h3 font-bold break-words"
          >
            {identity.name}
          </a>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border px-4 py-6 text-small md:px-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-1 md:flex-row md:justify-between">
          <p>{identity.name}</p>
          <p>Tienda creada con VitrinIA</p>
        </div>
      </footer>
    </div>
  );
}
