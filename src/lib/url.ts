// Codes INSEE : 5 chiffres, sauf la Corse (2A / 2B suivis de 3 chiffres).
const REGEX_INSEE = /^(\d{5}|2[AB]\d{3})$/;

export const PARAM_COMMUNE = "commune";

export function estCodeInsee(
  valeur: string | null | undefined,
): valeur is string {
  return typeof valeur === "string" && REGEX_INSEE.test(valeur);
}

export function lireCommuneUrl(
  recherche: string = window.location.search,
): string | null {
  const valeur = new URLSearchParams(recherche).get(PARAM_COMMUNE);
  return estCodeInsee(valeur) ? valeur : null;
}

export function ecrireCommuneUrl(insee: string | null): void {
  const url = new URL(window.location.href);
  if (insee === null) url.searchParams.delete(PARAM_COMMUNE);
  else url.searchParams.set(PARAM_COMMUNE, insee);
  window.history.replaceState(null, "", url);
}
