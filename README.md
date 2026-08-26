# F1 Live Tracker (MVP)

Tracker F1 en temps réel basé sur l'API publique [OpenF1](https://openf1.org).
Affiche le tracé du circuit, la position des voitures, un classement, et un
panneau de détail télémétrie (vitesse, accélérateur, frein, gear, DRS) au clic
sur une voiture.

## Stack

- **Client** : React + TypeScript + Vite + Tailwind CSS, rendu du circuit et
  des voitures sur `<canvas>`.
- **Serveur** : Node.js + Fastify, proxy vers OpenF1 avec un cache mémoire
  (TTL par ressource) et un limiteur de débit (30 requêtes / 10s) pour ne
  jamais dépasser le quota de l'API.
- **Pas de base de données** : tout est en mémoire côté serveur.

## Démarrer le projet

```bash
npm install
npm run dev
```

Cela lance en parallèle :
- le serveur proxy sur `http://localhost:4000`
- le client Vite sur `http://localhost:5173` (avec `/api` proxifié vers le
  serveur)

Ouvrez `http://localhost:5173`.

## Mode Replay vs Mode Live

L'application démarre en **mode Replay**, sur la session Course de Belgique
2023 par défaut (une vraie session live n'existe que pendant un week-end de
Grand Prix).

- **Replay** : charge une fenêtre de 3 minutes de données de position et
  d'intervalles pour tous les pilotes à partir du début de la session
  choisie, puis rejoue ces données en boucle sur une horloge virtuelle
  accélérable (x1 à x25). Le tracé du circuit est construit à partir du
  pilote ayant le plus d'échantillons GPS dans cette fenêtre.
- **Live** : récupère la dernière session disponible (`session_key=latest`)
  et poll les positions/intervalles toutes les ~3.5s. Si l'API ne renvoie
  plus de nouvelles données (session terminée), un message clair s'affiche
  au lieu de planter.

### Changer de session en replay

Dans la barre de contrôle, modifiez les champs **Année** et **Pays** (ex.
`2023` / `Belgium`, `2024` / `Japan`) puis cliquez sur **Charger**. Le nom du
pays doit correspondre au champ `country_name` d'OpenF1.

### Détail d'un pilote

Cliquez sur un point voiture (sur le circuit) ou une ligne du classement pour
ouvrir le panneau de détail. Il affiche vitesse, accélérateur, frein, rapport
de vitesse et état DRS :
- en **live**, ce panneau poll `car_data` du pilote sélectionné toutes les 2s
- en **replay**, il précharge la fenêtre `car_data` du pilote une fois, puis
  l'échantillonne sur la même horloge virtuelle que les positions

## Structure du projet

```
server/
  src/
    index.ts            # bootstrap Fastify
    routes/openf1.ts     # routes proxy (/api/sessions, /api/drivers, ...)
    lib/openf1Client.ts   # appel HTTP OpenF1 + cache + rate limiter
    lib/cache.ts          # cache mémoire TTL
    lib/rateLimiter.ts    # token bucket 30 req / 10s

client/
  src/
    api/openf1.ts               # appels au proxy serveur
    types/openf1.ts             # types des ressources OpenF1
    hooks/
      useSessionSelection.ts    # sélection session/pilotes (mode live/replay)
      useLiveEngine.ts          # polling positions + intervalles en live
      useReplayEngine.ts        # préchargement + horloge virtuelle replay
      useDriverDetail.ts        # télémétrie du pilote sélectionné
    lib/trackPath.ts            # construction du tracé à partir des positions
    components/
      TrackCanvas.tsx           # rendu canvas du circuit + voitures
      Leaderboard.tsx           # classement latéral
      DriverDetailPanel.tsx     # panneau télémétrie
      ControlsBar.tsx           # bascule live/replay, sélection session
    App.tsx
```

## Endpoints OpenF1 utilisés (via le proxy)

- `GET /api/sessions` → `sessions`
- `GET /api/drivers` → `drivers`
- `GET /api/location` → `location`
- `GET /api/car_data` → `car_data`
- `GET /api/intervals` → `intervals`
- `GET /api/laps` → `laps` (route exposée, non encore utilisée par l'UI)

## Limitations connues (MVP)

- Le replay boucle sur une fenêtre fixe de 3 minutes plutôt que de rejouer
  la session entière (suffisant pour démontrer le concept ; passer à un
  chargement par fenêtres glissantes serait la prochaine étape).
- Pas d'authentification (l'API OpenF1 est publique).
- Pistes d'évolution suggérées : radios pilote/stand, météo, drapeaux/safety
  car, stratégie pneus.
