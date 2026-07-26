# 🏦 Banque Bot Discord

Bot Discord d'économie virtuelle : comptes bancaires par serveur, transactions, 23 métiers avec
salaires réalistes, boutique, rôle Créateur avec panel limité, et panel propriétaire illimité et
caché envoyé en MP.

## Fonctionnalités

**Économie (par serveur — les comptes ne sont pas partagés entre serveurs)**
- `/solde [utilisateur]` — consulter un solde (poche + banque)
- `/metiers [rareté]` — liste des 23 métiers, leur salaire et leurs conditions de déblocage
- `/choisir-metier <métier>` — change de métier actif parmi ceux débloqués
- `/travailler` — fait un service dans ton métier actuel (cooldown 1h), débloque automatiquement les nouveaux métiers accessibles
- `/daily` — récompense quotidienne (cooldown 24h)
- `/payer <utilisateur> <montant>` — transférer de l'argent à quelqu'un
- `/deposer [montant]` — déposer du cash à la banque
- `/retirer [montant]` — retirer de l'argent de la banque
- `/boutique` — voir les articles disponibles
- `/acheter <article> [quantite]` — acheter un article
- `/inventaire` — voir ses objets
- `/classement` — top 10 des plus riches du serveur

**Administration à deux niveaux**
- `/createur-panel` — réservé au rôle Discord **Créateur** (attribué automatiquement, voir ci-dessous).
  Donner/retirer du cash ou consulter un solde, **limité** par action et par jour.
- **Panel propriétaire** — réservé à toi seul (`OWNER_ID`). **Ce n'est pas un slash command** : personne
  ne peut le voir ni le deviner en tapant "/". Tu l'ouvres en envoyant le message secret défini dans
  `OWNER_PANEL_TRIGGER` (par défaut `!panel`) **en message privé au bot**. Tu choisis ensuite un serveur
  parmi tous ceux où le bot est présent, puis une action **sans limite** (cash, banque, objets,
  réinitialisation, consultation).

Les données sont stockées dans SQLite (persistant, voir la section Déploiement pour Railway).

## Comment fonctionne le rôle Créateur

Tu n'as **rien à faire manuellement** : dès que le bot rejoint un nouveau serveur, il t'envoie
automatiquement un MP avec :
- Le nom du serveur, son nombre de membres
- **Un lien d'invitation** pour que tu puisses le rejoindre toi-même
- Le propriétaire Discord du serveur (pour référence)
- Une question : *"Qui sont les créateurs de ce serveur ?"*

Tu réponds à **ce message précis** (avec la fonction **Répondre** de Discord — clic droit ou survol du
message > Répondre) en donnant les ID Discord ou mentions des personnes concernées, séparés par des
virgules ou espaces. Le bot va alors, automatiquement :
1. Créer le rôle **Créateur** sur ce serveur s'il n'existe pas déjà (nom configurable via `CREATEUR_ROLE_NAME`)
2. L'attribuer à chaque personne identifiée
3. Leur envoyer un MP de confirmation : *"Bravo ! Tu as été reconnu comme l'un des créateurs de [serveur]..."*
4. Elles ont alors immédiatement accès à `/createur-panel` sur ce serveur

Tape `ignorer` en réponse au message si tu ne veux rien faire pour ce serveur.

**Important** : le bot doit avoir la permission **"Gérer les rôles"** et son propre rôle doit être
positionné plus haut que celui qu'il crée (sinon Discord refuse l'attribution) — c'est le cas par défaut
si tu l'invites avec les permissions recommandées ci-dessous.

## Système de métiers réaliste

23 métiers répartis en 6 niveaux de rareté (`src/metiers.js`). Le gain par `/travailler` est calculé
à partir du **salaire net mensuel moyen réel en France** : `salaire ÷ 151,67h × 4h` (un service simulé),
avec ±15% de variance. Les métiers très rares (astronaute, chasseur d'ouragans, chef d'orchestre...)
n'ont pas de grille salariale publique : le montant est une estimation raisonnée, indiquée comme telle
dans le code.

