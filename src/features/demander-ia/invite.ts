import type { Commune } from "@/api/geo";
import type { BilanReseau, ResultatDis } from "@/api/hubeau-qualite";
import type { Restriction } from "@/api/vigieau";
import { formatEntier, formatJour, valeurMesuree } from "@/features/formats";
import { synthetiserCommune } from "@/features/verdict/synthese";
import { SIX_MOIS_MS, URL_LLMS_TXT, URL_SITE } from "@/lib/constantes";
import { formatDate, VERDICTS } from "@/lib/libelles";
import { categorieParametre, evaluerParametre, SEVERITE } from "@/lib/regles";

export interface EntreeInvite {
  commune: Commune;
  bilans: readonly BilanReseau[];
  restrictions: readonly Restriction[] | null;
  maintenant: number;
}

const MAX_DEPASSEMENTS_RESEAU = 8;
// Le plafond par réseau ne borne pas l'invite entière : quatre réseaux non
// conformes mesurent 7 000 caractères d'URL, au-delà de ce que les cibles
// acceptent. Les comptes restent complets, seul le détail s'arrête.
const MAX_DEPASSEMENTS_INVITE = 12;
const MAX_MESURES_RESEAU = 10;
const MAX_MESURES_INVITE = 16;
const MAX_USAGES = 3;
// Chaque bloc de réseau pèse jusqu'à 800 caractères sur une campagne
// pesticides : au-delà de trois, l'URL passe le budget des cibles. Les réseaux
// les plus graves sont détaillés, le reste est résumé — une non-conformité ne
// peut donc jamais disparaître du lot.
const MAX_RESEAUX_DETAILLES = 3;

// Relevé de terrain, pas un paramètre de potabilité.
const HORS_SUJET = /pluviom[ée]trie/i;

interface Depassement {
  ligne: ResultatDis;
  seuil: string;
}

function seuilDepasse(ligne: ResultatDis): string | null {
  const statut = evaluerParametre(ligne);
  if (statut === "depassement_limite") return ligne.limite_qualite_parametre;
  if (statut === "depassement_reference")
    return ligne.reference_qualite_parametre;
  return null;
}

function relever(prelevement: readonly ResultatDis[]): Depassement[] {
  const releves: Depassement[] = [];
  for (const ligne of prelevement) {
    const seuil = seuilDepasse(ligne);
    if (seuil !== null) releves.push({ ligne, seuil });
  }
  return releves;
}

function decrireDepassements(
  releves: readonly Depassement[],
  quota: number,
): string {
  const listes = releves
    .slice(0, quota)
    .map(
      ({ ligne, seuil }) =>
        `${ligne.libelle_parametre ?? "Paramètre non nommé"} ${valeurMesuree(ligne)} (seuil ${seuil})`,
    )
    .join(" ; ");
  const reste = releves.length - quota;
  return reste > 0 ? `${listes} ; et ${String(reste)} autres` : listes;
}

// « <0,005 µg/L » : la substance a été cherchée sans être trouvée. Ces lignes
// se comptent, elles ne se listent pas — une campagne pesticides en aligne
// trois cents pour la même information.
function estQuantifie(ligne: ResultatDis): boolean {
  const valeur = ligne.resultat_alphanumerique;
  return valeur !== null && valeur !== "" && !valeur.startsWith("<");
}

interface Mesures {
  quantifiees: ResultatDis[];
  nonDetectes: number;
}

function trierMesures(prelevement: readonly ResultatDis[]): Mesures {
  const retenues = new Map<string, ResultatDis>();
  let nonDetectes = 0;
  for (const ligne of prelevement) {
    const nom = ligne.libelle_parametre;
    if (nom === null || HORS_SUJET.test(nom)) continue;
    if (seuilDepasse(ligne) !== null) continue;
    if (!estQuantifie(ligne)) {
      nonDetectes += 1;
      continue;
    }
    // Un même paramètre revient parfois deux fois dans un prélèvement
    // (Conductivité 572 puis 567) : la première mesure suffit.
    if (!retenues.has(nom)) retenues.set(nom, ligne);
  }
  const quantifiees = [...retenues.values()].sort(
    (a, b) => Number(estReglemente(b)) - Number(estReglemente(a)),
  );
  return { quantifiees, nonDetectes };
}

