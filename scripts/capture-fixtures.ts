// Capture des fixtures de test : requêtes réelles sur les APIs publiques.
// Lancer avec `bun scripts/capture-fixtures.ts`. Les fichiers produits sont
// committés ; les rejouer met à jour les schémas Zod face aux APIs réelles.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { bboxAutour } from "../src/lib/geo-utils.ts";

const DOSSIER = path.resolve(import.meta.dirname, "..", "tests", "fixtures");

const API_GEO = "https://geo.api.gouv.fr/communes";
const API_QUALITE = "https://hubeau.eaufrance.fr/api/v1/qualite_eau_potable";
const API_HYDRO = "https://hubeau.eaufrance.fr/api/v2/hydrometrie";
const API_PIEZO = "https://hubeau.eaufrance.fr/api/v1/niveaux_nappes";
const API_VIGIEAU = "https://api.vigieau.gouv.fr/api/zones";

const INSEE_REFERENCE = "74010"; // Annecy : plusieurs réseaux, stations proches
const COMMUNES_VIGIEAU = ["74010", "29019", "59350", "75056", "13055"];
const INSEE_SANS_RESTRICTION = "29242";

const CHAMPS_RESULTATS = [
  "code_prelevement",
  "date_prelevement",
  "libelle_parametre",
  "code_type_parametre",
  "resultat_numerique",
  "resultat_alphanumerique",
  "libelle_unite",
  "limite_qualite_parametre",
  "reference_qualite_parametre",
  "conclusion_conformite_prelevement",
  "conformite_limites_bact_prelevement",
  "conformite_limites_pc_prelevement",
  "conformite_references_bact_prelevement",
  "conformite_references_pc_prelevement",
  "nom_distributeur",
].join(",");

type Enregistrement = Record<string, unknown>;

async function getJson(url: string): Promise<unknown> {
  // fetch nu : le WAF Hub'Eau rejette le préflight déclenché par tout en-tête custom.
  const reponse = await fetch(url);
  if (!reponse.ok) {
    throw new Error(`HTTP ${String(reponse.status)} sur ${url}`);
  }
  return reponse.json();
}

async function ecrire(nom: string, valeur: unknown): Promise<void> {
  const chemin = path.join(DOSSIER, `${nom}.json`);
  await writeFile(chemin, `${JSON.stringify(valeur, null, 2)}\n`);
  console.log(`  écrit tests/fixtures/${nom}.json`);
}

function estEnregistrement(valeur: unknown): valeur is Enregistrement {
  return (
    typeof valeur === "object" && valeur !== null && !Array.isArray(valeur)
  );
}

function tableau(valeur: unknown): unknown[] {
  if (!Array.isArray(valeur)) throw new Error("Tableau attendu");
  return valeur;
}

function donnees(reponse: unknown): Enregistrement[] {
  if (!estEnregistrement(reponse))
    throw new Error("Réponse Hub'Eau inattendue");
  return tableau(reponse.data).filter((ligne) => estEnregistrement(ligne));
}

function compte(reponse: unknown): number {
  if (!estEnregistrement(reponse))
    throw new Error("Réponse Hub'Eau inattendue");
  const { count } = reponse;
  if (typeof count !== "number") throw new Error("Champ count absent");
  return count;
}

function texte(ligne: Enregistrement, cle: string): string {
  const valeur = ligne[cle];
  if (typeof valeur !== "string") {
    throw new Error(`Champ ${cle} absent ou non textuel`);
  }
  return valeur;
}

function centreCommune(commune: unknown): readonly [number, number] {
  if (!estEnregistrement(commune)) throw new Error("Commune inattendue");
  const { centre } = commune;
  if (!estEnregistrement(centre)) throw new Error("Commune sans centre");
  const coordonnees = tableau(centre.coordinates);
  const [lon, lat] = coordonnees;
  if (typeof lon !== "number" || typeof lat !== "number") {
    throw new Error("Centre de commune non numérique");
  }
  return [lon, lat];
}

await mkdir(DOSSIER, { recursive: true });

console.log("1/6 · geo.api.gouv.fr");
const SAISIE_RECHERCHE = "Saint-Martin";
const recherche = await getJson(
  `${API_GEO}?nom=${encodeURIComponent(SAISIE_RECHERCHE)}&boost=population&fields=nom,code,codesPostaux,population,codeDepartement&limit=8`,
);
console.log(
  `  recherche « ${SAISIE_RECHERCHE} » : ${String(tableau(recherche).length)} communes`,
);
await ecrire("geo-recherche", recherche);

const commune = await getJson(
  `${API_GEO}/${INSEE_REFERENCE}?fields=nom,code,codesPostaux,codeDepartement,population,centre`,
);
await ecrire("geo-commune", commune);
const centre = centreCommune(commune);
console.log(
  `  centre ${INSEE_REFERENCE} : [${String(centre[0])}, ${String(centre[1])}]`,
);

console.log("2/6 · Hub'Eau qualité — communes_udi");
const annee = new Date().getFullYear();
let udi = await getJson(
  `${API_QUALITE}/communes_udi?code_commune=${INSEE_REFERENCE}&annee=${String(annee)}&size=100`,
);
if (compte(udi) === 0) {
  console.log(`  année ${String(annee)} vide, repli sur ${String(annee - 1)}`);
  udi = await getJson(
    `${API_QUALITE}/communes_udi?code_commune=${INSEE_REFERENCE}&annee=${String(annee - 1)}&size=100`,
  );
}
console.log(`  communes_udi : count=${String(compte(udi))}`);
await ecrire("hubeau-communes-udi", udi);