Plus un métier est rare, plus les conditions de déblocage sont exigeantes — basées sur le **nombre de
services effectués** et le **total cumulé gagné** (jamais le solde actuel, pour éviter de tricher en
dépensant), parfois avec un métier prérequis :

| Rareté | Exemple | Condition |
|---|---|---|
| Très courant | Caissier, Serveur | Aucune, débloqué dès le départ |
| Courant | Médecin généraliste, Avocat | ~15 services, 8 000 € cumulés |
| Peu courant | Pilote de ligne, Data Scientist | ~35-45 services, 25-40k € cumulés |
| Rare | Horloger, Démineur | ~60 services, 100-130k € cumulés |
| Très rare | Chirurgien, Forces spéciales | 100-150 services, 350-600k € cumulés + prérequis |
| Exceptionnellement rare | Astronaute, Prix Nobel | 180-200 services, 1-2M € cumulés + condition spéciale |

Le déblocage est vérifié automatiquement à chaque `/travailler` ; un message annonce les nouveaux
métiers accessibles. Le Prix Nobel exige en plus d'être **1er au `/classement`** du serveur au moment
du déblocage, et verse un bonus unique de 500 000 à l'obtention.

## Installation

1. **Créer une application Discord**
   - Va sur https://discord.com/developers/applications
   - "New Application" → onglet "Bot" → "Reset Token" → copie le token
   - Toujours dans l'onglet "Bot", section "Privileged Gateway Intents" : **active "Message Content
     Intent"**. C'est obligatoire pour que le bot puisse lire ton message secret et tes réponses en MP —
     sans ça, ces fonctionnalités ne marcheront pas.
   - Onglet "OAuth2 > URL Generator" → coche `bot` + `applications.commands`. Dans "Bot Permissions",
     coche au minimum : **View Channels, Send Messages, Create Instant Invite, Manage Roles,
     Use Slash Commands**. Génère le lien et invite le bot sur ton serveur.

2. **Installer les dépendances**
   ```bash
   cd banque-bot
   npm install
   ```

3. **Configurer**
   ```bash
   cp .env.example .env
   ```
   Remplis `.env` avec :
   - `DISCORD_TOKEN` : le token du bot
   - `CLIENT_ID` : l'Application ID (page "General Information")
   - `GUILD_ID` : l'ID de ton serveur principal pour un déploiement instantané des commandes (optionnel)
   - `OWNER_ID` : **ton** ID Discord — seul ce compte reçoit et peut ouvrir le panel propriétaire
   - `OWNER_PANEL_TRIGGER` : le message secret pour ouvrir ton panel en MP (change-le si tu veux plus de discrétion)
   - `CREATEUR_ROLE_NAME` : le nom du rôle donné aux créateurs identifiés
   - `CREATEUR_LIMITE_PAR_ACTION` / `CREATEUR_LIMITE_QUOTIDIENNE` : les plafonds du panel Créateur

4. **Déployer les commandes slash**
   ```bash
   npm run deploy
   ```

5. **Lancer le bot**
   ```bash
   npm start
   ```

6. **Ouvre une conversation privée avec ton bot** (envoie-lui n'importe quel message une première fois
   si Discord te le demande), pour que les MP automatiques puissent t'atteindre.

## Structure du projet

```
banque-bot/
├── src/
│   ├── index.js                  # point d'entrée, routeur (commandes/boutons/menus/modals/MP)
│   ├── deploy-commands.js        # enregistrement des slash commands
│   ├── database.js               # toute la logique SQLite (scope multi-serveurs)
│   ├── metiers.js                 # les 23 métiers, rareté, salaires, conditions
│   ├── commands/                  # une commande = un fichier (le panel propriétaire N'EN FAIT PAS PARTIE)
│   ├── handlers/
│   │   ├── createurHandler.js     # boutons/modals du panel Créateur
│   │   ├── ownerHandler.js        # boutons/modals du panel Propriétaire (MP)
│   │   └── nouveauServeur.js       # détection guildCreate, invitation, identification des créateurs
│   └── utils/
│       ├── format.js              # formatage des montants/durées
│       ├── progression.js         # déblocage automatique des métiers
│       └── permissions.js         # vérifications Owner / Créateur
├── banque.sqlite                   # base de données (créée au 1er lancement, ou via DB_PATH)
├── railway.json                     # config de déploiement Railway
├── .gitignore
├── .env                               # config (à créer depuis .env.example, jamais commité)
└── package.json
```

