import * as z from "zod";
import {
  API_HUBEAU_QUALITE,
  TAILLE_LOT_HUBEAU,
  TIMEOUT_QUALITE_MS,
} from "@/lib/constantes";
import { fetchJson } from "@/lib/fetch-json";
import { verdictReseau, type Evaluation, type Reseau } from "@/lib/regles";

// Les 15 champs réellement consommés : resultats_dis rend sinon 40 champs par ligne.
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

const TAILLE_PAGE_RESULTATS = 500;

export const RESEAU_NON_IDENTIFIE: Reseau = {
  code: null,
  nom: "Réseau non identifié",
  quartier: null,
};

export const schemaCommuneUdi = z.object({
  code_commune: z.string(),
  code_reseau: z.string(),
  nom_reseau: z.string(),
  nom_quartier: z.string().nullable(),
  annee: z.string(),
});

export const schemaReponseUdi = z.object({
  count: z.number(),
  data: z.array(schemaCommuneUdi),
});

export type CommuneUdi = z.infer<typeof schemaCommuneUdi>;

export const schemaResultatDis = z.object({
  code_prelevement: z.string(),
  date_prelevement: z.string(),
  libelle_parametre: z.string().nullable(),
  code_type_parametre: z.string().nullable(),
  resultat_numerique: z.number().nullable(),
  resultat_alphanumerique: z.string().nullable(),
  libelle_unite: z.string().nullable(),
  limite_qualite_parametre: z.string().nullable(),
  reference_qualite_parametre: z.string().nullable(),
  conclusion_conformite_prelevement: z.string().nullable(),
  conformite_limites_bact_prelevement: z.string().nullable(),
  conformite_limites_pc_prelevement: z.string().nullable(),
  conformite_references_bact_prelevement: z.string().nullable(),
  conformite_references_pc_prelevement: z.string().nullable(),
  nom_distributeur: z.string().nullable(),
});

export const schemaReponseResultats = z.object({
  count: z.number(),
  data: z.array(schemaResultatDis),
});

export type ResultatDis = z.infer<typeof schemaResultatDis>;

export interface BilanReseau {
  reseau: Reseau;
  prelevement: ResultatDis[] | null;
  evaluation: Evaluation;
}

// communes_udi rend une ligne par année ET par quartier : le même réseau revient
// plusieurs fois pour une commune découpée.
export function dedupliquerReseaux(lignes: readonly CommuneUdi[]): Reseau[] {
  const parCode = new Map<string, Reseau>();
  for (const ligne of lignes) {
    if (parCode.has(ligne.code_reseau)) continue;
    const quartier = ligne.nom_quartier;
    parCode.set(ligne.code_reseau, {
      code: ligne.code_reseau,
      nom: ligne.nom_reseau,
      quartier: quartier && quartier !== "-" ? quartier : null,
    });
  }
  return [...parCode.values()];
}

export async function fetchReseaux(insee: string): Promise<Reseau[]> {
  const anneeCourante = new Date().getFullYear();
  for (const annee of [anneeCourante, anneeCourante - 1]) {
    const corps = await fetchJson(
      `${API_HUBEAU_QUALITE}/communes_udi?code_commune=${insee}&annee=${String(annee)}&size=100`,
      TIMEOUT_QUALITE_MS,
    );
    const reponse = schemaReponseUdi.parse(corps);
    if (reponse.count > 0) return dedupliquerReseaux(reponse.data);
  }
  return [];
}

// Un prélèvement = N lignes (une par paramètre) partageant le même code_prelevement.
export function grouperDernierPrelevement(
  lignes: readonly ResultatDis[],
): ResultatDis[] | null {
  const parPrelevement = new Map<string, ResultatDis[]>();
  for (const ligne of lignes) {
    const groupe = parPrelevement.get(ligne.code_prelevement);
    if (groupe) groupe.push(ligne);
    else parPrelevement.set(ligne.code_prelevement, [ligne]);
  }
  let dernier: ResultatDis[] | null = null;
  for (const groupe of parPrelevement.values()) {
    // dates ISO 8601 UTC : la comparaison lexicographique suffit
    if (!dernier || groupe[0].date_prelevement > dernier[0].date_prelevement) {
      dernier = groupe;
    }
  }
  return dernier;
}

export async function fetchDernierPrelevement(
  insee: string,
  codeReseau: string | null,
): Promise<ResultatDis[] | null> {
  const filtreReseau = codeReseau === null ? "" : `&code_reseau=${codeReseau}`;
  const corps = await fetchJson(
    `${API_HUBEAU_QUALITE}/resultats_dis?code_commune=${insee}${filtreReseau}&sort=desc&size=${String(TAILLE_PAGE_RESULTATS)}&fields=${CHAMPS_RESULTATS}`,
    TIMEOUT_QUALITE_MS,
  );
  return grouperDernierPrelevement(schemaReponseResultats.parse(corps).data);
}

// Lots de requêtes parallèles plafonnés (convention Hub'Eau : rester sous ~10 req/s).
export async function parLots<T, R>(
  elements: readonly T[],
  taille: number,
  fn: (element: T) => Promise<R>,
): Promise<R[]> {
  const resultats: R[] = [];
  for (let i = 0; i < elements.length; i += taille) {
    const lot = await Promise.all(
      elements.slice(i, i + taille).map((element) => fn(element)),
    );
    resultats.push(...lot);
  }
  return resultats;
}

export async function fetchBilansCommune(
  insee: string,
): Promise<BilanReseau[]> {
  const trouves = await fetchReseaux(insee);
  // Repli : certaines communes ont des résultats sans référencement d'UDI.
  const reseaux = trouves.length ? trouves : [RESEAU_NON_IDENTIFIE];
  const prelevements = await parLots(reseaux, TAILLE_LOT_HUBEAU, (reseau) =>
    fetchDernierPrelevement(insee, reseau.code),
  );
  return reseaux.map((reseau, i) => {
    const prelevement = prelevements[i];
    return {
      reseau,
      prelevement,
      evaluation: prelevement
        ? verdictReseau(prelevement)
        : { verdict: "indetermine", desaccord: false },
    };
  });
}
