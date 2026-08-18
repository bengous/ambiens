import { expect, test } from "vitest";
import { ecrireCommuneUrl, estCodeInsee, lireCommuneUrl } from "./url";

test("estCodeInsee accepte les codes métropole et Corse", () => {
  expect(estCodeInsee("75056")).toBe(true);
  expect(estCodeInsee("74010")).toBe(true);
  expect(estCodeInsee("2A004")).toBe(true);
  expect(estCodeInsee("2B033")).toBe(true);
});

test("estCodeInsee rejette tout le reste", () => {
  expect(estCodeInsee("7505")).toBe(false);
  expect(estCodeInsee("750560")).toBe(false);
  expect(estCodeInsee("2C004")).toBe(false);
  expect(estCodeInsee("ANNECY")).toBe(false);
  expect(estCodeInsee("")).toBe(false);
  expect(estCodeInsee(null)).toBe(false);
  expect(estCodeInsee(undefined)).toBe(false);
});

test("lireCommuneUrl ne rend qu'un code valide", () => {
  expect(lireCommuneUrl("?commune=74010")).toBe("74010");
  expect(lireCommuneUrl("?commune=2A004&autre=1")).toBe("2A004");
  expect(lireCommuneUrl("?commune=annecy")).toBeNull();
  expect(lireCommuneUrl("")).toBeNull();
});

test("ecrireCommuneUrl écrit puis efface le paramètre sans recharger", () => {
  ecrireCommuneUrl("74010");
  expect(lireCommuneUrl(window.location.search)).toBe("74010");

  ecrireCommuneUrl(null);
  expect(window.location.search).not.toContain("commune");
});
