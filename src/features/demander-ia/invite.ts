import type { Commune } from "@/api/geo";
import type { BilanReseau, ResultatDis } from "@/api/hubeau-qualite";
import type { Restriction } from "@/api/vigieau";
import { formatJour, valeurMesuree } from "@/features/formats";
import { synthetiserCommune } from "@/features/verdict/synthese";
import { URL_LLMS_TXT, URL_SITE } from "@/lib/constantes";
import { VERDICTS } from "@/lib/libelles";
import { evaluerParametre } from "@/lib/regles";

export interface EntreeInvite {
  commune: Commune;
  bilans: readonly BilanReseau[];
  restrictions: readonly Restriction[] | null;
}

const MAX_DEPASSEMENTS_RESEAU = 8;
// Le plafond par réseau ne borne pas l'invite entière : quatre réseaux non
// conformes mesurent 7 000 caractères d'URL, au-delà de ce que les cibles
// acceptent. Les comptes restent complets, seul le détail s'arrête.
const MAX_DEPASSEMENTS_INVITE = 12;

interface Depassement {
  ligne: ResultatDis;
  seuil: string;
}

function relever(prelevement: readonly ResultatDis[]): Depassement[] {
  const releves: Depassement[] = [];
  for (const ligne of prelevement) {
    const statut = evaluerParametre(ligne);
    const seuil =
      statut === "depassement_limite"
        ? ligne.limite_qualite_parametre
        : statut === "depassement_reference"
          ? ligne.reference_qualite_parametre
          : null;
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

function decrireReseau(
  { reseau, prelevement, evaluation }: BilanReseau,
  releves: readonly Depassement[],
  quota: number,
): string {
  if (prelevement === null) {
    return `Réseau ${reseau.nom} : aucun résultat de contrôle.`;
  }
  const temoin = prelevement[0];
  const distributeur =
    temoin.nom_distributeur === null
      ? ""
      : `, distributeur ${temoin.nom_distributeur}`;
  const conclusion = temoin.conclusion_conformite_prelevement;
  const total = prelevement.length;

  return [
    `Réseau ${reseau.nom} — prélèvement du ${formatJour(temoin.date_prelevement)}${distributeur}.`,
    conclusion ? `Conclusion ARS : « ${conclusion} »` : null,
    `Verdict : ${VERDICTS[evaluation.verdict].libelle}. ${String(total)} paramètre${total > 1 ? "s" : ""} analysé${total > 1 ? "s" : ""}, ${String(releves.length)} dépassement${releves.length > 1 ? "s" : ""}.`,
    quota > 0 ? `Dépassements : ${decrireDepassements(releves, quota)}` : null,
    evaluation.desaccord
      ? "Désaccord : l'ARS conclut conforme mais le recalcul local détecte un dépassement de limite."
      : null,
  ]
    .filter((ligne) => ligne !== null)
    .join("\n");
}

function decrireReseaux(bilans: readonly BilanReseau[]): string[] {
  let budget = MAX_DEPASSEMENTS_INVITE;
  const blocs: string[] = [];
  for (const bilan of bilans) {
    const releves =
      bilan.prelevement === null ? [] : relever(bilan.prelevement);
    const quota = Math.min(releves.length, MAX_DEPASSEMENTS_RESEAU, budget);
    budget -= quota;
    blocs.push(decrireReseau(bilan, releves, quota));
  }
  return blocs;
}

function decrireSecheresse(
  restrictions: readonly Restriction[] | null,
): string | null {
  if (!restrictions?.length) return null;
  const pire = restrictions.reduce((max, zone) =>
    zone.ordre > max.ordre ? zone : max,
  );
  return `Sécheresse (VigiEau) : ${pire.libelleNiveau} — ${pire.nom}.`;
}

// « à » et non « de » : l'élision (d'Annecy, d'Ajaccio) est un piège sur
// 35 000 noms de communes.
export function construireInvite({
  commune,
  bilans,
  restrictions,
}: EntreeInvite): string {
  const synthese = synthetiserCommune(bilans);
  const lieu = `${commune.nom} (${commune.codeDepartement})`;
  const donnees = [
    `Commune : ${lieu}, code INSEE ${commune.code}. Verdict global : ${VERDICTS[synthese.verdict].libelle}.`,
    ...decrireReseaux(bilans),
    decrireSecheresse(restrictions),
  ].filter((ligne) => ligne !== null);

  return `<tache>
Analyse ces résultats du contrôle sanitaire de l'eau à ${lieu} et explique-moi ce qu'ils impliquent concrètement. Les données sont déjà collectées : ne les recalcule pas. La seule recherche utile en plus : des alertes sanitaires récentes pour cette commune (ARS, préfecture, presse locale).
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
