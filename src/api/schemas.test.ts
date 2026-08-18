import { expect, test } from "vitest";
import geoCommune from "../../tests/fixtures/geo-commune.json";
import geoRecherche from "../../tests/fixtures/geo-recherche.json";
import hubeauCommunesUdi from "../../tests/fixtures/hubeau-communes-udi.json";
import hubeauResultatsDis from "../../tests/fixtures/hubeau-resultats-dis.json";
import hydroObservations from "../../tests/fixtures/hydro-observations-tr.json";
import hydroObservationsVide from "../../tests/fixtures/hydro-observations-tr-vide.json";
import hydroStations from "../../tests/fixtures/hydro-stations.json";
import piezoChroniques from "../../tests/fixtures/piezo-chroniques-tr.json";
import piezoStations from "../../tests/fixtures/piezo-stations.json";
import vigieauZones from "../../tests/fixtures/vigieau-zones.json";
import vigieauZonesVide from "../../tests/fixtures/vigieau-zones-vide.json";
import { schemaCommune, schemaRecherche } from "./geo";
import {
  schemaReponseObservationsHydro,
  schemaReponseStationsHydro,
} from "./hydro";
import { schemaReponseResultats, schemaReponseUdi } from "./hubeau-qualite";
import {
  schemaReponseChroniquesPiezo,
  schemaReponseStationsPiezo,
} from "./piezo";
import { schemaZones } from "./vigieau";

test("geo : la recherche par nom rend des communes typées", () => {
  const communes = schemaRecherche.parse(geoRecherche);
  expect(communes.length).toBeGreaterThan(0);
  expect(communes[0].code).toMatch(/^\d{5}$/);
});

test("geo : la commune par code porte son centre GeoJSON", () => {
  const commune = schemaCommune.parse(geoCommune);
  const [lon, lat] = commune.centre.coordinates;
  expect(lon).toBeGreaterThan(-6);
  expect(lat).toBeGreaterThan(41);
});

test("hubeau qualité : communes_udi", () => {
  const reponse = schemaReponseUdi.parse(hubeauCommunesUdi);
  expect(reponse.count).toBeGreaterThan(0);
  expect(reponse.data.length).toBe(reponse.count);
});

test("hubeau qualité : resultats_dis avec les 15 champs consommés", () => {
  const reponse = schemaReponseResultats.parse(hubeauResultatsDis);
  expect(reponse.data.length).toBeGreaterThan(0);
  expect(Object.keys(reponse.data[0])).toHaveLength(15);
});

test("vigieau : zones avec restriction", () => {
  const zones = schemaZones.parse(vigieauZones);
  expect(zones.length).toBeGreaterThan(0);
  expect(zones[0].usages.length).toBeGreaterThan(0);
});

test("vigieau : commune sans restriction", () => {
  expect(schemaZones.parse(vigieauZonesVide)).toEqual([]);
});

test("hydrométrie : stations en service", () => {
  const reponse = schemaReponseStationsHydro.parse(hydroStations);
  expect(reponse.data.length).toBeGreaterThan(0);
  expect(reponse.data.every((station) => station.en_service)).toBe(true);
});

test("hydrométrie : observations temps réel, pleines et vides", () => {
  expect(
    schemaReponseObservationsHydro.parse(hydroObservations).data[0]
      .grandeur_hydro,
  ).toBe("Q");
  expect(
    schemaReponseObservationsHydro.parse(hydroObservationsVide).data,
  ).toEqual([]);
});

test("piézométrie : altitude_station est une chaîne sur /stations", () => {
  const reponse = schemaReponseStationsPiezo.parse(piezoStations);
  expect(reponse.data.length).toBeGreaterThan(0);
  expect(typeof reponse.data[0].altitude_station).toBe("string");
});

test("piézométrie : altitude_station est un nombre sur /chroniques_tr", () => {
  const reponse = schemaReponseChroniquesPiezo.parse(piezoChroniques);
  expect(reponse.data.length).toBeGreaterThan(0);
  expect(typeof reponse.data[0].altitude_station).toBe("number");
});
