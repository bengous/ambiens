import { QueryClient, queryOptions, skipToken } from "@tanstack/react-query";
import type { Coordonnees } from "@/lib/geo-utils";
import { chercherCommunes, fetchCommune } from "./geo";
import { fetchDebits } from "./hydro";
import { fetchBilansCommune } from "./hubeau-qualite";
import { fetchNiveauxNappe } from "./piezo";
import { fetchRestrictions } from "./vigieau";

const MINUTE = 60 * 1000;
const HEURE = 60 * MINUTE;

const SAISIE_MINIMALE = 2;

export function creerClientRequetes(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { refetchOnWindowFocus: false, retry: 1 },
    },
  });
}

export function optionsRechercheCommunes(saisie: string) {
  const q = saisie.trim();
  return queryOptions({
    queryKey: ["geo", "recherche", q],
    queryFn:
      q.length >= SAISIE_MINIMALE ? () => chercherCommunes(q) : skipToken,
    staleTime: 5 * MINUTE,
    retry: 0,
  });
}

export function optionsCommune(insee: string | null) {
  return queryOptions({
    queryKey: ["geo", "commune", insee],
    queryFn: insee === null ? skipToken : () => fetchCommune(insee),
    staleTime: Infinity,
    retry: 1,
  });
}

export function optionsQualite(insee: string | null) {
  return queryOptions({
    queryKey: ["qualite", insee],
    queryFn: insee === null ? skipToken : () => fetchBilansCommune(insee),
    staleTime: 60 * MINUTE,
    retry: 1,
  });
}

export function optionsVigieau(insee: string | null) {
  return queryOptions({
    queryKey: ["vigieau", insee],
    queryFn: insee === null ? skipToken : () => fetchRestrictions(insee),
    staleTime: 60 * MINUTE,
    retry: 1,
  });
}

// Le centre est le centroïde de la commune : il dépend entièrement de l'INSEE,
// qui reste donc la clé de cache complète.
export function optionsHydro(insee: string | null, centre: Coordonnees | null) {
  // eslint-disable-next-line @tanstack/query/exhaustive-deps -- centre est dérivé de insee
  return queryOptions({
    queryKey: ["hydro", insee],
    queryFn:
      insee === null || centre === null ? skipToken : () => fetchDebits(centre),
    staleTime: 15 * MINUTE,
    retry: 1,
  });
}

export function optionsPiezo(insee: string | null, centre: Coordonnees | null) {
  // eslint-disable-next-line @tanstack/query/exhaustive-deps -- centre est dérivé de insee
  return queryOptions({
    queryKey: ["piezo", insee],
    queryFn:
      insee === null || centre === null
        ? skipToken
        : () => fetchNiveauxNappe(centre),
    staleTime: 6 * HEURE,
    retry: 1,
  });
}
