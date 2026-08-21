import type { CommuneRecherche } from "@/api/geo";
import type { ResultatDis } from "@/api/hubeau-qualite";
import {
  formatDate,
  type NiveauGravite,
  type TonVerdict,
} from "@/lib/libelles";

export interface ClassesTon {
  texte: string;
  fond: string;
  bordure: string;
  barre: string;
}

// Le scanner Tailwind ne résout aucune concaténation : chaque classe est écrite
// en toutes lettres.
export const CLASSES_TON: Record<TonVerdict, ClassesTon> = {
  conforme: {
    texte: "text-verdict-conforme",
    fond: "bg-verdict-conforme-fond",
    bordure: "border-verdict-conforme/30",
    barre: "border-l-verdict-conforme",
  },
  reserves: {
    texte: "text-verdict-reserves",
    fond: "bg-verdict-reserves-fond",
    bordure: "border-verdict-reserves/30",
    barre: "border-l-verdict-reserves",
  },
  "non-conforme": {
    texte: "text-verdict-non-conforme",
    fond: "bg-verdict-non-conforme-fond",
    bordure: "border-verdict-non-conforme/30",
    barre: "border-l-verdict-non-conforme",
  },
  indetermine: {
    texte: "text-verdict-indetermine",
    fond: "bg-verdict-indetermine-fond",
    bordure: "border-verdict-indetermine/30",
    barre: "border-l-verdict-indetermine",
  },
};

// Famille bleu-violet, disjointe des verdicts sanitaires.
export const CLASSES_SECHERESSE: Record<NiveauGravite, string> = {
  vigilance: "border-secheresse-vigilance/50 text-secheresse-vigilance",
  alerte: "border-secheresse-alerte/50 text-secheresse-alerte",
  alerte_renforcee: "border-secheresse-renforcee/50 text-secheresse-renforcee",
  crise: "border-secheresse-crise/50 text-secheresse-crise",
};

export function libelleCommune(commune: CommuneRecherche): string {
  return `${commune.nom} (${commune.codeDepartement})`;
}

const distance = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 1,
});

const mesure = new Intl.NumberFormat("fr-FR", {
  maximumSignificantDigits: 3,
});

export function formatDistance(km: number): string {
  return `${distance.format(km)} km`;
}

export function formatDebit(m3s: number | null): string {
  return m3s === null ? "Mesure indisponible" : `${mesure.format(m3s)} m³/s`;
}

export function formatMetres(metres: number | null): string {
  return metres === null ? "—" : `${mesure.format(metres)} m`;
}

export function formatJour(iso: string | null): string {
  return iso === null ? "—" : formatDate.format(new Date(iso));
}

// resultat_numerique vaut 0 quand l'alphanumérique dit « <0,2 » : seul
// l'alphanumérique est fidèle. Unité masquée quand elle vaut SANS OBJET.
export function valeurMesuree(ligne: ResultatDis): string {
  const valeur = ligne.resultat_alphanumerique ?? "—";
  const unite = ligne.libelle_unite;
  return unite !== null && unite !== "SANS OBJET"
    ? `${valeur} ${unite}`
    : valeur;
}
