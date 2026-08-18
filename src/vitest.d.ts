/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars --
   La fusion de déclarations impose de reprendre à l'identique la signature Matchers<T = any> exportée par vitest. */
import type { AxeMatchers } from "vitest-axe";

declare module "vitest" {
  interface Matchers<T = any> extends AxeMatchers {}
}
