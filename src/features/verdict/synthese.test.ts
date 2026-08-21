import { expect, test } from "vitest";
import type { BilanReseau, ResultatDis } from "@/api/hubeau-qualite";
import { synthetiserCommune } from "@/features/verdict/synthese";

function ligne(date: string): ResultatDis {
  return {
    code_prelevement: `P-${date}`,
    date_prelevement: date,
    libelle_parametre: "Paramètre",
    code_type_parametre: "N",
    resultat_numerique: 0,
    resultat_alphanumerique: "0",
    libelle_unite: "SANS OBJET",
    limite_qualite_parametre: null,
    reference_qualite_parametre: null,
    conclusion_conformite_prelevement: null,
    conformite_limites_bact_prelevement: "C",
    conformite_limites_pc_prelevement: "C",
    conformite_references_bact_prelevement: "C",
    conformite_references_pc_prelevement: "C",
    nom_distributeur: "Distributeur",
  };
}

function bilan(
  nom: string,
  verdict: BilanReseau["evaluation"]["verdict"],
  date: string | null,
): BilanReseau {
  return {
    reseau: { code: nom, nom, quartier: null },
    prelevement: date === null ? null : [ligne(date)],
    evaluation: { verdict, desaccord: false },
  };
}

test("le pire verdict des réseaux devient celui de la commune", () => {
  const synthese = synthetiserCommune([
    bilan("A", "conforme", "2026-04-09T09:00:00Z"),
    bilan("B", "non_conforme", "2026-03-02T09:00:00Z"),
    bilan("C", "avec_reserves", "2026-02-01T09:00:00Z"),
  ]);
  expect(synthese.verdict).toBe("non_conforme");
});

test("un réseau sans prélèvement sort du verdict mais compte dans le total", () => {
  const synthese = synthetiserCommune([
    bilan("A", "conforme", "2026-04-09T09:00:00Z"),
    bilan("B", "indetermine", null),
  ]);
  expect(synthese.verdict).toBe("conforme");
  expect(synthese.avecDonnees).toBe(1);
  expect(synthese.total).toBe(2);
});

test("la date la plus récente est prise tous réseaux confondus", () => {
  const synthese = synthetiserCommune([
    bilan("A", "conforme", "2026-01-05T09:00:00Z"),
    bilan("B", "conforme", "2026-06-30T09:00:00Z"),
    bilan("C", "conforme", "2026-03-12T09:00:00Z"),
  ]);
  expect(synthese.plusRecent).toBe("2026-06-30T09:00:00Z");
});

test("sans aucun bilan, la synthèse est vide et indéterminée", () => {
  expect(synthetiserCommune([])).toStrictEqual({
    verdict: "indetermine",
    plusRecent: null,
    avecDonnees: 0,
    total: 0,
  });
});
