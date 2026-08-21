export const API_GEO = "https://geo.api.gouv.fr/communes";
export const API_HUBEAU_QUALITE =
  "https://hubeau.eaufrance.fr/api/v1/qualite_eau_potable";
export const API_HUBEAU_HYDRO =
  "https://hubeau.eaufrance.fr/api/v2/hydrometrie";
export const API_HUBEAU_PIEZO =
  "https://hubeau.eaufrance.fr/api/v1/niveaux_nappes";
export const API_VIGIEAU = "https://api.vigieau.gouv.fr/api/zones";

// Origine publique figée : une invite construite en dev pointerait sinon sur
// localhost, inutilisable une fois collée dans une IA. À garder alignée sur
// `base` (vite.config.ts).
export const URL_SITE = "https://bengous.github.io/ambiens/";
export const URL_LLMS_TXT = `${URL_SITE}llms.txt`;

export const SIX_MOIS_MS = 183 * 24 * 3600 * 1000;
export const UN_AN_MS = 365 * 24 * 3600 * 1000;

export const TIMEOUT_GEO_MS = 8000;
export const TIMEOUT_QUALITE_MS = 15000;
export const TIMEOUT_VIGIEAU_MS = 8000;
export const TIMEOUT_HYDRO_MS = 10000;
export const TIMEOUT_PIEZO_MS = 10000;

export const TAILLE_LOT_HUBEAU = 8;
export const RAYON_HYDRO_KM = 20;
export const RAYON_PIEZO_KM = 15;
export const NB_STATIONS_CONTEXTE = 3;
export const NB_CANDIDATS_PIEZO = 6;
export const NB_MESURES_PIEZO_MIN = 100;
