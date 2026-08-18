import { expect, test } from "vitest";
import hubeauResultatsDis from "../../tests/fixtures/hubeau-resultats-dis.json";
import {
  dedupliquerReseaux,
  grouperDernierPrelevement,
  parLots,
  schemaReponseResultats,
  type CommuneUdi,
} from "./hubeau-qualite";

const ligneUdi = (surcharges: Partial<CommuneUdi>): CommuneUdi => ({
  code_commune: "74010",
  code_reseau: "074000198",
  nom_reseau: "SEYNOD RESEAU HAUT-SERVICE",
  nom_quartier: "-",
  annee: "2026",
  ...surcharges,
});

test("dedupliquerReseaux garde un seul réseau par code", () => {
  const reseaux = dedupliquerReseaux([
    ligneUdi({}),
    ligneUdi({ nom_quartier: "SEYNOD BAS" }),
    ligneUdi({ code_reseau: "074001172", nom_reseau: "QUINTAL" }),
  ]);
  expect(reseaux).toHaveLength(2);
  expect(reseaux.map((reseau) => reseau.code)).toEqual([
    "074000198",
    "074001172",
  ]);
});

test("dedupliquerReseaux traite le quartier « - » comme absent", () => {
  expect(dedupliquerReseaux([ligneUdi({})])[0].quartier).toBeNull();
  expect(
    dedupliquerReseaux([ligneUdi({ nom_quartier: "SEYNOD BAS" })])[0].quartier,
  ).toBe("SEYNOD BAS");
});

test("grouperDernierPrelevement rend le prélèvement le plus récent en entier", () => {
  const lignes = schemaReponseResultats.parse(hubeauResultatsDis).data;
  const dernier = grouperDernierPrelevement(lignes);

  expect(dernier).not.toBeNull();
  const codes = new Set(dernier?.map((ligne) => ligne.code_prelevement));
  expect(codes.size).toBe(1);

  const dateRetenue = dernier?.[0].date_prelevement ?? "";
  const dateMax = lignes
    .map((ligne) => ligne.date_prelevement)
    .reduce((max, date) => (date > max ? date : max), "");
  expect(dateRetenue).toBe(dateMax);
  expect(dernier?.length).toBe(
    lignes.filter((ligne) => ligne.date_prelevement === dateMax).length,
  );
});

test("grouperDernierPrelevement rend null sans aucune ligne", () => {
  expect(grouperDernierPrelevement([])).toBeNull();
});

test("parLots conserve l'ordre et plafonne la concurrence", async () => {
  const elements = Array.from({ length: 20 }, (_, i) => i);
  let enCours = 0;
  let maxEnCours = 0;

  const resultats = await parLots(elements, 8, async (n) => {
    enCours += 1;
    maxEnCours = Math.max(maxEnCours, enCours);
    await new Promise<void>((resolve) => setTimeout(resolve, 1));
    enCours -= 1;
    return n * 2;
  });

  expect(resultats).toEqual(elements.map((n) => n * 2));
  expect(maxEnCours).toBe(8);
});
