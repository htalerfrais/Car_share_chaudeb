# En voiture !

Application React de covoiturage pour un trajet unique. Elle propose une authentification interchangeable (profil local ou Google/Firebase Auth), une liste de voitures Firestore en temps réel et un mode démo local explicite pour découvrir l'interface sans credentials.

## Fonctionnalités

- profil mock persistant pour le développement UI ou connexion Google réelle ;
- ajout et modification d'une voiture par son conducteur ;
- conducteur compté automatiquement dans la capacité ;
- une seule affiliation par utilisateur grâce à `memberships/{uid}` ;
- réservation d'une place ou ajout à une liste d'attente lorsque la voiture est pleine ;
- départ volontaire d'une voiture ou d'une liste d'attente ;
- aucune promotion automatique de la liste d'attente ;
- confirmation avant suppression, puis libération de tous les membres ;
- mises à jour Firestore temps réel, retours d'erreur et notifications ;
- interface française responsive et accessible au clavier.

## Démarrage local

Prérequis : Node.js récent (20 LTS ou plus recommandé).

```sh
npm install
npm run dev
```

Sans `.env.local`, l'application affiche volontairement un écran de configuration. Le bouton **Découvrir l'interface en mode démo** active le profil mock et le stockage `localStorage` pour la session. Ce mode sert uniquement à tester l'interface : il n'est ni partagé, ni temps réel entre appareils, ni une alternative à Firestore.

Pour démarrer directement en démo, créer localement un `.env.local` non versionné :

```env
VITE_AUTH_MODE=mock
VITE_DATA_MODE=demo
```

## Configuration Firebase

Le dépôt ne contient aucun secret. Copier `.env.example` vers `.env.local`, créer/choisir un projet Firebase et renseigner la configuration de son application Web :

```env
VITE_AUTH_MODE=google
VITE_DATA_MODE=firestore
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

1. Vérifier les outils : `npx -y firebase-tools@latest --version`.
2. Se connecter : `npx -y firebase-tools@latest login`.
3. Associer le projet : `npx -y firebase-tools@latest use --add`.
4. Vérifier l'édition et la base Firestore :
   `npx -y firebase-tools@latest firestore:databases:list --project <PROJECT_ID>`.
5. Créer une application Web si nécessaire puis obtenir sa configuration avec
   `npx -y firebase-tools@latest apps:sdkconfig WEB <APP_ID> --project <PROJECT_ID>`.
6. Activer Google dans **Authentication → Sign-in method** et ajouter les domaines autorisés (`localhost`, sans protocole ni port).
7. Créer la base Firestore. L'implémentation et les règles ciblent l'édition Standard et la base `(default)` ; vérifier cette hypothèse avant déploiement.
8. Valider puis déployer les règles :

```sh
npx -y firebase-tools@latest emulators:start --only firestore,auth
npx -y firebase-tools@latest deploy --only firestore:rules --project <PROJECT_ID>
```

Le mode `mock` n'émet aucun token Firebase. Il est donc volontairement incompatible avec les règles sécurisées. Utiliser `mock + demo` pour l'UI, ou `google + firestore` pour les vraies données.

## Modèle Firestore

### `cars/{carId}`

```text
city: string (2..80)
time: string (HH:mm)
seats: integer (1..8, conducteur inclus)
driver: { uid, name }
passengers: Array<{ uid, name }> (0..7)
waitlist: Array<{ uid, name }> (0..30)
createdAt, updatedAt: Timestamp
```

### `memberships/{uid}`

```text
uid: string
carId: string
role: "driver" | "passenger" | "waitlist"
displayName: string
createdAt: Timestamp
```

Toutes les opérations d'inscription utilisent une transaction :

1. lecture de `memberships/{uid}` et refus s'il existe ;
2. lecture et validation de la voiture ;
3. ajout à `passengers` si une place est libre, sinon à `waitlist` ;
4. création du membership correspondant dans la même transaction.

Quitter effectue l'opération inverse. La suppression lit les membres référencés, puis supprime la voiture et leurs memberships dans une transaction. La waitlist n'est jamais promue automatiquement.

## Règles et limites de sécurité

`firestore.rules` applique le refus par défaut, exige Firebase Auth, valide les schémas/bornes et lie les mutations des voitures aux memberships avec `getAfter`.

Les règles Firestore ne savent pas itérer sur une liste variable pour prouver, lors de la suppression d'une voiture, que tous les memberships ont été supprimés. Le service fourni réalise bien cette suppression atomique, avec des bornes qui restent sous les limites de transaction. Pour se défendre aussi contre un conducteur utilisant un client modifié, déplacer la suppression vers une Cloud Function/callable privilégiée.

Consulter `docs/firestore-security-analysis.md` pour les invariants, la revue contradictoire et les hypothèses. Les règles restent un prototype à tester sur émulateur puis à revoir avant une diffusion large.

## Photos de profil et Storage

1. Activez **Storage** dans la console Firebase.
2. Déployez les règles :

```sh
npx -y firebase-tools@latest deploy --only storage --project <PROJECT_ID>
npx -y firebase-tools@latest deploy --only firestore:rules --project <PROJECT_ID>
```

Les avatars sont stockés dans `profiles/{uid}/…` (Storage) et référencés dans `profiles/{uid}` (Firestore).
Le coffre est un tableau `trunk` sur chaque document `cars/{carId}`.

## Commandes

```sh
npm run dev
npm run lint
npm run test
npm run build
```

## Structure

- `src/contexts/AuthContext.jsx` : abstraction mock/Google ;
- `src/services/carService.js` : implémentations Firestore et démo, transactions ;
- `src/hooks/useCars.js` : abonnement temps réel ;
- `src/components/` : écrans, formulaire, liste, cartes, waitlist et notifications ;
- `firestore.rules` : règles de sécurité ;
- `storage.rules` : règles Storage pour les avatars ;
- `.env.example` : variables attendues sans secrets.
