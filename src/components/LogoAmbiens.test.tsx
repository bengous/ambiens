import { expect, test } from "vitest";
import iconeMarque from "../../public/brand/ambiens-icon.svg?raw";
import favicon from "../../public/favicon.svg?raw";
import {
  POINT_CX,
  POINT_CY,
  POINT_R,
  TRACE_MARINE,
  TRACE_TURQUOISE,
} from "./LogoAmbiens";

const SOURCES = [
  ["public/favicon.svg", favicon],
  ["public/brand/ambiens-icon.svg", iconeMarque],
] as const;

function attributs(svg: string, balise: RegExp, nom: string) {
  return [...svg.matchAll(balise)].map(
    ([forme]) => new RegExp(`\\s${nom}="([^"]+)"`).exec(forme)?.[1],
  );
}

test.each(SOURCES)("%s porte la géométrie du composant", (_nom, svg) => {
  expect(attributs(svg, /<path\b[^>]*>/g, "d")).toEqual([
    TRACE_TURQUOISE,
    TRACE_MARINE,
  ]);
  expect(attributs(svg, /<circle\b[^>]*>/g, "cx").map(Number)).toEqual([
    POINT_CX,
  ]);
  expect(attributs(svg, /<circle\b[^>]*>/g, "cy").map(Number)).toEqual([
    POINT_CY,
  ]);
  expect(attributs(svg, /<circle\b[^>]*>/g, "r").map(Number)).toEqual([
    POINT_R,
  ]);
});
