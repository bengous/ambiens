import * as z from "zod";
import {
  API_HUBEAU_PIEZO,
  NB_CANDIDATS_PIEZO,
  NB_MESURES_PIEZO_MIN,
  NB_STATIONS_CONTEXTE,
  RAYON_PIEZO_KM,
  TIMEOUT_PIEZO_MS,
  UN_AN_MS,
} from "@/lib/constantes";
import { fetchJson } from "@/lib/fetch-json";
import { bboxAutour, distanceKm, type Coordonnees } from "@/lib/geo-utils";

const TAILLE_PAGE_STATIONS = 50;

// altitude_station est une chaîne sur /stations et un nombre sur /chroniques_tr :
// deux schémas distincts, jamais un schéma partagé.
export const schemaStationPiezo = z.object({
  code_bss: z.string(),
  bss_id: z.string().nullable(),
  nom_commune: z.string().nullable(),
  code_commune_insee: z.string().nullable(),
  x: z.number(),
  y: z.number(),
  altitude_station: z.string().nullable(),
  date_debut_mesure: z.string().nullable(),
  date_fin_mesure: z.string().nullable(),
  nb_mesures_piezo: z.number(),
  profondeur_investigation: z.number().nullable(),
});

export const schemaReponseStationsPiezo = z.object({
  count: z.number(),
  data: z.array(schemaStationPiezo),
});

export type StationPiezo = z.infer<typeof schemaStationPiezo>;

export const schemaChroniquePiezo = z.object({
  code_bss: z.string(),
  date_mesure: z.string(),
  niveau_eau_ngf: z.number().nullable(),
  profondeur_nappe: z.number().nullable(),
  altitude_station: z.number().nullable(),
});

export const schemaReponseChroniquesPiezo = z.object({
  count: z.number(),
  data: z.array(schemaChroniquePiezo),
});

export type ChroniquePiezo = z.infer<typeof schemaChroniquePiezo>;

export interface NiveauNappe {
  codeBss: string;
  commune: string | null;
  distanceKm: number;
  profondeurM: number | null;
  niveauNgfM: number | null;
  dateMesure: string | null;
}

export async function fetchDerniereChronique(
  codeBss: string,
): Promise<ChroniquePiezo | null> {
  const corps = await fetchJson(
    `${API_HUBEAU_PIEZO}/chroniques_tr?code_bss=${encodeURIComponent(codeBss)}&sort=desc&size=1`,
    TIMEOUT_PIEZO_MS,
  );
  return schemaReponseChroniquesPiezo.parse(corps).data[0] ?? null;
}

export interface CandidatPiezo {
  station: StationPiezo;
  distance: number;
}

// Stations encore vivantes (mesure de moins d'un an), de la plus proche à la plus loin.
export function stationsExploitables(
  stations: readonly StationPiezo[],
  centre: Coordonnees,
  maintenant: number = Date.now(),
): CandidatPiezo[] {
  const limite = maintenant - UN_AN_MS;
  return stations
    .filter((station) => {
      const fin = station.date_fin_mesure;
      return fin !== null && new Date(fin).getTime() >= limite;
    })
    .map((station) => ({
      station,
      distance: distanceKm(centre, [station.x, station.y]),
    }))
    .sort((a, b) => a.distance - b.distance);
}

export async function fetchNiveauxNappe(
  centre: Coordonnees,
): Promise<NiveauNappe[]> {
  // Piézométrie v1 ignore silencieusement latitude/longitude/distance : bbox obligatoire.
  const bbox = bboxAutour(centre, RAYON_PIEZO_KM)
    .map((valeur) => valeur.toFixed(6))
    .join(",");
  const corps = await fetchJson(
    `${API_HUBEAU_PIEZO}/stations?bbox=${bbox}&nb_mesures_piezo_min=${String(NB_MESURES_PIEZO_MIN)}&size=${String(TAILLE_PAGE_STATIONS)}&format=json`,
    TIMEOUT_PIEZO_MS,
  );
  const candidats = stationsExploitables(
    schemaReponseStationsPiezo.parse(corps).data,
    centre,
  ).slice(0, NB_CANDIDATS_PIEZO);

  // Le multi-code_bss en virgule filtre bien, mais chroniques_tr pagine par station :
  // une requête size=1 ne rendrait que la dernière mesure de la première station.
  const mesurees = await Promise.all(
    candidats.map(async ({ station, distance }) => ({
      station,
      distance,
      chronique: await fetchDerniereChronique(station.code_bss),
    })),
  );

  // Beaucoup de piézomètres vivants ne publient pas en temps réel : les stations
  // avec mesure priment sur les plus proches, sinon le panneau serait vide.
  const avecMesure = mesurees.filter(({ chronique }) => chronique !== null);
  const retenues = (avecMesure.length ? avecMesure : mesurees).slice(
    0,
    NB_STATIONS_CONTEXTE,
  );

  return retenues.map(({ station, distance, chronique }) => ({
    codeBss: station.code_bss,
    commune: station.nom_commune,
    distanceKm: distance,
    profondeurM: chronique?.profondeur_nappe ?? null,
    niveauNgfM: chronique?.niveau_eau_ngf ?? null,
    dateMesure: chronique?.date_mesure ?? null,
  }));
}
