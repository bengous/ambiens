import { expect, test } from "vitest";
import piezoStations from "../../tests/fixtures/piezo-stations.json";
import type { Coordonnees } from "@/lib/geo-utils";
import {
  schemaReponseStationsPiezo,
  stationsExploitables,
  type StationPiezo,
} from "./piezo";

const ANNECY: Coordonnees = [6.1264, 45.9024];

const stations = (): StationPiezo[] =>
  schemaReponseStationsPiezo.parse(piezoStations).data;

test("stationsExploitables trie les stations vivantes par distance", () => {
  // Fixture capturée le 18/08/2026 : toutes les stations mesurent encore.
  const candidats = stationsExploitables(
    stations(),
    ANNECY,
    Date.parse("2026-08-18T00:00:00Z"),
  );

  expect(candidats).toHaveLength(stations().length);
  const distances = candidats.map((candidat) => candidat.distance);
  expect(distances).toEqual([...distances].sort((a, b) => a - b));
});

test("stationsExploitables écarte les stations arrêtées depuis plus d'un an", () => {
  const candidats = stationsExploitables(
    stations(),
    ANNECY,
    Date.parse("2027-06-01T00:00:00Z"),
  );

  expect(candidats.length).toBeLessThan(stations().length);
  expect(
    candidats.every(
      ({ station }) =>
        station.date_fin_mesure !== null &&
        station.date_fin_mesure >= "2026-06-01",
    ),
  ).toBe(true);
});
