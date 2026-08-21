import type { BilanReseau } from "@/api/hubeau-qualite";
import { verdictCommune, type Verdict } from "@/lib/regles";

export interface SyntheseCommune {
  verdict: Verdict;
  plusRecent: string | null;
  avecDonnees: number;
  total: number;
}

export function synthetiserCommune(
  bilans: readonly BilanReseau[],
): SyntheseCommune {
  const avecDonnees = bilans.filter((bilan) => bilan.prelevement !== null);
  const dates = avecDonnees
    .flatMap((bilan) => bilan.prelevement ?? [])
    .map((ligne) => ligne.date_prelevement)
    .sort();
  return {
    verdict: verdictCommune(
      avecDonnees.map((bilan) => bilan.evaluation.verdict),
    ),
    plusRecent: dates.at(-1) ?? null,
    avecDonnees: avecDonnees.length,
    total: bilans.length,
  };
}
