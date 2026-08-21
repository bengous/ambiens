import {
  CircleCheckIcon,
  CircleHelpIcon,
  CircleXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { Fragment } from "react";
import type { ResultatDis } from "@/api/hubeau-qualite";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CLASSES_TON, valeurMesuree } from "@/features/formats";
import { STATUTS_PARAMETRE, type TonVerdict } from "@/lib/libelles";
import {
  categorieParametre,
  evaluerParametre,
  type CategorieParametre,
  type Statut,
} from "@/lib/regles";
import { cn } from "@/lib/utils";

const ORDRE_CONFORME = STATUTS_PARAMETRE.conforme.ordre;

const ICONES_STATUT: Record<TonVerdict, typeof CircleCheckIcon> = {
  conforme: CircleCheckIcon,
  reserves: TriangleAlertIcon,
  "non-conforme": CircleXIcon,
  indetermine: CircleHelpIcon,
};

interface Rang {
  ligne: ResultatDis;
  statut: Statut;
  entete: CategorieParametre | null;
}

// Tri porté du prototype : ordre de statut d'abord, catégorie ensuite.
// Les dépassements restent groupés en tête, sans intercalaire de catégorie.
function construireRangs(prelevement: readonly ResultatDis[]): Rang[] {
  const evaluees = prelevement
    .map((ligne) => ({ ligne, statut: evaluerParametre(ligne) }))
    .sort((a, b) => {
      const delta =
        STATUTS_PARAMETRE[a.statut].ordre - STATUTS_PARAMETRE[b.statut].ordre;
      return delta !== 0
        ? delta
        : categorieParametre(a.ligne).localeCompare(
            categorieParametre(b.ligne),
          );
    });

  let categorieCourante: CategorieParametre | null = null;
  return evaluees.map(({ ligne, statut }) => {
    if (STATUTS_PARAMETRE[statut].ordre < ORDRE_CONFORME) {
      return { ligne, statut, entete: null };
    }
    const categorie = categorieParametre(ligne);
    if (categorie === categorieCourante) return { ligne, statut, entete: null };
    categorieCourante = categorie;
    return { ligne, statut, entete: categorie };
  });
}

function LigneDetail({ terme, valeur }: { terme: string; valeur: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{terme}</dt>
      <dd className="break-words">{valeur}</dd>
    </>
  );
}

function seuils(ligne: ResultatDis): string | null {
  const parts = [
    ligne.limite_qualite_parametre !== null
      ? `limite ${ligne.limite_qualite_parametre}`
      : null,
    ligne.reference_qualite_parametre !== null
      ? `référence ${ligne.reference_qualite_parametre}`
      : null,
  ].filter((part) => part !== null);
  return parts.length > 0 ? parts.join(" · ") : null;
}

