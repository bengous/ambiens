import type { Statut, Verdict } from "./regles";

export type TonVerdict =
  "conforme" | "reserves" | "non-conforme" | "indetermine";

export interface GabaritVerdict {
  libelle: string;
  symbole: string;
  ton: TonVerdict;
}

export const VERDICTS: Record<Verdict, GabaritVerdict> = {
  conforme: { libelle: "Eau conforme", symbole: "✓", ton: "conforme" },
  avec_reserves: {
    libelle: "Conforme, avec réserves",
    symbole: "!",
    ton: "reserves",
  },
  non_conforme: {
    libelle: "Non-conformité détectée",
    symbole: "✕",
    ton: "non-conforme",
  },
  indetermine: {
    libelle: "Données indisponibles",
    symbole: "?",
    ton: "indetermine",
  },
};

export interface GabaritStatut {
  libelle: string;
  ton: TonVerdict;
  ordre: number;
}

export const STATUTS_PARAMETRE: Record<Statut, GabaritStatut> = {
  conforme: { libelle: "Conforme", ton: "conforme", ordre: 2 },
  depassement_limite: {
    libelle: "Limite dépassée",
    ton: "non-conforme",
    ordre: 0,
  },
  depassement_reference: {
    libelle: "Référence dépassée",
    ton: "reserves",
    ordre: 1,
  },
  non_evalue: { libelle: "Non évalué", ton: "indetermine", ordre: 3 },
};

export const CONFORMITES_OFFICIELLES = [
  ["conformite_limites_bact_prelevement", "Limites microbiologie"],
  ["conformite_limites_pc_prelevement", "Limites physico-chimie"],
  ["conformite_references_bact_prelevement", "Références microbiologie"],
  ["conformite_references_pc_prelevement", "Références physico-chimie"],
] as const;

export type NiveauGravite =
  "vigilance" | "alerte" | "alerte_renforcee" | "crise";

export const NIVEAUX_SECHERESSE: Record<
  NiveauGravite,
  { libelle: string; ordre: number }
> = {
  vigilance: { libelle: "Vigilance", ordre: 0 },
  alerte: { libelle: "Alerte", ordre: 1 },
  alerte_renforcee: { libelle: "Alerte renforcée", ordre: 2 },
  crise: { libelle: "Crise", ordre: 3 },
};

export const formatDate = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeZone: "Europe/Paris",
});

export const formatDateHeure = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});
