# Snooker Scorer Pro

Une application PWA complète de comptage de points officiel de snooker avec backend Firebase.

## 🎯 Fonctionnalités

### Scoring en temps réel
- Interface mobile-first optimisée pour le scoring
- Règles officielles du snooker complètement implémentées
- Gestion des phases (rouges alternées avec couleurs → ordre couleurs)
- Fautes avec valeurs correctes (min 4, max selon bille)
- Free ball complet et snookers requis automatiques
- Re-spot black en cas d'égalité
- Breaks en temps réel avec détection centuries/half-centuries

### Gestion des joueurs
- CRUD complet avec avatars et informations
- Statistiques détaillées : matchs, victoires, frames, meilleur break, ELO
- Système ELO intégré avec mise à jour automatique
- Recherche et filtres avancés

### Matchs et formats
- Création de matchs par sets (best-of sets avec frames/set)
- Format frames uniquement également supporté
- Reprise de matchs interrompus (offline-first)
- Historique complet des coups pour audit

### Classements
- Classements saisonniers et mensuels
- Tri par ELO, victoires, meilleur break, etc.
- Agrégation automatique des statistiques
- Filtres par période

### Sécurité et rôles
- Authentification email/mot de passe uniquement
- Système de rôles : admin, scorer, viewer
- Aucune page publique (tout derrière auth)
- Rules Firestore sécurisées

### PWA et offline
- Fonctionne hors ligne pour le dernier match
- Service Worker avec cache intelligent
- Manifeste PWA complet
- Installation sur mobile/desktop

## 🛠 Stack technique

### Frontend
- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** + **shadcn/ui** pour l'interface
- **React Query** pour la gestion d'état serveur
- **Zustand** pour l'état local du moteur de match
- **React Hook Form** + **Zod** pour les formulaires
- **Lucide React** pour les icônes

### Backend
- **Firebase** complet :
  - **Firestore** pour la base de données
  - **Cloud Functions** pour la logique métier
  - **Authentication** pour la sécurité
  - **Storage** pour les avatars
  - **Hosting** pour le déploiement

### Tests
- **Vitest** pour les tests unitaires (règles & moteur)
- **Playwright** pour les tests E2E (flux complet)
- **Testing Library** pour les composants React

## 🚀 Installation et développement

### Prérequis
- Node.js 18+
- Firebase CLI
- Compte Firebase

### Configuration

1. **Cloner et installer**
```bash
git clone <repo>
cd snooker-scorer-pro
npm install
```

2. **Configuration Firebase**
```bash
# Installer Firebase CLI
npm install -g firebase-tools

# Se connecter à Firebase
firebase login

# Initialiser le projet
firebase init
```

3. **Variables d'environnement**
Créer `.env` avec vos clés Firebase :
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

### Développement

1. **Démarrer les émulateurs Firebase**
```bash
firebase emulators:start
```

2. **Démarrer le serveur de développement**
```bash
npm run dev
```

3. **Lancer les tests**
```bash
# Tests unitaires
npm run test

# Tests E2E
npm run test:e2e
```

## 📦 Déploiement

### Firebase (Functions + Firestore + Storage)

1. **Déployer les Functions**
```bash
cd functions
npm run build
cd ..
firebase deploy --only functions
```

2. **Déployer les règles Firestore**
```bash
firebase deploy --only firestore:rules
```

3. **Déployer les règles Storage**
```bash
firebase deploy --only storage
```

### Hostinger (Frontend statique)

1. **Build de production**
```bash
npm run build
```

2. **Upload sur Hostinger**
- Uploader le contenu du dossier `dist/` sur votre hébergement
- Configurer le fallback `404.html` → `index.html` pour le SPA
- Si sous-dossier, ajuster la `base` dans `vite.config.ts`

3. **Configuration domaine**
- Pointer votre domaine vers l'hébergement Hostinger
- Configurer HTTPS si nécessaire

## 🏗 Architecture

### Structure des fichiers
```
src/
├── components/          # Composants réutilisables
│   ├── ui/             # Composants UI de base (shadcn)
│   ├── layout/         # Layout et navigation
│   ├── auth/           # Authentification
│   └── scoring/        # Composants de scoring
├── pages/              # Pages principales
├── hooks/              # Hooks React personnalisés
├── services/           # Services Firebase
├── modules/            # Logique métier (règles snooker)
├── lib/                # Utilitaires
└── types/              # Types TypeScript

functions/
├── src/
│   ├── index.ts        # Cloud Functions
│   ├── types.ts        # Types partagés
│   └── matchEngine.ts  # Moteur de match côté serveur
```

### Modèles de données

