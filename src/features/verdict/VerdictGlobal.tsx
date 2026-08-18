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
import { SIX_MOIS_MS } from "@/lib/constantes";
import { VERDICTS } from "@/lib/libelles";
import { verdictCommune, type Verdict } from "@/lib/regles";
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
      className={cn("h-auto py-1", ton.texte, ton.bordure)}
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
  const avecDonnees = bilans.filter((bilan) => bilan.prelevement !== null);
  const verdict = verdictCommune(
    avecDonnees.map((bilan) => bilan.evaluation.verdict),
  );
  const gabarit = VERDICTS[verdict];
  const ton = CLASSES_TON[gabarit.ton];
  const Icone = ICONES_VERDICT[verdict];

  const dates = avecDonnees
    .flatMap((bilan) => bilan.prelevement ?? [])
    .map((ligne) => ligne.date_prelevement)
    .sort();
  const plusRecent = dates.at(-1) ?? null;
  const tropAncien =
    plusRecent !== null &&
    maintenant - new Date(plusRecent).getTime() > SIX_MOIS_MS;

  const details = avecDonnees.length
    ? [
        `Dernier prélèvement le ${formatJour(plusRecent)}`,
        bilans.length > 1
          ? `${String(avecDonnees.length)} réseaux sur ${String(bilans.length)} avec données`
          : "1 réseau de distribution",
      ]
    : [
        "Aucun résultat de contrôle sanitaire trouvé pour cette commune dans SISE-Eaux.",
      ];

  return (
    <Card className={cn("ring-0", ton.fond)}>
      <CardHeader>
        <div className="flex items-start gap-3">
          <Icone
            className={cn("size-9 shrink-0", ton.texte)}
            aria-hidden="true"
          />
          <div className="flex flex-col gap-0.5">
            <h2 className={cn("font-heading text-xl font-semibold", ton.texte)}>
              {gabarit.libelle}
            </h2>
            <p className="text-sm font-medium">
              {commune.nom} ({commune.codeDepartement})
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm">{details.join(" · ")}</p>
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
