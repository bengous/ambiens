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
  `llms.txt` pour la méthode. Les dépassements sont détaillés (valeur
  alphanumérique et seuil verbatim), le reste du prélèvement est agrégé en
  comptes.
- Construire l'invite ne déclenche aucune requête : la ligne sécheresse n'entre
  que si le cache VigiEau la porte déjà (`useQuery` en `enabled: false`).
- La taille suit donc les données. Budget < 6 000 caractères par URL, tenu par
  `invite.test.ts` grâce à deux plafonds : 8 dépassements détaillés par réseau
  et 12 sur l'invite entière, les comptes restant complets. Les blocs de réseau
  ne sont pas plafonnés : au-delà de 12 réseaux le budget saute quand même
  (mesuré 6 500 caractères) — le cas n'est pas traité.
- Ajouter une cible IA = une entrée dans `cibles.ts` ; le composant boucle
  dessus. Vérifier au navigateur que la cible pré-remplit vraiment son champ.
