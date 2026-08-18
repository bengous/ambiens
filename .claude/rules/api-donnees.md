---
paths:
  - "src/api/**"
  - "src/lib/fetch-json.ts"
  - "src/lib/geo-utils.ts"
  - "scripts/**"
  - "tests/fixtures/**"
---

# Couche données (APIs publiques)

Comportements mesurés en réel (08/2026), pas des suppositions :

- Piézométrie v1 : `lat`/`lon`/`distance` silencieusement ignorés → `bbox`
  obligatoire. La pagination de `chroniques_tr` groupe par station → une requête
  `size=1` par station ; le multi-`code_bss` en virgule est inexploitable.
- Les piézomètres les plus proches peuvent ne rien publier en temps réel →
  sélection sur 6 candidats, priorité aux stations qui ont une mesure.
- Hydrométrie v2 : `Q` en L/s (afficher m³/s). Une station `en_service` peut
  rendre `count=0`.
- `resultats_dis` : `resultat_numerique` vaut 0 quand `resultat_alphanumerique`
  vaut `<0,2` → afficher l'alphanumérique. `libelle_unite === "SANS OBJET"` →
  masquer l'unité. Hub'Eau y flanche par intermittence (timeout isolé) :
  `retry: 1` + bouton Réessayer couvrent, ce n'est pas un défaut du code.
- `communes_udi` : une ligne par année et par réseau → dédup `code_reseau`.
- VigiEau : `[]` = aucune restriction (état vide, pas une erreur).
- Hub'Eau SISPEA : interdit (API décommissionnée).
- Query keys `['hydro', insee]` / `['piezo', insee]` : décision actée, le centre
  est dérivé de l'INSEE — les `eslint-disable @tanstack/query/exhaustive-deps`
  sont voulus.
- Zod v4 : `z.object` retire les champs non déclarés — ajouter un champ au
  schéma pour le voir arriver dans l'UI.
- `tests/fixtures/` = réponses d'API octet pour octet (prettier-ignorées).
  Recapture : `bun scripts/capture-fixtures.ts`. La fixture VigiEau périme avec
  les arrêtés préfectoraux : si `schemas.test.ts` casse, recapturer (le script
  change de commune tout seul).
