import { skipToken } from "@tanstack/react-query";
import { expect, test } from "vitest";
import {
  optionsCommune,
  optionsHydro,
  optionsPiezo,
  optionsQualite,
  optionsRechercheCommunes,
  optionsVigieau,
} from "./queries";

const ANNECY = "74010";
const CENTRE = [6.1264, 45.9024] as const;

test("les clés de cache suivent le tableau du plan", () => {
  expect(optionsRechercheCommunes(" Annecy ").queryKey).toEqual([
    "geo",
    "recherche",
    "Annecy",
  ]);
  expect(optionsCommune(ANNECY).queryKey).toEqual(["geo", "commune", ANNECY]);
  expect(optionsQualite(ANNECY).queryKey).toEqual(["qualite", ANNECY]);
  expect(optionsVigieau(ANNECY).queryKey).toEqual(["vigieau", ANNECY]);
  expect(optionsHydro(ANNECY, CENTRE).queryKey).toEqual(["hydro", ANNECY]);
  expect(optionsPiezo(ANNECY, CENTRE).queryKey).toEqual(["piezo", ANNECY]);
});

test("les fraîcheurs et rejeux suivent le tableau du plan", () => {
  const minute = 60 * 1000;
  expect(optionsRechercheCommunes("Annecy")).toMatchObject({
    staleTime: 5 * minute,
    retry: 0,
  });
  expect(optionsCommune(ANNECY)).toMatchObject({
    staleTime: Infinity,
    retry: 1,
  });
  expect(optionsQualite(ANNECY)).toMatchObject({
    staleTime: 60 * minute,
    retry: 1,
  });
  expect(optionsVigieau(ANNECY)).toMatchObject({
    staleTime: 60 * minute,
    retry: 1,
  });
  expect(optionsHydro(ANNECY, CENTRE)).toMatchObject({
    staleTime: 15 * minute,
    retry: 1,
  });
  expect(optionsPiezo(ANNECY, CENTRE)).toMatchObject({
    staleTime: 6 * 60 * minute,
    retry: 1,
  });
});

test("aucune requête ne part sans commune ni saisie suffisante", () => {
  expect(optionsRechercheCommunes("A").queryFn).toBe(skipToken);
  expect(optionsCommune(null).queryFn).toBe(skipToken);
  expect(optionsQualite(null).queryFn).toBe(skipToken);
  expect(optionsVigieau(null).queryFn).toBe(skipToken);
  expect(optionsHydro(ANNECY, null).queryFn).toBe(skipToken);
  expect(optionsPiezo(null, CENTRE).queryFn).toBe(skipToken);
});