#### Users
```typescript
{
  uid: string
  displayName: string
  email: string
  roles: { admin: boolean, scorer: boolean, viewer: boolean }
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

#### Players
```typescript
{
  id: string
  name: string
  avatarUrl?: string
  hand?: "L"|"R"
  club?: string
  stats: {
    matchesPlayed: number
    wins: number
    losses: number
    framesWon: number
    framesLost: number
    highestBreak: number
    breaks50plus: number
    breaks100plus: number
    avgPointsPerFrame: number
    elo: number
  }
  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy: string
  updatedBy: string
}
```

#### Matches
```typescript
{
  id: string
  status: "scheduled"|"live"|"completed"|"abandoned"
  format: {
    setsEnabled: boolean
    bestOfSets: number
    framesPerSet: number
  }
  players: [{ playerId: string, name: string }]
  current: {
    activePlayerId: string
    setNumber: number
    frameNumber: number
    breakPoints: number
    redsRemaining: number
    colorsPhase: boolean
    colorsOrderIndex?: number
    pointsOnTable: number
    freeballActive?: boolean
    snookersRequired?: boolean
  }
  score: {
    frames: [{ setNo, frameNo, p1Points, p2Points, winnerPlayerId?, highestBreak? }]
    sets: [{ setNo, p1Frames, p2Frames, winnerPlayerId? }]
    match: { p1Sets, p2Sets, winnerPlayerId? }
  }
  history: [{ id, timestamp, playerId, action, ball?, pointsDelta, note?, stateSnapshot? }]
  venue?: string
  referee?: string
  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy: string
  updatedBy: string
}
```

### Cloud Functions

#### `applyMatchEvent` (HTTPS)
Endpoint unique pour appliquer tous les événements de match :
- Validation des règles du snooker
- Mise à jour de l'état du match
- Gestion des transitions (fin frame/set/match)
- Détection automatique des snookers requis

#### `updateAggregatesOnMatchWrite` (Trigger)
Mise à jour automatique des statistiques :
- Recalcul des stats joueurs
- Mise à jour ELO
- Agrégation des classements saisonniers/mensuels

#### `recomputePlayerStats` (Callable)
Recalcul complet des statistiques d'un joueur (admin uniquement)

### Règles de sécurité Firestore

- **users** : lecture/écriture par propriétaire, rôles modifiables par admin uniquement
- **players** : lecture par tous connectés, écriture par admin/scorer, stats en écriture serveur uniquement
- **matches** : lecture par tous connectés, écriture par admin/scorer, transitions validées via Functions
- **leaderboards** : lecture par tous connectés, écriture serveur uniquement

## 🧪 Tests

### Tests unitaires (Vitest)
- Règles du snooker (`src/test/snooker-rules.test.ts`)
- Moteur de match (`src/test/match-engine.test.ts`)
- Composants React avec Testing Library

### Tests E2E (Playwright)
- Flux complet d'une frame (`e2e/complete-frame.spec.ts`)
- Scénarios avancés (free ball, century, re-rack, sets)
- Tests multi-navigateurs et mobile

## 📱 PWA

### Fonctionnalités
- **Offline** : cache des assets + dernier match
- **Installation** : sur mobile et desktop
- **Notifications** : pour les matchs en cours (optionnel)

### Service Worker
- **Cache First** pour les assets statiques
- **Network First** pour les API Firebase
- Cache du dernier match pour usage offline

## 🎨 Design

### Système de couleurs
Inspiré des couleurs du snooker :
- **Rouge** (#dc2626) : billes rouges, actions importantes
- **Vert** (#16a34a) : billes vertes, succès
- **Jaune** (#eab308) : billes jaunes, avertissements
- **Bleu** (#2563eb) : billes bleues, informations
- **Rose** (#ec4899) : billes roses, accents
- **Noir** (#1f2937) : billes noires, texte principal

### Responsive
- **Mobile First** : optimisé pour le scoring sur mobile
- **Breakpoints** : sm (640px), md (768px), lg (1024px), xl (1280px)
- **Touch Friendly** : boutons de taille appropriée pour le tactile

## 🔧 Scripts disponibles

```bash
# Développement
npm run dev              # Serveur de développement
npm run build           # Build de production
npm run preview         # Aperçu du build

# Tests
npm run test            # Tests unitaires
npm run test:ui         # Interface des tests
npm run test:e2e        # Tests E2E

# Linting
npm run lint            # ESLint
npm run type-check      # Vérification TypeScript

# Firebase
firebase emulators:start    # Émulateurs locaux
firebase deploy            # Déploiement complet
firebase deploy --only functions  # Functions uniquement
```

## 📄 Licence

MIT License - voir le fichier LICENSE pour plus de détails.

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📞 Support

Pour toute question ou problème :
- Ouvrir une issue sur GitHub
- Consulter la documentation Firebase
- Vérifier les logs des Cloud Functions

---

**Snooker Scorer Pro** - L'application de référence pour le scoring professionnel de snooker 🎱