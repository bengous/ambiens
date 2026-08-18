---
paths:
  - "src/features/**"
  - "src/components/**"
  - "src/App.tsx"
  - "src/index.css"
  - "eslint.config.js"
---

# UI

- `src/components/ui/**` et `components.json` : sortie brute du CLI shadcn.
  Règle lint cassée par le généré → étendre l'override scopé
  `files: ["src/components/ui/**"]` dans `eslint.config.js`, jamais éditer le
  fichier. Après `bunx shadcn@latest add …` : `bun run format`.
- Base UI (`@base-ui/react`) : Accordion — `value`/`defaultValue` sont des
  tableaux, la prop d'ouverture multiple s'appelle `multiple` (pas de `type` ni
  `collapsible`). Combobox async — `filter={null}`, items pilotés par state ;
  `Combobox.Label` ne labellise que le Trigger → `<label>` natif + `htmlFor`.
- Scanner Tailwind : aucune concaténation de classes — les classes de ton
  vivent en toutes lettres dans `src/features/formats.ts` (`CLASSES_TON`,
  `CLASSES_SECHERESSE`).
- Tokens verdict/sécheresse : dans `src/index.css` à la suite des blocs CLI,
  même modèle (`:root`/`.dark` + `@theme inline`). Valeurs oklch vérifiées AA
  **et** dans le gamut sRGB — revérifier les deux à toute retouche. Famille
  sécheresse (teintes 280–295) disjointe des verdicts.
- Couleur jamais seule porteuse d'information (icône + libellé). Cibles ≥ 44 px.
- Thème sombre : tokens `.dark` prêts et vérifiés, mais aucune bascule ne pose
  la classe — l'app s'affiche en clair (assumé dans le README).
- `EtatSection` distingue inactive (skipToken : `pending` +
  `fetchStatus === "idle"`) et hors ligne (`fetchStatus === "paused"`) — ne pas
  réduire à pending/error/success.
- `react-hooks/purity` interdit les appels impurs pendant le rendu :
  `Date.now()` passe par un initialiseur `useState`.
