---
paths:
  - "index.html"
  - "public/**"
  - "src/features/demander-ia/**"
  - "src/lib/constantes.ts"
---

# Surface agents

- Le hint destiné aux agents est **déclaratif** : il documente comment
  interroger les sources. Jamais une consigne qui prétend primer sur les
  instructions de l'agent lecteur, jamais de texte masqué. `public/llms.txt`
  ouvre sur ce rappel — le garder.
- `<link rel="help" href="/llms.txt">` : Vite y applique `base`
  (`/ambiens/llms.txt`) mais **ne vérifie pas que le fichier existe** — mesuré :
  supprimer `public/llms.txt` livre un lien mort sans casser le build.
- **La surface agents n'a aucun garde-fou automatique.** Toucher à la cascade de
  `src/lib/regles.ts`, aux URLs de `src/lib/constantes.ts` ou aux libellés de
  `src/lib/libelles.ts` = mettre à jour `public/llms.txt` dans le même commit.
  Une recette périmée est pire qu'aucune recette.
- `public/robots.txt` est servi sous `/ambiens/` : les crawlers ne lisent que la
  racine du domaine, hors de ce dépôt. Fichier documentaire, pas une directive
  appliquée — ne pas le traiter comme un contrôle d'accès.
- Invite = synthèse embarquée plus pointeur de provenance : `<donnees>` porte
  les résultats déjà collectés et validés côté navigateur, `<source>` renvoie à
  `llms.txt` pour la méthode.
- Compression asymétrique, c'est le principe central : les dépassements sont
  détaillés (valeur alphanumérique et seuil verbatim), les mesures quantifiées
  listées réglementées d'abord, et tout ce qui n'a pas été détecté
  (`<0,005 µg/L`) se compte au lieu de se lister — une campagne pesticides
  aligne trois cents lignes pour la même information.
- Construire l'invite ne déclenche aucune requête : la ligne sécheresse n'entre
  que si le cache VigiEau la porte déjà (`useQuery` en `enabled: false`).
- Quatre plafonds bornent l'URL sous 6 000 caractères, mesuré à 5 500 au pire
  et 4 500 sur Annecy : 8 dépassements par réseau et 12 par invite,
  16 mesures par invite, 3 réseaux détaillés, 3 usages sécheresse. Les comptes
  restent toujours complets, seul le détail s'arrête.
- Le budget de mesures se répartit à part égale entre les réseaux détaillés,
  reliquat compris. Le servir dans l'ordre laisserait le dernier réseau sans
  aucune mesure.
- Les réseaux sont triés par gravité avant plafonnement : une non-conformité ne
  peut jamais tomber dans le résumé « et N autres réseaux ».
- `invite.test.ts` tient le budget avec un cas forgé au pire — 30 réseaux,
  libellés de 62 caractères, la longueur maximale observée dans SISE-Eaux.
  Rallonger un libellé au-delà casse le garde-fou : c'est voulu.
- Ajouter une cible IA = une entrée dans `cibles.ts` ; le composant boucle
  dessus. Vérifier au navigateur que la cible pré-remplit vraiment son champ.
