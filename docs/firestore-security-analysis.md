# Analyse du modèle et des règles Firestore

## Cible et accès

Le dépôt ne contient aucun projet Firebase actif ni configuration d'application Web ; l'édition de l'instance ne peut donc pas être détectée. L'implémentation cible Firestore Standard, base `(default)`, avec le SDK Web modulaire. Avant déploiement, vérifier l'édition réelle avec :

```sh
npx -y firebase-tools@latest firestore:databases:list --project <PROJECT_ID>
npx -y firebase-tools@latest firestore:databases:get "(default)" --project <PROJECT_ID>
```

Les lectures de `cars` exigent Firebase Auth. Les documents ne contiennent que le prénom public affiché dans l'interface, jamais l'e-mail. Un utilisateur ne lit que son propre document `memberships/{uid}`.

## Collections, requêtes et invariants

- `cars/{carId}` : requête temps réel unique, triée par `createdAt asc`.
- `memberships/{uid}` : un document déterministe par UID, créé/supprimé dans la même transaction que la modification de la voiture.
- Un membership a exactement un rôle : `driver`, `passenger` ou `waitlist`.
- L'existence unique de `memberships/{uid}` interdit atomiquement de conduire, voyager ou attendre dans plusieurs voitures.
- Le conducteur est stocké séparément et compte dans `seats`. `passengers.length + 1 <= seats`.
- Une voiture pleine accepte un membership `waitlist`. Une libération de place ne modifie jamais cette liste.
- La suppression applicative lit la voiture puis supprime la voiture et tous les memberships référencés dans la même transaction.
- Bornes : 8 places totales et 30 personnes en attente. Elles limitent aussi la taille de la transaction de suppression.

## Opérations autorisées

- Création : conducteur authentifié, voiture vide, membership conducteur créé atomiquement.
- Modification métier : seul le conducteur change ville, heure ou capacité ; la capacité ne peut pas passer sous l'occupation actuelle.
- Rejoindre/quitter : seul l'UID concerné ajoute/retire sa fiche publique, avec création/suppression atomique de son membership.
- Suppression : seul le conducteur ; son membership doit disparaître avec la voiture. Les règles permettent au conducteur de supprimer les memberships liés pendant cette transaction.

## Revue contradictoire des règles

- Lecture publique : bloquée, authentification obligatoire.
- Lecture d'un membership tiers : bloquée.
- Double inscription/rejeu : bloqué par l'ID déterministe et `exists`/`existsAfter`.
- Détournement d'identité : UID du membership égal à `request.auth.uid`; l'ajout dans la voiture doit correspondre au même document.
- Pollution de schéma, champs manquants, mauvais types, chaînes ou listes surdimensionnées : bloqués par les validateurs appelés en création et mise à jour.
- Changement du conducteur ou de `createdAt` : bloqué en mise à jour.
- Modification arbitraire d'une voiture par un passager : seules la liste concernée et `updatedAt` peuvent changer d'une entrée exacte.
- Promotion automatique ou manuelle attente → passager : non prévue par le service et bloquée par l'existence préalable du membership.
- Suppression d'une voiture tierce : bloquée.
- Suppression partielle malveillante par le conducteur : limite connue des Security Rules. Le langage ne peut pas itérer sur une liste variable pour prouver que chaque membership a été supprimé. Le client officiel effectue bien toutes les suppressions dans une transaction, mais une garantie hostile absolue demanderait une fonction backend privilégiée ou un modèle par sous-collection avec orchestration serveur.
- Syntaxe : à valider contre le projet réel ou l'émulateur avant déploiement, aucun Project ID n'étant disponible dans ce workspace.

Ces règles sont un prototype sérieux à revoir avant diffusion large. Il faut en particulier tester les transactions avec l'émulateur et envisager une fonction backend pour rendre la suppression multi-membres incontestable face à un client malveillant.
