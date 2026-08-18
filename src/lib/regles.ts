export type Verdict =
  "conforme" | "avec_reserves" | "non_conforme" | "indetermine";

export type Statut =
  "conforme" | "depassement_limite" | "depassement_reference" | "non_evalue";

export type CategorieParametre =
  "Microbiologie" | "Observations" | "Physico-chimie";

export type Operateur = "<=" | ">=" | "<" | ">";

export interface Contrainte {
  op: Operateur;
  seuil: number;
}

export interface LigneEvaluable {
  code_type_parametre: string | null;
  resultat_numerique: number | null;
  limite_qualite_parametre: string | null;
  reference_qualite_parametre: string | null;
}

export interface LigneConformite {
  conformite_limites_bact_prelevement: string | null;
  conformite_limites_pc_prelevement: string | null;
  conformite_references_bact_prelevement: string | null;
  conformite_references_pc_prelevement: string | null;
}

export interface LigneCategorisable {
  libelle_parametre: string | null;
  code_type_parametre: string | null;
}

export interface Reseau {
  code: string | null;
  nom: string;
  quartier: string | null;
}

export interface Evaluation {
  verdict: Verdict;
  desaccord: boolean;
}

// Seuils réglementaires fournis en texte par SISE-Eaux :
// "<=0 n/(100mL)", ">=6,5 et <=9 unitépH", "<0,1 µg/L"…
// null quand aucun seuil n'est exploitable : on n'invente jamais un verdict.
export function parseSeuil(
  texte: string | null | undefined,
): Contrainte[] | null {
  if (!texte) return null;
  const contraintes: Contrainte[] = [];
  const motif = /(<=|>=|<|>)\s*(\d+(?:[.,]\d+)?)/g;
  let m: RegExpExecArray | null;
  while ((m = motif.exec(texte)) !== null) {
    contraintes.push({
      op: m[1] as Operateur,
      seuil: Number.parseFloat(m[2].replace(",", ".")),
    });
  }
  return contraintes.length ? contraintes : null;
}

export function respecte(
  valeur: number,
  contraintes: readonly Contrainte[],
): boolean {
  return contraintes.every(({ op, seuil }) =>
    op === "<="
      ? valeur <= seuil
      : op === ">="
        ? valeur >= seuil
        : op === "<"
          ? valeur < seuil
          : valeur > seuil,
  );
}

export function evaluerParametre(ligne: LigneEvaluable): Statut {
  // Paramètres qualitatifs (code O) : resultat_numerique vaut 0 sans signification
  if (
    ligne.code_type_parametre !== "N" ||
    typeof ligne.resultat_numerique !== "number"
  ) {
    return "non_evalue";
  }
  const limite = parseSeuil(ligne.limite_qualite_parametre);
  const reference = parseSeuil(ligne.reference_qualite_parametre);
  if (limite && !respecte(ligne.resultat_numerique, limite)) {
    return "depassement_limite";
  }
  if (reference && !respecte(ligne.resultat_numerique, reference)) {
    return "depassement_reference";
  }
  return (limite ?? reference) !== null ? "conforme" : "non_evalue";
}

// Verdicts du plus favorable au plus grave ; verdictCommune retient le pire.
export const SEVERITE: Record<Verdict, number> = {
  conforme: 0,
  indetermine: 1,
  avec_reserves: 2,
  non_conforme: 3,
};

// Combine les conclusions officielles ARS (C / N / S / vide) et notre recalcul.
// L'officiel prime ; le recalcul sert de repli quand l'ARS est muette, et le
// désaccord éventuel (officiel conforme mais dépassement recalculé) est signalé.
export function verdictReseau(
  prelevement: readonly (LigneEvaluable & LigneConformite)[],
): Evaluation {
  const temoin = prelevement[0];
  const limitesOff = [
    temoin.conformite_limites_bact_prelevement,
    temoin.conformite_limites_pc_prelevement,
  ];
  const referencesOff = [
    temoin.conformite_references_bact_prelevement,
    temoin.conformite_references_pc_prelevement,
  ];
  const recalc = prelevement.map((ligne) => evaluerParametre(ligne));
  const recalcLimite = recalc.includes("depassement_limite");
  const recalcReference = recalc.includes("depassement_reference");

  let verdict: Verdict;
  if (limitesOff.includes("N")) verdict = "non_conforme";
  else if (limitesOff.includes("C"))
    verdict = referencesOff.includes("N") ? "avec_reserves" : "conforme";
  else if (recalcLimite) verdict = "non_conforme";
  else if (referencesOff.includes("N") || recalcReference)
    verdict = "avec_reserves";
  else if (referencesOff.includes("C") || recalc.includes("conforme"))
    verdict = "conforme";
  else verdict = "indetermine";

  return { verdict, desaccord: limitesOff.includes("C") && recalcLimite };
}

export function verdictCommune(verdicts: readonly Verdict[]): Verdict {
  if (!verdicts.length) return "indetermine";
  return verdicts.reduce((pire, v) =>
    SEVERITE[v] > SEVERITE[pire] ? v : pire,
  );
}

export function categorieParametre(
  ligne: LigneCategorisable,
): CategorieParametre {
  if (
    /coli|bact|ent[ée]ro|strepto|germe|spore|micro-?org/i.test(
      ligne.libelle_parametre ?? "",
    )
  ) {
    return "Microbiologie";
  }
  if (ligne.code_type_parametre === "O") return "Observations";
  return "Physico-chimie";
}
