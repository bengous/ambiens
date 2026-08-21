---
paths:
  - "src/features/**"
  - "src/components/**"
  - "src/App.tsx"
  - "src/index.css"
  - "eslint.config.js"
  - "index.html"
  - "public/favicon.svg"
  - "public/site.webmanifest"
  - "public/brand/**"
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
- `--marque-turquoise` / `--marque-marine` échappent aux deux règles ci-dessus :
  hexadécimal plutôt qu'oklch, teintes 184,6 et 262,1 hors du budget. Ce sont
  les couleurs du logo, pas des tokens d'interface — le logo est `aria-hidden`,
  hors des cartes de résultat, et l'hexadécimal le garde identique aux PNG
  rastérisés. En sombre la marine passe à `#547ecd` : `#072767` sur
  `--eau-surface` mesure 1,03:1, la moitié du logo disparaît.
- La géométrie du logo vit en trois exemplaires : `public/brand/ambiens-icon.svg`
  (source de rastérisation, monochrome clair), `public/favicon.svg` (cadrage
  serré + règle `prefers-color-scheme: dark`) et `src/components/LogoAmbiens.tsx`
  (JSX inline — un `<img>` ne peut pas lire la classe `.dark`). Retoucher un
  tracé = retoucher les trois ; `LogoAmbiens.test.tsx` les compare par import
  Vite `?raw` et casse à la moindre dérive.
- Icônes d'app régénérées depuis `ambiens-icon.svg`, plaque blanche opaque,
  fichiers suivis par git :

  ```
  for T in 180 192 512; do
    inkscape --export-type=png --export-filename=public/brand/ambiens-$T.png \
      -w $T -h $T --export-background='#ffffff' --export-background-opacity=1 \
      public/brand/ambiens-icon.svg
  done
  inkscape --export-type=png \
    --export-filename=public/brand/ambiens-512-maskable.png \
    -w 512 -h 512 --export-area=-227:-224:1414:1417 \
    --export-background='#ffffff' --export-background-opacity=1 \
    public/brand/ambiens-icon.svg
  ```

  L'aire maskable est un canevas de 1641 unités centré sur l'emprise de la
  marque : mesuré, le point le plus éloigné tombe pile sur le cercle de sécurité
  de 40 % du canevas. Plus large, la pointe turquoise se fait rogner par le
  masque.

- `public/site.webmanifest` : chemins **relatifs** au manifeste. Vite applique
  `base` aux attributs HTML, jamais au contenu d'un JSON — `/brand/…` casserait
  en production sans casser le build. `theme_color` et `background_color` valent
  `#f6fbfc`, l'hexadécimal exact de `--eau-papier` en clair ; les deux
  `theme-color` de `index.html` ajoutent `#09181f` pour le sombre.
- Direction « colonne d'eau » : l'ordre robinet → réseau → ressource porte
  l'information. `Surtitre` nomme la station et son tiret touche le rail de
  profondeur du conteneur de résultats (`App.tsx`, `sm:` et plus) — les deux
  décalages se répondent, changer l'un demande de changer l'autre.
- `font-heading` (Bricolage Grotesque) réservée aux titres : wordmark, verdict,
  `h2` de section. Valeurs mesurées en `tabular-nums`.
- Couleur jamais seule porteuse d'information (icône + libellé). Cibles ≥ 44 px.
- Lien sortant : ancre nue (`target="_blank" rel="noopener noreferrer"`) stylée
  par `buttonVariants(...)` en `className`, pas `Button render=` qui plaquerait
  la sémantique bouton sur un lien. Icône `ExternalLinkIcon` et mention
  `sr-only` du nouvel onglet.
- Thème sombre : suit `prefers-color-scheme`, aucun réglage utilisateur. Le
  script inline de `index.html` pose `.dark` avant le bundle — l'y laisser,
  sinon la page apparaît en clair puis bascule.
- `EtatSection` distingue inactive (skipToken : `pending` +
  `fetchStatus === "idle"`) et hors ligne (`fetchStatus === "paused"`) — ne pas
  réduire à pending/error/success.
- `react-hooks/purity` interdit les appels impurs pendant le rendu :
  `Date.now()` passe par un initialiseur `useState`.
