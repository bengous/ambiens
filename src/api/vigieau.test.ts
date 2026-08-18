import { afterEach, expect, test, vi } from "vitest";
import vigieauZones from "../../tests/fixtures/vigieau-zones.json";
import vigieauZonesVide from "../../tests/fixtures/vigieau-zones-vide.json";
import { fetchRestrictions, mapperZone, schemaZones } from "./vigieau";

function stubFetch(corps: unknown): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(corps),
      } as unknown as Response),
    ),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

test("mapperZone traduit le niveau de gravité et retient les usages particuliers", () => {
  const zone = schemaZones.parse(vigieauZones)[0];
  const restriction = mapperZone(zone);

  expect(restriction.niveau).toBe(zone.niveauGravite);
  expect(restriction.libelleNiveau).not.toBe("");
  expect(restriction.ordre).toBeGreaterThanOrEqual(0);
  expect(restriction.usagesParticuliers.length).toBeGreaterThan(0);
  expect(restriction.usagesParticuliers.length).toBeLessThanOrEqual(
    zone.usages.length,
  );
});

test("mapperZone couvre les quatre niveaux de gravité", () => {
  const zone = schemaZones.parse(vigieauZones)[0];
  const libelles = (
    ["vigilance", "alerte", "alerte_renforcee", "crise"] as const
  ).map((niveau) => mapperZone({ ...zone, niveauGravite: niveau }));

  expect(libelles.map((r) => r.libelleNiveau)).toEqual([
    "Vigilance",
    "Alerte",
    "Alerte renforcée",
    "Crise",
  ]);
  expect(libelles.map((r) => r.ordre)).toEqual([0, 1, 2, 3]);
});

test("fetchRestrictions rend les zones triées par gravité décroissante", async () => {
  stubFetch(vigieauZones);
  const restrictions = await fetchRestrictions("74010");

  expect(restrictions.length).toBeGreaterThan(0);
  const ordres = restrictions.map((restriction) => restriction.ordre);
  expect(ordres).toEqual([...ordres].sort((a, b) => b - a));
});

test("fetchRestrictions rend un tableau vide sans restriction, pas une erreur", async () => {
  stubFetch(vigieauZonesVide);
  await expect(fetchRestrictions("29242")).resolves.toEqual([]);
});
