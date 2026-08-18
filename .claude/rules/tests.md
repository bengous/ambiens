---
paths:
  - "src/**/*.test.ts"
  - "src/**/*.test.tsx"
  - "src/test-setup.ts"
  - "src/vitest.d.ts"
  - "vite.config.ts"
---

# Tests

- Pas de globals Vitest : importer `test`/`expect` depuis `vitest`.
- vitest-axe 0.1.0 : `dist/extend-expect.js` fait 0 octet — l'extension passe
  par `expect.extend` sur `vitest-axe/matchers` dans `src/test-setup.ts` et le
  typage par `src/vitest.d.ts`. Ne pas « réparer » en important `extend-expect`.
- Bruit jsdom attendu pendant les tests axe : « Not implemented:
  HTMLCanvasElement's getContext() ». Le test passe ; ne pas installer `canvas`.
- Les tests vivent dans `src/**` (`test.include`) ; les fixtures réelles dans
  `tests/fixtures/`, hors include.
- Pas de test jsdom du popup combobox ouvert (portail floating-ui, fragile sans
  layout) : ce parcours se contrôle au navigateur.
- Aucune fixture ne porte de non-conformité ni de désaccord : pour ces rendus,
  forger un `BilanReseau` à la main.