function estReglemente(ligne: ResultatDis): boolean {
  return (
    ligne.limite_qualite_parametre !== null ||
    ligne.reference_qualite_parametre !== null
  );
}

function decrireMesures(
  quantifiees: readonly ResultatDis[],
  quota: number,
): string {
  const listes = quantifiees
    .slice(0, quota)
    .map((ligne) => {
      const seuil =
        ligne.limite_qualite_parametre ?? ligne.reference_qualite_parametre;
      const valeur = `${ligne.libelle_parametre ?? ""} ${valeurMesuree(ligne)}`;
      return seuil === null ? valeur : `${valeur} (seuil ${seuil})`;
    })
    .join(" ; ");
  const reste = quantifiees.length - quota;
  return reste > 0 ? `${listes} ; et ${String(reste)} autres` : listes;
}

function compterCategories(prelevement: readonly ResultatDis[]): string {
  const comptes = new Map<string, number>();
  for (const ligne of prelevement) {
    const categorie = categorieParametre(ligne);
    comptes.set(categorie, (comptes.get(categorie) ?? 0) + 1);
  }
  return [...comptes]
    .map(([categorie, n]) => `${String(n)} ${categorie.toLowerCase()}`)
    .join(", ");
}

interface QuotasReseau {
  depassements: number;
  mesures: number;
}

function decrireReseau(
  { reseau, prelevement, evaluation }: BilanReseau,
  releves: readonly Depassement[],
  mesures: Mesures,
  quotas: QuotasReseau,
  maintenant: number,
): string {
  const quartier = reseau.quartier === null ? "" : ` (${reseau.quartier})`;
  if (prelevement === null) {
    return `Réseau ${reseau.nom}${quartier} : aucun résultat de contrôle.`;
  }
  const temoin = prelevement[0];
  const distributeur =
    temoin.nom_distributeur === null
      ? ""
      : `, distributeur ${temoin.nom_distributeur}`;
  const total = prelevement.length;
  const pluriel = total > 1 ? "s" : "";
  const ancien =
    maintenant - new Date(temoin.date_prelevement).getTime() > SIX_MOIS_MS;

  return [
    `Réseau ${reseau.nom}${quartier} — prélèvement du ${formatJour(temoin.date_prelevement)}${distributeur}.`,
    temoin.conclusion_conformite_prelevement
      ? `Conclusion ARS : « ${temoin.conclusion_conformite_prelevement} »`
      : null,
    `Verdict : ${VERDICTS[evaluation.verdict].libelle}. ${String(total)} paramètre${pluriel} analysé${pluriel} (${compterCategories(prelevement)}), ${String(releves.length)} dépassement${releves.length > 1 ? "s" : ""}.`,
    quotas.depassements > 0
      ? `Dépassements : ${decrireDepassements(releves, quotas.depassements)}`
      : null,
    quotas.mesures > 0
      ? `Mesures : ${decrireMesures(mesures.quantifiees, quotas.mesures)}`
      : null,
    mesures.nonDetectes > 0
      ? `Non détectés : ${String(mesures.nonDetectes)} paramètre${mesures.nonDetectes > 1 ? "s" : ""} sous le seuil de quantification.`
      : null,
    evaluation.desaccord
      ? "Désaccord : l'ARS conclut conforme mais le recalcul local détecte un dépassement de limite."
      : null,
    ancien
      ? "Fraîcheur : prélèvement de plus de six mois, la situation a pu évoluer depuis."
      : null,
  ]
    .filter((ligne) => ligne !== null)
    .join("\n");
}

function resumerReste(restants: readonly BilanReseau[]): string {
  const comptes = new Map<string, number>();
  for (const { evaluation } of restants) {
    const libelle = VERDICTS[evaluation.verdict].libelle;
    comptes.set(libelle, (comptes.get(libelle) ?? 0) + 1);
  }
  const detail = [...comptes]
    .map(([libelle, n]) => `${String(n)} ${libelle.toLowerCase()}`)
    .join(", ");
  return `Et ${String(restants.length)} autres réseaux, non détaillés ici : ${detail}.`;
}

