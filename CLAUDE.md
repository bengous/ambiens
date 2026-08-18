# Ambiens

App statique React : potabilité de l'eau du robinet par commune (contrôles
SISE-Eaux) + contexte sécheresse/rivières/nappes. GitHub Pages sous `/ambiens/`.

## Commandes

- bun partout. Tests : `bun run test:ci` (Vitest) — jamais `bun test`.
- Un seul fichier : `bun run test:ci src/lib/regles.test.ts`.
- Dev : `bun run dev` (5173) ; prod locale : `bun run build && bun run preview`
  (4173) — les deux servent sous `/ambiens/`.
- Porte avant tout rendu : `bun run typecheck && bun run lint && bun run format:check && bun run test:ci`.

## Architecture

- Flux : `App.tsx` tient l'état `insee` (synchronisé `?commune=` par
  `lib/url.ts`) → `api/queries.ts` (une fabrique `queryOptions` par source :
  queryKey/staleTime/retry/timeout, `skipToken` sans commune) → `api/*.ts`
  (fetch nu + schéma Zod par endpoint) → rendu par feature.
- Verdict = agrégation atomique : une seule query `['qualite', insee]` dont la
  queryFn enchaîne `fetchReseaux` → `parLots(8)` → `lib/regles.ts` (cascade
  officiel-ARS d'abord, recalcul en repli, désaccord signalé ; verdict commune =
  pire verdict des réseaux).
- Chaque panneau de contexte (VigiEau, hydro, piézo) porte sa propre query,
  enveloppée dans `components/EtatSection` : l'échec d'une source ne bloque ni
  le verdict ni les autres panneaux.
- Couches : `lib/` pur sans réseau ; `api/` réseau + validation ; `features/`
  composition UI ; `components/ui/` généré shadcn.

## Contraintes transverses

- Hub'Eau : `fetch(url)` nu, aucun header custom (le WAF bloque le preflight
  OPTIONS). HTTP 206 = succès.
- `src/components/ui/**` et `components.json` : générés par le CLI shadcn,
  jamais édités à la main (détail dans la règle ui).
- `src/lib/regles.ts` : portage 1:1 du moteur du prototype d'origine,
  verrouillé par tests — ne pas « améliorer » la cascade de verdicts.