## Déploiement (GitHub + Railway)

1. **Pousser le projet sur GitHub**
   ```bash
   cd banque-bot
   git init
   git add .
   git commit -m "Bot banque Discord"
   git branch -M main
   git remote add origin https://github.com/<ton-pseudo>/<ton-repo>.git
   git push -u origin main
   ```
   Le `.gitignore` exclut déjà `.env`, `node_modules/` et la base SQLite locale — ne les pousse jamais tels quels.

2. **Créer le projet sur Railway**
   - [railway.app](https://railway.app) → "New Project" → "Deploy from GitHub repo" → sélectionne ton repo.
   - Railway détecte automatiquement Node.js (`package.json`) et utilisera `npm start`.

3. **Ajouter un volume persistant (obligatoire pour ne pas perdre les données)**
   - Onglet "Settings" du service → "Volumes" → "New Volume".
   - Monte-le par exemple sur `/data`.
   - Dans "Variables", ajoute `DB_PATH=/data/banque.sqlite` pour que la base survive aux redéploiements.

4. **Configurer les variables d'environnement**
   Dans l'onglet "Variables" de Railway, ajoute toutes les valeurs de `.env.example` :
   `DISCORD_TOKEN`, `CLIENT_ID`, `GUILD_ID` (optionnel), `CURRENCY_NAME`, `CURRENCY_SYMBOL`, `DB_PATH`,
   `OWNER_ID`, `OWNER_PANEL_TRIGGER`, `CREATEUR_ROLE_NAME`, `CREATEUR_LIMITE_PAR_ACTION`,
   `CREATEUR_LIMITE_QUOTIDIENNE`.

5. **Déployer les commandes slash une première fois**
   Railway ne l'exécute pas automatiquement. Deux options :
   - En local, avec les mêmes valeurs `DISCORD_TOKEN`/`CLIENT_ID`/`GUILD_ID` dans ton `.env` : `npm run deploy`.
   - Ou depuis Railway : onglet du service → un shell distant si disponible sur ton plan, puis `npm run deploy`.
   À refaire uniquement quand tu ajoutes/modifies une commande.

6. **Vérifier les logs**
   Onglet "Deployments" → clique sur le déploiement actif → tu dois voir `✅ Connecté en tant que ...`.

## Limites connues

- La demande "qui sont les créateurs ?" attend ta réponse **via la fonction Répondre de Discord**. Si
  tu envoies un message normal (sans répondre au message du bot), il ne sera pas reconnu comme une
  réponse à cette demande.
- Si plusieurs serveurs invitent le bot en même temps, chaque demande reste associée à son propre
  message grâce au système de réponse — pas de confusion possible même en cas de réponses différées.
- La liste des demandes en attente est actuellement en mémoire : si le bot redémarre avant que tu aies
  répondu, il faudra que quelqu'un réinvite le bot pour redéclencher la demande (ou tu peux attribuer
  le rôle manuellement dans Discord en attendant).

## Idées d'évolutions

- Système de prêts avec intérêts
- Braquages entre joueurs (`/braquer`) avec risque d'échec
- Rôles Discord débloqués par la boutique (donner automatiquement un rôle acheté)
- Taxes sur les transferts
- Historique des transactions consultable (`/historique`)
- Persister les demandes de créateurs en attente dans la base pour survivre à un redémarrage

Dis-moi lesquelles t'intéressent et je les ajoute.