function decrireReseaux(
  bilans: readonly BilanReseau[],
  maintenant: number,
): string[] {
  let budgetDepassements = MAX_DEPASSEMENTS_INVITE;
  let budgetMesures = MAX_MESURES_INVITE;
  const parGravite = [...bilans].sort(
    (a, b) => SEVERITE[b.evaluation.verdict] - SEVERITE[a.evaluation.verdict],
  );
  const detailles = parGravite.slice(0, MAX_RESEAUX_DETAILLES);
  const restants = parGravite.slice(MAX_RESEAUX_DETAILLES);
  const blocs: string[] = [];
  let restantsADecrire = detailles.length;
  for (const bilan of detailles) {
    const vide = bilan.prelevement === null;
    const releves = vide ? [] : relever(bilan.prelevement ?? []);
    const mesures = vide
      ? { quantifiees: [], nonDetectes: 0 }
      : trierMesures(bilan.prelevement ?? []);
    const quotas = {
      depassements: Math.min(
        releves.length,
        MAX_DEPASSEMENTS_RESEAU,
        budgetDepassements,
      ),
      // Part équitable du budget restant, reliquat des voisins compris : sans
      // cela le premier réseau absorbe tout et le dernier n'affiche aucune
      // mesure.
      mesures: Math.min(
        mesures.quantifiees.length,
        MAX_MESURES_RESEAU,
        Math.ceil(budgetMesures / restantsADecrire),
      ),
    };
    budgetDepassements -= quotas.depassements;
    budgetMesures -= quotas.mesures;
    restantsADecrire -= 1;
    blocs.push(decrireReseau(bilan, releves, mesures, quotas, maintenant));
  }
  if (restants.length > 0) blocs.push(resumerReste(restants));
  return blocs;
}

function decrireSecheresse(
  restrictions: readonly Restriction[] | null,
): string | null {
  if (!restrictions?.length) return null;
  const pire = restrictions.reduce((max, zone) =>
    zone.ordre > max.ordre ? zone : max,
  );
  const usages = pire.usagesParticuliers
    .slice(0, MAX_USAGES)
    .map((usage) => `${usage.nom} : ${usage.description}`)
    .join(" ; ");
  const entete = `Sécheresse (VigiEau) : ${pire.libelleNiveau} — ${pire.nom}.`;
  if (usages === "") return entete;
  const reste = pire.usagesParticuliers.length - MAX_USAGES;
  const suite = reste > 0 ? ` ; et ${String(reste)} autres` : "";
  return `${entete}\nUsages restreints : ${usages}${suite}`;
}

// « à » et non « de » : l'élision (d'Annecy, d'Ajaccio) est un piège sur
// 35 000 noms de communes.
export function construireInvite({
  commune,
  bilans,
  restrictions,
  maintenant,
}: EntreeInvite): string {
  const synthese = synthetiserCommune(bilans);
  const lieu = `${commune.nom} (${commune.codeDepartement})`;
  const habitants =
    commune.population === undefined
      ? ""
      : ` ${formatEntier(commune.population)} habitants.`;
  const donnees = [
    `Commune : ${lieu}, code INSEE ${commune.code}.${habitants} Verdict global : ${VERDICTS[synthese.verdict].libelle}.`,
    ...decrireReseaux(bilans, maintenant),
    decrireSecheresse(restrictions),
  ].filter((ligne) => ligne !== null);

  return `<tache>
Analyse ces résultats du contrôle sanitaire de l'eau à ${lieu} et explique-moi ce qu'ils impliquent concrètement. Les données sont déjà collectées : ne les recalcule pas. La seule recherche utile en plus : des alertes sanitaires récentes pour cette commune (ARS, préfecture, presse locale). Nous sommes le ${formatDate.format(new Date(maintenant))}.
</tache>

<donnees>
${donnees.join("\n")}
</donnees>

<source>
${URL_LLMS_TXT} — méthode et APIs publiques, pour expliquer les données, les analyser et approfondir.
</source>

<page>
${URL_SITE}?commune=${commune.code}
</page>`;
}
