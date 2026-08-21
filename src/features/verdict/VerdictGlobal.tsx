import {
  CircleCheckIcon,
  CircleHelpIcon,
  CircleXIcon,
  ClockAlertIcon,
  TriangleAlertIcon,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import type { Commune } from "@/api/geo";
import type { BilanReseau } from "@/api/hubeau-qualite";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CLASSES_TON, formatJour } from "@/features/formats";
import { synthetiserCommune } from "@/features/verdict/synthese";
import { SIX_MOIS_MS } from "@/lib/constantes";
import { VERDICTS } from "@/lib/libelles";
import type { Verdict } from "@/lib/regles";
import { cn } from "@/lib/utils";

// La couleur ne porte jamais seule l'information : icône + libellé l'accompagnent.
const ICONES_VERDICT: Record<Verdict, LucideIcon> = {
  conforme: CircleCheckIcon,
  avec_reserves: TriangleAlertIcon,
  non_conforme: CircleXIcon,
  indetermine: CircleHelpIcon,
};

export function BadgeVerdict({ verdict }: { verdict: Verdict }) {
  const gabarit = VERDICTS[verdict];
  const ton = CLASSES_TON[gabarit.ton];
  const Icone = ICONES_VERDICT[verdict];
  return (
    <Badge
      variant="outline"
      className={cn("h-auto py-1 whitespace-normal", ton.texte, ton.bordure)}
    >
      <Icone aria-hidden="true" />
      {gabarit.libelle}
    </Badge>
  );
}

interface VerdictGlobalProps {
  commune: Commune;
  bilans: readonly BilanReseau[];
}

export function VerdictGlobal({ commune, bilans }: VerdictGlobalProps) {
  // L'horloge est un état externe : la lire pendant le rendu rendrait le
  // composant non idempotent.
  const [maintenant] = useState(() => Date.now());
  const { verdict, plusRecent, avecDonnees, total } =
    synthetiserCommune(bilans);
  const gabarit = VERDICTS[verdict];
  const ton = CLASSES_TON[gabarit.ton];
  const Icone = ICONES_VERDICT[verdict];

  const tropAncien =
    plusRecent !== null &&
    maintenant - new Date(plusRecent).getTime() > SIX_MOIS_MS;

  const details = avecDonnees
    ? [
        `Dernier prélèvement le ${formatJour(plusRecent)}`,
        total > 1
          ? `${String(avecDonnees)} réseaux sur ${String(total)} avec données`
          : "1 réseau de distribution",
      ]
    : [
        "Aucun résultat de contrôle sanitaire trouvé pour cette commune dans SISE-Eaux.",
      ];

  return (
    <Card className={cn("border-l-4 ring-0", ton.fond, ton.barre)}>
      <CardHeader>
        <div className="flex items-start gap-3 sm:gap-4">
          <Icone
            className={cn("size-10 shrink-0 sm:size-12", ton.texte)}
            aria-hidden="true"
          />
          <div className="flex flex-col gap-0.5">
            <h2
              className={cn(
                "font-heading text-2xl font-semibold tracking-tight sm:text-3xl",
                ton.texte,
              )}
            >
              {gabarit.libelle}
            </h2>
            <p className="text-base font-medium">
              {commune.nom} ({commune.codeDepartement})
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm tabular-nums">{details.join(" · ")}</p>
        {tropAncien && (
          <p className="flex items-start gap-2 text-sm font-medium">
            <ClockAlertIcon
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            Prélèvement de plus de 6 mois : la situation a pu évoluer depuis.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
