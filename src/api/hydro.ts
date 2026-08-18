import * as z from "zod";
import {
  API_HUBEAU_HYDRO,
  NB_STATIONS_CONTEXTE,
  RAYON_HYDRO_KM,
  TIMEOUT_HYDRO_MS,
} from "@/lib/constantes";
import { fetchJson } from "@/lib/fetch-json";
import { distanceKm, type Coordonnees } from "@/lib/geo-utils";

const TAILLE_PAGE_STATIONS = 20;

export const schemaStationHydro = z.object({
  code_station: z.string(),
  libelle_station: z.string(),
  libelle_cours_eau: z.string().nullable(),
  libelle_commune: z.string().nullable(),
  longitude_station: z.number(),
  latitude_station: z.number(),
  en_service: z.boolean(),
});

export const schemaReponseStationsHydro = z.object({
  count: z.number(),
  data: z.array(schemaStationHydro),
});

export type StationHydro = z.infer<typeof schemaStationHydro>;

export const schemaObservationHydro = z.object({
  code_station: z.string(),
  grandeur_hydro: z.string(),
  date_obs: z.string(),
  resultat_obs: z.number(),
});

export const schemaReponseObservationsHydro = z.object({
  count: z.number(),
  data: z.array(schemaObservationHydro),
});

export type ObservationHydro = z.infer<typeof schemaObservationHydro>;

export interface DebitStation {
  code: string;
  nom: string;
  coursEau: string | null;
  commune: string | null;
  distanceKm: number;
  debitM3s: number | null;
  dateObs: string | null;
}

export async function fetchDerniereObservation(
  codeStation: string,
): Promise<ObservationHydro | null> {
  const corps = await fetchJson(
    `${API_HUBEAU_HYDRO}/observations_tr?code_entite=${codeStation}&grandeur_hydro=Q&sort=desc&size=1`,
    TIMEOUT_HYDRO_MS,
  );
  return schemaReponseObservationsHydro.parse(corps).data[0] ?? null;
}

export async function fetchDebits(
  centre: Coordonnees,
): Promise<DebitStation[]> {
  const [lon, lat] = centre;
  const corps = await fetchJson(
    `${API_HUBEAU_HYDRO}/referentiel/stations?latitude=${String(lat)}&longitude=${String(lon)}&distance=${String(RAYON_HYDRO_KM)}&en_service=true&size=${String(TAILLE_PAGE_STATIONS)}&format=json`,
    TIMEOUT_HYDRO_MS,
  );
  // Le filtre `distance` de l'API est grossier : le tri fin se fait au haversine.
  const proches = schemaReponseStationsHydro
    .parse(corps)
    .data.map((station) => ({
      station,
      distance: distanceKm(centre, [
        station.longitude_station,
        station.latitude_station,
      ]),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, NB_STATIONS_CONTEXTE);

  return Promise.all(
    proches.map(async ({ station, distance }) => {
      const observation = await fetchDerniereObservation(station.code_station);
      return {
        code: station.code_station,
        nom: station.libelle_station,
        coursEau: station.libelle_cours_eau,
        commune: station.libelle_commune,
        distanceKm: distance,
        // Hub'Eau rend le débit en L/s ; l'usage hydrologique est le m³/s.
        debitM3s: observation ? observation.resultat_obs / 1000 : null,
        dateObs: observation?.date_obs ?? null,
      };
    }),
  );
}
