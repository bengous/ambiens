# Ambiens

App statique React : potabilité de l'eau du robinet par commune (contrôles
SISE-Eaux) + contexte sécheresse/rivières/nappes. GitHub Pages sous `/ambiens/`.

## Commandes

- bun partout. Tests : `bun run test:ci` (Vitest) — jamais `bun test`.
- Porte avant tout rendu : `bun run typecheck && bun run lint && bun run format:check && bun run test:ci`.

## Contraintes transverses

- Hub'Eau : `fetch(url)` nu, aucun header custom (le WAF bloque le preflight
  OPTIONS). HTTP 206 = succès.
- `src/components/ui/**` et `components.json` : générés par le CLI shadcn,
  jamais édités à la main (détail dans la règle ui).
- `src/lib/regles.ts` : portage 1:1 du moteur du prototype d'origine,
  verrouillé par tests — ne pas « améliorer » la cascade de verdicts.
