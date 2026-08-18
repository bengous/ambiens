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
  fichier. Après `bunx shadcn add …` : `bun run format`.
- Base UI (`@base-ui/react`) : Accordion — `value`/`defaultValue` sont des
  tableaux, la prop d'ouverture multiple s'appelle `multiple` (pas de `type` ni
  `collapsible`). Combobox async — `filter={null}`, items pilotés par state ;
  `Combobox.Label` ne labellise que le Trigger → `<label>` natif + `htmlFor`.
- Scanner Tailwind : aucune concaténation de classes — les classes de ton
  vivent en toutes lettres dans `src/features/formats.ts` (`CLASSES_TON`,
  `CLASSES_SECHERESSE`).
- Tokens marque/verdict/sécheresse : dans `src/index.css` à la suite des blocs
  CLI, même modèle (`:root`/`.dark` + `@theme inline`). Valeurs oklch vérifiées
  AA **et** dans le gamut sRGB — revérifier les deux à toute retouche. Budget de
  teintes disjointes : marque `--eau-*` 200 et 230, verdicts 27/75/150,
  sécheresse 280–295. Le bloc marque repointe les tokens shadcn (`--background`,
  `--primary`…) sans éditer les blocs CLI, qui restent régénérables.
- Direction « colonne d'eau » : l'ordre robinet → réseau → ressource porte
  l'information. `Surtitre` nomme la station et son tiret touche le rail de
  profondeur du conteneur de résultats (`App.tsx`, `sm:` et plus) — les deux
  décalages se répondent, changer l'un demande de changer l'autre.
- `font-heading` (Bricolage Grotesque) réservée aux titres : wordmark, verdict,
  `h2` de section. Valeurs mesurées en `tabular-nums`.
- Couleur jamais seule porteuse d'information (icône + libellé). Cibles ≥ 44 px.
- Thème sombre : suit `prefers-color-scheme`, aucun réglage utilisateur. Le
  script inline de `index.html` pose `.dark` avant le bundle — l'y laisser,
  sinon la page apparaît en clair puis bascule.
- `EtatSection` distingue inactive (skipToken : `pending` +
  `fetchStatus === "idle"`) et hors ligne (`fetchStatus === "paused"`) — ne pas
  réduire à pending/error/success.
- `react-hooks/purity` interdit les appels impurs pendant le rendu :
  `Date.now()` passe par un initialiseur `useState`.
