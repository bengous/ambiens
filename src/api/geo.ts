import * as z from "zod";
import { API_GEO, TIMEOUT_GEO_MS } from "@/lib/constantes";
import { fetchJson } from "@/lib/fetch-json";
import type { Coordonnees } from "@/lib/geo-utils";

const CHAMPS = "nom,code,codesPostaux,population,codeDepartement";
const LIMITE_SUGGESTIONS = 8;

export const schemaCommuneRecherche = z.object({
  nom: z.string(),
  code: z.string(),
  codeDepartement: z.string(),
  codesPostaux: z.array(z.string()).optional(),
  population: z.number().optional(),
});

export const schemaRecherche = z.array(schemaCommuneRecherche);

export type CommuneRecherche = z.infer<typeof schemaCommuneRecherche>;

export const schemaCommune = schemaCommuneRecherche.extend({
  centre: z.object({
    type: z.literal("Point"),
    coordinates: z.tuple([z.number(), z.number()]),
  }),
});

export type Commune = z.infer<typeof schemaCommune>;

export function centreCommune(commune: Commune): Coordonnees {
  return commune.centre.coordinates;
}

export async function chercherCommunes(
  saisie: string,
): Promise<CommuneRecherche[]> {
  const q = saisie.trim();
  if (q.length < 2) return [];
  const critere = /^\d{5}$/.test(q)
    ? `codePostal=${q}`
    : `nom=${encodeURIComponent(q)}&boost=population`;
  const corps = await fetchJson(
    `${API_GEO}?${critere}&fields=${CHAMPS}&limit=${String(LIMITE_SUGGESTIONS)}`,
    TIMEOUT_GEO_MS,
  );
  return schemaRecherche.parse(corps);
}

export async function fetchCommune(insee: string): Promise<Commune> {
  const corps = await fetchJson(
    `${API_GEO}/${insee}?fields=${CHAMPS},centre`,
    TIMEOUT_GEO_MS,
  );
  return schemaCommune.parse(corps);
}

// Géolocalisation : geo.api.gouv.fr rend la commune contenant le point.
export async function communeAutourDe(
  coordonnees: Coordonnees,
): Promise<Commune | null> {
  const [lon, lat] = coordonnees;
  const corps = await fetchJson(
    `${API_GEO}?lon=${String(lon)}&lat=${String(lat)}&fields=${CHAMPS},centre`,
    TIMEOUT_GEO_MS,
  );
  return z.array(schemaCommune).parse(corps)[0] ?? null;
}
