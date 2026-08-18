import type { ReactNode } from "react";

// Le tiret déborde à gauche pour toucher le rail de profondeur du conteneur de
// résultats : c'est le cran de la station.
export function Surtitre({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-xs font-medium tracking-widest text-muted-foreground uppercase">
      <span
        aria-hidden="true"
        className="h-px w-4 bg-eau-vif sm:-ml-5 sm:w-5"
      />
      {children}
    </p>
  );
}
