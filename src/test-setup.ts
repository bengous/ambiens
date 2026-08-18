import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, expect } from "vitest";
import * as axeMatchers from "vitest-axe/matchers";

// vitest-axe 0.1.0 : dist/extend-expect.js est vide, l'extension doit être explicite.
expect.extend(axeMatchers);

afterEach(() => {
  cleanup();
});
