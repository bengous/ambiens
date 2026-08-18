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
import { CLASSES_TON } from "@/features/formats";
import { STATUTS_PARAMETRE } from "@/lib/libelles";
import {
  categorieParametre,
  evaluerParametre,
  type CategorieParametre,
  type Statut,
} from "@/lib/regles";
import { cn } from "@/lib/utils";

const ORDRE_CONFORME = STATUTS_PARAMETRE.conforme.ordre;

interface Rang {
  ligne: ResultatDis;
  statut: Statut;
  entete: CategorieParametre | null;
}

function valeurMesuree(ligne: ResultatDis): string {
  // resultat_numerique vaut 0 quand l'alphanumérique dit « <0,2 » : seul
  // l'alphanumérique est fidèle. Unité masquée quand elle vaut SANS OBJET.
  const valeur = ligne.resultat_alphanumerique ?? "—";
  const unite = ligne.libelle_unite;
  return unite !== null && unite !== "SANS OBJET"
    ? `${valeur} ${unite}`
    : valeur;
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

export function TableParametres({
  prelevement,
}: {
  prelevement: readonly ResultatDis[];
}) {
  const rangs = construireRangs(prelevement);

  return (
    <Table>
      <TableCaption>
        {prelevement.length} paramètre(s) mesuré(s) sur ce prélèvement
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Paramètre</TableHead>
          <TableHead>Valeur</TableHead>
          <TableHead className="whitespace-normal">Limite qualité</TableHead>
          <TableHead className="whitespace-normal">Référence qualité</TableHead>
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
                <TableCell>{valeurMesuree(ligne)}</TableCell>
                <TableCell className="whitespace-normal">
                  {ligne.limite_qualite_parametre ?? "—"}
                </TableCell>
                <TableCell className="whitespace-normal">
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
  );
}