function CarteDepassement({
  ligne,
  statut,
}: {
  ligne: ResultatDis;
  statut: Statut;
}) {
  const gabarit = STATUTS_PARAMETRE[statut];
  const ton = CLASSES_TON[gabarit.ton];
  return (
    <div className={cn("flex flex-col gap-2 rounded-md border p-3", ton.fond)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-medium break-words">
          {ligne.libelle_parametre ?? "—"}
        </p>
        <Badge variant="outline" className={cn(ton.texte, ton.bordure)}>
          {gabarit.libelle}
        </Badge>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm tabular-nums">
        <LigneDetail terme="Valeur" valeur={valeurMesuree(ligne)} />
        {ligne.limite_qualite_parametre !== null && (
          <LigneDetail
            terme="Limite qualité"
            valeur={ligne.limite_qualite_parametre}
          />
        )}
        {ligne.reference_qualite_parametre !== null && (
          <LigneDetail
            terme="Référence qualité"
            valeur={ligne.reference_qualite_parametre}
          />
        )}
      </dl>
    </div>
  );
}

function RangCompact({ ligne }: { ligne: ResultatDis }) {
  const bornes = seuils(ligne);
  return (
    <div className="flex flex-col gap-0.5 border-b py-2.5 last:border-b-0">
      <p className="text-sm break-words">{ligne.libelle_parametre ?? "—"}</p>
      <p className="text-sm tabular-nums">
        <span className="font-medium">{valeurMesuree(ligne)}</span>
        {bornes !== null && (
          <span className="text-muted-foreground"> · {bornes}</span>
        )}
      </p>
    </div>
  );
}

type Bloc =
  | { type: "depassement"; rang: Rang }
  | { type: "groupe"; statut: Statut; rangs: Rang[] };

// Les rangs arrivent triés par statut : chaque suite de même statut porte son
// libellé une seule fois, en bandeau, au lieu de le répéter sur chaque ligne.
function grouperParStatut(rangs: readonly Rang[]): Bloc[] {
  const blocs: Bloc[] = [];
  for (const rang of rangs) {
    if (STATUTS_PARAMETRE[rang.statut].ordre < ORDRE_CONFORME) {
      blocs.push({ type: "depassement", rang });
      continue;
    }
    const dernier = blocs.at(-1);
    if (dernier?.type === "groupe" && dernier.statut === rang.statut) {
      dernier.rangs.push(rang);
    } else {
      blocs.push({ type: "groupe", statut: rang.statut, rangs: [rang] });
    }
  }
  return blocs;
}

function BandeauStatut({ statut, nombre }: { statut: Statut; nombre: number }) {
  const gabarit = STATUTS_PARAMETRE[statut];
  const ton = CLASSES_TON[gabarit.ton];
  const Icone = ICONES_STATUT[gabarit.ton];
  return (
    <p
      className={cn(
        "flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium",
        ton.fond,
        ton.texte,
      )}
    >
      <Icone className="size-4 shrink-0" aria-hidden="true" />
      {gabarit.libelle} · {nombre} paramètre{nombre > 1 ? "s" : ""}
    </p>
  );
}

function CartesParametres({ rangs }: { rangs: readonly Rang[] }) {
  return (
    <div className="flex flex-col gap-2">
      {grouperParStatut(rangs).map((bloc, index) =>
        bloc.type === "depassement" ? (
          <CarteDepassement
            key={`d-${String(index)}`}
            ligne={bloc.rang.ligne}
            statut={bloc.rang.statut}
          />
        ) : (
          <section key={`g-${String(index)}`} className="flex flex-col">
            <BandeauStatut statut={bloc.statut} nombre={bloc.rangs.length} />
            {bloc.rangs.map(({ ligne, entete }, rangIndex) => (
              <Fragment
                key={`${ligne.libelle_parametre ?? "?"}-${String(rangIndex)}`}
              >
                {entete !== null && (
                  <p className="mt-3 mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {entete}
                  </p>
                )}
                <RangCompact ligne={ligne} />
              </Fragment>
            ))}
          </section>
        ),
      )}
    </div>
  );
}

export function TableParametres({
  prelevement,
}: {
  prelevement: readonly ResultatDis[];
}) {
  const rangs = construireRangs(prelevement);

  return (
    <>
      <div className="flex flex-col gap-3 sm:hidden">
        <CartesParametres rangs={rangs} />
        <p className="text-sm text-muted-foreground">
          {prelevement.length} paramètre(s) mesuré(s) sur ce prélèvement
        </p>
      </div>
      <div className="max-sm:hidden">
        <Table>
          <TableCaption>
            {prelevement.length} paramètre(s) mesuré(s) sur ce prélèvement
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Paramètre</TableHead>
              <TableHead>Valeur</TableHead>
              <TableHead className="whitespace-normal">
                Limite qualité
              </TableHead>
              <TableHead className="whitespace-normal">
                Référence qualité
              </TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rangs.map(({ ligne, statut, entete }, index) => {
              const gabarit = STATUTS_PARAMETRE[statut];
              const ton = CLASSES_TON[gabarit.ton];
              const enDepassement = gabarit.ordre < ORDRE_CONFORME;
              return (
                <Fragment
                  key={`${ligne.libelle_parametre ?? "?"}-${String(index)}`}
                >
                  {entete !== null && (
                    <TableRow className="hover:bg-transparent">
                      <TableCell
                        colSpan={5}
                        className="bg-muted text-xs font-medium tracking-wide uppercase"
                      >
                        {entete}
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow className={cn(enDepassement && ton.fond)}>
                    <TableCell className="min-w-40 whitespace-normal">
                      {ligne.libelle_parametre ?? "—"}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {valeurMesuree(ligne)}
                    </TableCell>
                    <TableCell className="whitespace-normal tabular-nums">
                      {ligne.limite_qualite_parametre ?? "—"}
                    </TableCell>
                    <TableCell className="whitespace-normal tabular-nums">
                      {ligne.reference_qualite_parametre ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(ton.texte, ton.bordure)}
                      >
                        {gabarit.libelle}
                      </Badge>
                    </TableCell>
                  </TableRow>
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
