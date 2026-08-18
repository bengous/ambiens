# Potabilis

L'eau du robinet de votre commune est-elle potable ? Réponse à partir des
contrôles sanitaires officiels (SISE-Eaux), avec le contexte local en plus
(restrictions sécheresse, débit des rivières, niveau des nappes).

Application 100 % statique servie par GitHub Pages : aucun backend, aucune clé
d'API, aucun LLM. Toutes les données viennent d'APIs publiques ouvertes,
appelées depuis le navigateur.

## Sources de données

- [API Géo](https://geo.api.gouv.fr) — recherche de commune, centroïde.
- [Hub'Eau — Qualité de l'eau potable](https://hubeau.eaufrance.fr/page/api-qualite-eau-potable)
  — réseaux de distribution (`communes_udi`) et résultats du contrôle sanitaire
  (`resultats_dis`).
- [VigiEau](https://api.vigieau.gouv.fr/swagger) — restrictions sécheresse sur
  l'eau potable (zones AEP).
- [Hub'Eau — Hydrométrie v2](https://hubeau.eaufrance.fr/page/api-hydrometrie)
  — débit temps réel des rivières proches.
- [Hub'Eau — Piézométrie v1](https://hubeau.eaufrance.fr/page/api-piezometrie)
  — niveau temps réel des nappes proches.

## Verdict

Le verdict par réseau combine les conclusions officielles de l'ARS et un
recalcul local paramètre par paramètre (seuils réglementaires SISE-Eaux).
L'officiel prime ; le recalcul sert de repli quand l'ARS est muette, et un
désaccord éventuel est signalé. Le verdict de la commune est le pire verdict de
ses réseaux. Au-delà de 183 jours sans prélèvement, un avertissement de
fraîcheur s'affiche.

## Limites

- Ce site n'est pas un avis médical ni une publication officielle : en cas de
  doute, la conclusion de l'ARS fait foi.
- La fréquence des contrôles varie selon les communes ; les données affichées
  peuvent dater.
- Le contexte local (sécheresse, rivières, nappes) est informatif : il
  n'affecte pas le verdict sanitaire.
- Les piézomètres affichés peuvent être à 14–15 km : les plus proches ne
  publient pas tous en temps réel.
- Thème sombre : les couleurs sombres existent et sont vérifiées AA, mais
  aucune bascule ne pose la classe `.dark` — l'app s'affiche en clair.

## Contraintes CORS vérifiées (18/08/2026)

- **VigiEau : CORS OK** (`Access-Control-Allow-Origin: *`, preflight accepté)
  → appels directs depuis le navigateur.
- **Hub'Eau : GET OK** (ACAO `*`) **mais le WAF bloque le preflight OPTIONS**
  → `fetch(url)` nu obligatoire, aucun header custom, jamais. HTTP 206 =
  pagination, traité comme un succès.
- geo.api.gouv.fr : CORS OK.

## Stack

- **bun** — package manager et scripts.
- **React 19 + TypeScript 6** — UI, typage strict.
- **Vite 8** — build statique, `base: '/ambiens/'`.
- **Tailwind CSS v4** — styles, tokens oklch verdict/sécheresse.
- **shadcn** (style base-vega, primitives Base UI) — composants générés par
  CLI, jamais édités à la main.
- **TanStack Query 5** — cache et états des requêtes par source.
- **Zod v4** — validation des réponses d'API, schémas éprouvés sur fixtures
  réelles.
- **Vitest + Testing Library + vitest-axe** — tests unitaires, transformation
  et accessibilité.
- **ESLint (strictTypeChecked) + Prettier** — qualité, exécutés en CI.

## Développement local

```sh
bun install
bun run dev        # http://localhost:5173/ambiens/
```

Vérifications :

```sh
bun run typecheck && bun run lint && bun run format:check
bun run test:ci
bun run build && bun run preview   # http://localhost:4173/ambiens/
```

Les fixtures de test (`tests/fixtures/`) sont des réponses d'API réelles,
capturées par `bun scripts/capture-fixtures.ts`. La fixture VigiEau périme avec
les arrêtés préfectoraux : si `schemas.test.ts` casse, rejouer la capture.

## Déploiement

GitHub Pages via Actions (`.github/workflows/deploy.yml`) : typecheck, lint,
format, tests puis build et déploiement Pages. Dans les réglages du repo,
activer Pages avec la source « GitHub Actions ». Le workflow n'a pas été testé
en ligne avant le premier push : surveiller le premier run.