console.log("3/6 · Hub'Eau qualité — resultats_dis");
const premierReseau = donnees(udi)[0];
const codeReseau = texte(premierReseau, "code_reseau");
const resultats = await getJson(
  `${API_QUALITE}/resultats_dis?code_commune=${INSEE_REFERENCE}&code_reseau=${codeReseau}&sort=desc&size=500&fields=${CHAMPS_RESULTATS}`,
);
const lignesResultats = donnees(resultats);
const prelevements = new Set(
  lignesResultats.map((ligne) => texte(ligne, "code_prelevement")),
);
console.log(
  `  réseau ${codeReseau} : count=${String(compte(resultats))}, ${String(lignesResultats.length)} lignes, ${String(prelevements.size)} prélèvements`,
);
await ecrire("hubeau-resultats-dis", resultats);

console.log("4/6 · VigiEau");
let zones: unknown = [];
let communeVigieau: string | null = null;
for (const insee of COMMUNES_VIGIEAU) {
  const candidat = await getJson(
    `${API_VIGIEAU}?commune=${insee}&zoneType=AEP`,
  );
  const nombreZones = tableau(candidat).length;
  console.log(`  commune ${insee} : ${String(nombreZones)} zone(s) AEP`);
  if (nombreZones > 0) {
    zones = candidat;
    communeVigieau = insee;
    break;
  }
}
if (communeVigieau === null) {
  throw new Error("Aucune commune avec restriction : élargir COMMUNES_VIGIEAU");
}
console.log(`  commune retenue : ${communeVigieau}`);
await ecrire("vigieau-zones", zones);

const zonesVides = await getJson(
  `${API_VIGIEAU}?commune=${INSEE_SANS_RESTRICTION}&zoneType=AEP`,
);
console.log(
  `  commune ${INSEE_SANS_RESTRICTION} : ${String(tableau(zonesVides).length)} zone(s) — cas vide`,
);
await ecrire("vigieau-zones-vide", zonesVides);

console.log("5/6 · Hub'Eau hydrométrie");
const stationsHydro = await getJson(
  `${API_HYDRO}/referentiel/stations?latitude=${String(centre[1])}&longitude=${String(centre[0])}&distance=20&en_service=true&size=20&format=json`,
);
const lignesHydro = donnees(stationsHydro);
console.log(`  stations : count=${String(compte(stationsHydro))}`);
await ecrire("hydro-stations", stationsHydro);

let observations: unknown = null;
let observationsVides: unknown = null;
for (const station of lignesHydro) {
  const code = texte(station, "code_station");
  const reponse = await getJson(
    `${API_HYDRO}/observations_tr?code_entite=${code}&grandeur_hydro=Q&sort=desc&size=1`,
  );
  const nombre = compte(reponse);
  console.log(`  observations_tr ${code} : count=${String(nombre)}`);
  if (nombre > 0 && observations === null) observations = reponse;
  else if (nombre === 0 && observationsVides === null)
    observationsVides = reponse;
  if (observations !== null && observationsVides !== null) break;
}
if (observations === null) {
  throw new Error("Aucune station hydro avec débit temps réel autour d'Annecy");
}
await ecrire("hydro-observations-tr", observations);
if (observationsVides !== null) {
  await ecrire("hydro-observations-tr-vide", observationsVides);
}

console.log("6/6 · Hub'Eau piézométrie");
const bbox = bboxAutour(centre, 15);
const stationsPiezo = await getJson(
  `${API_PIEZO}/stations?bbox=${bbox.map((n) => n.toFixed(6)).join(",")}&nb_mesures_piezo_min=100&size=50&format=json`,
);
const lignesPiezo = donnees(stationsPiezo);
console.log(`  stations : count=${String(compte(stationsPiezo))}`);
await ecrire("piezo-stations", stationsPiezo);

const codesAvecDonnees: string[] = [];
let chroniques: unknown = null;
for (const station of lignesPiezo) {
  const code = texte(station, "code_bss");
  const reponse = await getJson(
    `${API_PIEZO}/chroniques_tr?code_bss=${encodeURIComponent(code)}&sort=desc&size=1`,
  );
  const nombre = compte(reponse);
  console.log(`  chroniques_tr ${code} : count=${String(nombre)}`);
  if (nombre > 0) {
    codesAvecDonnees.push(code);
    chroniques ??= reponse;
  }
}
if (chroniques === null) {
  throw new Error(
    "Aucune station piézo avec mesure temps réel autour d'Annecy",
  );
}
await ecrire("piezo-chroniques-tr", chroniques);

// Risque 4 du plan : le multi-code_bss en virgule est-il exploitable en une requête ?
if (codesAvecDonnees.length >= 2) {
  const multi = codesAvecDonnees
    .slice(0, 3)
    .map((code) => encodeURIComponent(code))
    .join(",");
  const reponseMulti = await getJson(
    `${API_PIEZO}/chroniques_tr?code_bss=${multi}&sort=desc&size=20`,
  );
  const codesRendus = new Set(
    donnees(reponseMulti).map((ligne) => texte(ligne, "code_bss")),
  );
  console.log(
    `  multi-code_bss : count=${String(compte(reponseMulti))}, ${String(codesRendus.size)} code(s) sur ${String(codesAvecDonnees.slice(0, 3).length)} dans les 20 premières lignes`,
  );
  console.log(
    "  → le filtre virgule agrège bien les count, mais la pagination groupe par station :",
  );
  console.log(
    "    une requête size=1 ne rend que la dernière mesure de la première station.",
  );
} else {
  console.log(
    "  multi-code_bss : non testable, moins de 2 stations avec données",
  );
}

console.log("Capture terminée.");
