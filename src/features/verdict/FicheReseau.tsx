import { CircleCheckIcon, CircleSlashIcon, CircleXIcon } from "lucide-react";
import type { BilanReseau } from "@/api/hubeau-qualite";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { CLASSES_TON, formatJour } from "@/features/formats";
import { CONFORMITES_OFFICIELLES } from "@/lib/libelles";
import { cn } from "@/lib/utils";
import { BadgeVerdict } from "./VerdictGlobal";
import { TableParametres } from "./TableParametres";

const OUVERT_JUSQUA = 3;

const CONFORMITE_C = "C";
const CONFORMITE_N = "N";

function badgeConformite(code: string | null) {
  if (code === CONFORMITE_C) {
    return {
      texte: "conforme",
      ton: CLASSES_TON.conforme,
      Icone: CircleCheckIcon,
    };
  }
  if (code === CONFORMITE_N) {
    return {
      texte: "non conforme",
      ton: CLASSES_TON["non-conforme"],
      Icone: CircleXIcon,
    };
  }
  return {
    texte: "sans objet",
    ton: CLASSES_TON.indetermine,
    Icone: CircleSlashIcon,
  };
}

function cleReseau(bilan: BilanReseau, index: number): string {
  return bilan.reseau.code ?? `reseau-${String(index)}`;
}

function FicheReseau({
  bilan,
  valeur,
}: {
  bilan: BilanReseau;
  valeur: string;
}) {
  const { reseau, prelevement, evaluation } = bilan;
  const verdict = prelevement ? evaluation.verdict : "indetermine";
  const temoin = prelevement?.[0] ?? null;

  return (
    <AccordionItem
      value={valeur}
      className="rounded-lg border px-4 not-last:border-b"
    >
      <AccordionTrigger className="gap-3">
        <span className="flex flex-1 flex-col items-start gap-1 pr-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <span className="flex flex-col text-left">
            <span className="font-medium">{reseau.nom}</span>
            {reseau.quartier !== null && (
              <span className="text-xs text-muted-foreground">
                {reseau.quartier}
              </span>
            )}
          </span>
          <BadgeVerdict verdict={verdict} />
        </span>
      </AccordionTrigger>
      <AccordionContent className="flex flex-col gap-4">
        {temoin === null || prelevement === null ? (
          <p className="text-sm text-muted-foreground">
            Aucun prélèvement récent trouvé pour ce réseau dans les données
            ouvertes.
          </p>
        ) : (
          <>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-muted-foreground">
                  Prélèvement du
                </dt>
                <dd>{formatJour(temoin.date_prelevement)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Distributeur</dt>
                <dd>{temoin.nom_distributeur ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Code réseau</dt>
                <dd>{reseau.code ?? "—"}</dd>
              </div>
            </dl>

            {temoin.conclusion_conformite_prelevement !== null && (
              <blockquote className="border-l-2 pl-3 text-sm italic">
                « {temoin.conclusion_conformite_prelevement} » — conclusion
                sanitaire officielle
              </blockquote>
            )}

            <ul className="flex flex-wrap gap-2">
              {CONFORMITES_OFFICIELLES.map(([champ, libelle]) => {
                const { texte, ton, Icone } = badgeConformite(temoin[champ]);
                return (
                  <li key={champ}>
                    <Badge
                      variant="outline"
                      className={cn("h-auto py-1", ton.texte, ton.bordure)}
                    >
                      <Icone aria-hidden="true" />
                      {libelle} : {texte}
                    </Badge>
                  </li>
                );
              })}
            </ul>

            {evaluation.desaccord && (
              <p
                className={cn(
                  "rounded-md p-3 text-sm",
                  CLASSES_TON.reserves.fond,
                )}
              >
                Notre recalcul détecte un dépassement de limite que la
                conclusion officielle ne relève pas : reportez-vous aux
                paramètres surlignés et à l&apos;avis de l&apos;ARS.
              </p>
            )}

            <TableParametres prelevement={prelevement} />

            <p className="text-xs text-muted-foreground">
              Valeurs telles que rendues par le laboratoire agréé. Données
              SISE-Eaux publiées avec un à trois mois de décalage.
            </p>
          </>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

export function ListeReseaux({ bilans }: { bilans: readonly BilanReseau[] }) {
  const cles = bilans.map((bilan, index) => cleReseau(bilan, index));
  const ouvertes = bilans.length <= OUVERT_JUSQUA ? cles : [];

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-lg font-semibold">
        Réseaux de distribution ({bilans.length})
      </h2>
      <Accordion multiple defaultValue={ouvertes} className="gap-2">
        {bilans.map((bilan, index) => (
          <FicheReseau key={cles[index]} bilan={bilan} valeur={cles[index]} />
        ))}
      </Accordion>
    </section>
  );
}
