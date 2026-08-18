import { describe, expect, it } from "vitest";
import {
  categorieParametre,
  evaluerParametre,
  parseSeuil,
  respecte,
  verdictCommune,
  verdictReseau,
  type LigneConformite,
  type LigneEvaluable,
} from "./regles";

describe("parseSeuil", () => {
  it("parse une limite bactériologique simple", () => {
    expect(parseSeuil("<=0 n/(100mL)")).toEqual([{ op: "<=", seuil: 0 }]);
  });

  it("parse un intervalle pH avec virgules décimales françaises", () => {
    expect(parseSeuil(">=6,5 et <=9 unitépH")).toEqual([
      { op: ">=", seuil: 6.5 },
      { op: "<=", seuil: 9 },
    ]);
  });

  it("parse une limite stricte avec virgule", () => {
    expect(parseSeuil("<0,1 µg/L")).toEqual([{ op: "<", seuil: 0.1 }]);
  });

  it("retourne null quand aucun seuil exploitable", () => {
    expect(parseSeuil(null)).toBeNull();
    expect(parseSeuil("")).toBeNull();
    expect(parseSeuil("SANS OBJET")).toBeNull();
  });
});

describe("respecte", () => {
  it("accepte un pH dans l'intervalle", () => {
    expect(respecte(7.2, parseSeuil(">=6,5 et <=9 unitépH") ?? [])).toBe(true);
  });

  it("rejette un pH hors intervalle", () => {
    expect(respecte(9.5, parseSeuil(">=6,5 et <=9 unitépH") ?? [])).toBe(false);
    expect(respecte(6.0, parseSeuil(">=6,5 et <=9 unitépH") ?? [])).toBe(false);
  });
});

const ligneEvaluable = (
  surcharges: Partial<LigneEvaluable>,
): LigneEvaluable => ({
  code_type_parametre: "N",
  resultat_numerique: 0,
  limite_qualite_parametre: null,
  reference_qualite_parametre: null,
  ...surcharges,
});

describe("evaluerParametre", () => {
  it("déclare conforme E. coli à 0 avec limite <=0", () => {
    expect(
      evaluerParametre(
        ligneEvaluable({ limite_qualite_parametre: "<=0 n/(100mL)" }),
      ),
    ).toBe("conforme");
  });

  it("détecte un dépassement de limite (nitrates à 60 pour <=50)", () => {
    expect(
      evaluerParametre(
        ligneEvaluable({
          resultat_numerique: 60,
          limite_qualite_parametre: "<=50 mg/L",
        }),
      ),
    ).toBe("depassement_limite");
  });

  it("détecte un dépassement de référence sans limite", () => {
    expect(
      evaluerParametre(
        ligneEvaluable({
          resultat_numerique: 300,
          reference_qualite_parametre: "<=250 mg/L",
        }),
      ),
    ).toBe("depassement_reference");
  });

  it("n'évalue pas les paramètres qualitatifs (code O)", () => {
    expect(evaluerParametre(ligneEvaluable({ code_type_parametre: "O" }))).toBe(
      "non_evalue",
    );
  });

  it("n'évalue pas sans seuil disponible", () => {
    expect(evaluerParametre(ligneEvaluable({ resultat_numerique: 42 }))).toBe(
      "non_evalue",
    );
  });
});

describe("verdictReseau", () => {
  const prelevement = (
    champs: Partial<LigneEvaluable & LigneConformite>,
    lignes: (LigneEvaluable & LigneConformite)[] = [],
  ): (LigneEvaluable & LigneConformite)[] => [
    {
      conformite_limites_bact_prelevement: "",
      conformite_limites_pc_prelevement: "",
      conformite_references_bact_prelevement: "",
      conformite_references_pc_prelevement: "",
      ...ligneEvaluable({}),
      ...champs,
    },
    ...lignes,
  ];

  it("suit la conclusion officielle non conforme", () => {
    expect(
      verdictReseau(prelevement({ conformite_limites_bact_prelevement: "N" }))
        .verdict,
    ).toBe("non_conforme");
  });

  it("officiel conforme + référence dépassée officielle = avec réserves", () => {
    expect(
      verdictReseau(
        prelevement({
          conformite_limites_bact_prelevement: "C",
          conformite_references_pc_prelevement: "N",
        }),
      ).verdict,
    ).toBe("avec_reserves");
  });

  it("officiel muet + recalcul en dépassement de limite = non conforme", () => {
    expect(
      verdictReseau(
        prelevement({
          resultat_numerique: 60,
          limite_qualite_parametre: "<=50 mg/L",
        }),
      ).verdict,
    ).toBe("non_conforme");
  });

  it("signale le désaccord quand l'officiel dit conforme mais le recalcul dépasse", () => {
    const resultat = verdictReseau(
      prelevement({
        conformite_limites_bact_prelevement: "C",
        conformite_limites_pc_prelevement: "C",
        resultat_numerique: 60,
        limite_qualite_parametre: "<=50 mg/L",
      }),
    );
    expect(resultat.verdict).toBe("conforme");
    expect(resultat.desaccord).toBe(true);
  });

  it("tout vide et sans seuil = indéterminé", () => {
    expect(verdictReseau(prelevement({})).verdict).toBe("indetermine");
  });
});

describe("verdictCommune", () => {
  it("retient le pire des réseaux", () => {
    expect(verdictCommune(["conforme", "avec_reserves"])).toBe("avec_reserves");
    expect(verdictCommune(["conforme", "non_conforme", "avec_reserves"])).toBe(
      "non_conforme",
    );
    expect(verdictCommune(["conforme"])).toBe("conforme");
  });

  it("indéterminé sans aucun réseau", () => {
    expect(verdictCommune([])).toBe("indetermine");
  });
});

describe("categorieParametre", () => {
  it("classe les paramètres bactériologiques en microbiologie", () => {
    expect(
      categorieParametre({
        libelle_parametre: "Escherichia coli /100ml - MF",
        code_type_parametre: "N",
      }),
    ).toBe("Microbiologie");
  });

  it("classe les paramètres qualitatifs en observations", () => {
    expect(
      categorieParametre({
        libelle_parametre: "Odeur (qualitatif)",
        code_type_parametre: "O",
      }),
    ).toBe("Observations");
  });

  it("classe le reste en physico-chimie", () => {
    expect(
      categorieParametre({
        libelle_parametre: "Nitrates (en NO3)",
        code_type_parametre: "N",
      }),
    ).toBe("Physico-chimie");
  });
});
