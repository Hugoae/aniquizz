apps/server/src/
├── config/
│   └── cors.ts              <-- Config de sécurité (qui a le droit de se connecter)
│
├── core/
│   ├── Server.ts            <-- Configuration d'Express et HTTP
│   └── SocketManager.ts     <-- Gestionnaire principal des sockets
│
├── modules/
│   ├── game/
│   │   ├── GameManager.ts   <-- Gère la liste des parties
│   │   ├── GameInstance.ts  <-- Une partie précise (Class)
│   │   └── gameHandlers.ts  <-- Reçoit les événements 'game:answer', 'game:start'...
│   │
│   ├── chat/
│   │   └── chatHandlers.ts  <-- Reçoit 'chat:message'
│   │
│   └── lobby/
│       └── lobbyHandlers.ts <-- Reçoit 'lobby:join', 'lobby:create'
│
└── index.ts                 <-- Point d'entrée ultra simple