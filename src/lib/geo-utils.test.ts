import { expect, test } from "vitest";
import { bboxAutour, distanceKm, type Coordonnees } from "./geo-utils";

const ANNECY: Coordonnees = [6.1264, 45.9024];
const PARIS: Coordonnees = [2.3522, 48.8566];

test("distanceKm mesure la distance orthodromique", () => {
  expect(distanceKm(ANNECY, ANNECY)).toBe(0);
  // Annecy — Paris à vol d'oiseau : environ 434 km.
  expect(distanceKm(ANNECY, PARIS)).toBeCloseTo(434, 0);
  expect(distanceKm(PARIS, ANNECY)).toBeCloseTo(distanceKm(ANNECY, PARIS), 6);
});

test("bboxAutour encadre le centre et s'élargit en longitude", () => {
  const [lonMin, latMin, lonMax, latMax] = bboxAutour(ANNECY, 15);

  expect(lonMin).toBeLessThan(ANNECY[0]);
  expect(lonMax).toBeGreaterThan(ANNECY[0]);
  expect(latMin).toBeLessThan(ANNECY[1]);
  expect(latMax).toBeGreaterThan(ANNECY[1]);
  // 15 km ≈ 0,135° de latitude ; en longitude, l'écart croît avec la latitude.
  expect(latMax - latMin).toBeCloseTo(0.2695, 3);
  expect(lonMax - lonMin).toBeGreaterThan(latMax - latMin);
});
