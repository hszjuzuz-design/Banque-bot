const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'banque.sqlite');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS comptes (
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    cash INTEGER NOT NULL DEFAULT 500,
    banque INTEGER NOT NULL DEFAULT 0,
    last_work INTEGER DEFAULT 0,
    last_daily INTEGER DEFAULT 0,
    nb_travaux INTEGER NOT NULL DEFAULT 0,
    total_gagne INTEGER NOT NULL DEFAULT 0,
    metier_actuel TEXT DEFAULT 'caissier',
    pv INTEGER NOT NULL DEFAULT 100,
    PRIMARY KEY (user_id, guild_id)
  );

  CREATE TABLE IF NOT EXISTS metiers_debloques (
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    metier_id TEXT NOT NULL,
    debloque_le INTEGER NOT NULL,
    PRIMARY KEY (user_id, guild_id, metier_id)
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    from_user TEXT,
    to_user TEXT,
    montant INTEGER NOT NULL,
    type TEXT NOT NULL,
    timestamp INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS boutique (
    item_id TEXT PRIMARY KEY,
    nom TEXT NOT NULL,
    prix INTEGER NOT NULL,
    description TEXT,
    defense INTEGER NOT NULL DEFAULT 0,
    categorie TEXT NOT NULL DEFAULT 'boutique'
  );

  CREATE TABLE IF NOT EXISTS inventaire (
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    quantite INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, guild_id, item_id)
  );

  CREATE TABLE IF NOT EXISTS createur_quota (
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    jour TEXT NOT NULL,
    montant_utilise INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, guild_id, jour)
  );

  CREATE TABLE IF NOT EXISTS createurs_serveur (
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    reconnu_le INTEGER NOT NULL,
    PRIMARY KEY (guild_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS tresor_serveur (
    guild_id TEXT PRIMARY KEY,
    montant INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS owner_tresor (
    cle TEXT PRIMARY KEY,
    montant INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS reputation_metiers (
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    metier_id TEXT NOT NULL,
    points INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, guild_id, metier_id)
  );

  CREATE TABLE IF NOT EXISTS succes_debloques (
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    succes_id TEXT NOT NULL,
    obtenu_le INTEGER NOT NULL,
    PRIMARY KEY (user_id, guild_id, succes_id)
  );

  CREATE TABLE IF NOT EXISTS quetes_progression (
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    jour TEXT NOT NULL,
    quete_id TEXT NOT NULL,
    progression INTEGER NOT NULL DEFAULT 0,
    reclamee INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, guild_id, jour, quete_id)
  );

  CREATE TABLE IF NOT EXISTS capacite_cooldown (
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    derniere_utilisation INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, guild_id)
  );

  CREATE TABLE IF NOT EXISTS vol_cooldown (
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    derniere_tentative INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, guild_id)
  );

  CREATE TABLE IF NOT EXISTS credits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    demandeur_id TEXT NOT NULL,
    montant_initial INTEGER NOT NULL,
    montant_du INTEGER NOT NULL,
    jours_demandes INTEGER NOT NULL DEFAULT 7,
    statut TEXT NOT NULL DEFAULT 'en_attente',
    raison TEXT,
    date_demande INTEGER NOT NULL,
    date_echeance INTEGER,
    dernier_ajustement TEXT
  );
`);

// --- Migrations pour les bases déjà existantes ---
const colonnesComptes = db.prepare("PRAGMA table_info(comptes)").all().map((c) => c.name);
if (!colonnesComptes.includes('nb_travaux')) {
  db.exec('ALTER TABLE comptes ADD COLUMN nb_travaux INTEGER NOT NULL DEFAULT 0');
}
if (!colonnesComptes.includes('total_gagne')) {
  db.exec('ALTER TABLE comptes ADD COLUMN total_gagne INTEGER NOT NULL DEFAULT 0');
}
if (!colonnesComptes.includes('metier_actuel')) {
  db.exec("ALTER TABLE comptes ADD COLUMN metier_actuel TEXT DEFAULT 'caissier'");
}
if (!colonnesComptes.includes('pv')) {
  db.exec('ALTER TABLE comptes ADD COLUMN pv INTEGER NOT NULL DEFAULT 100');
}
if (!colonnesComptes.includes('daily_streak')) {
  db.exec('ALTER TABLE comptes ADD COLUMN daily_streak INTEGER NOT NULL DEFAULT 0');
}
if (!colonnesComptes.includes('dernier_daily_jour')) {
  db.exec('ALTER TABLE comptes ADD COLUMN dernier_daily_jour TEXT DEFAULT NULL');
}
if (!colonnesComptes.includes('accidents_subis')) {
  db.exec('ALTER TABLE comptes ADD COLUMN accidents_subis INTEGER NOT NULL DEFAULT 0');
}
if (!colonnesComptes.includes('hacking_xp')) {
  db.exec('ALTER TABLE comptes ADD COLUMN hacking_xp INTEGER NOT NULL DEFAULT 0');
}

const colonnesBoutique = db.prepare("PRAGMA table_info(boutique)").all().map((c) => c.name);
if (!colonnesBoutique.includes('defense')) {
  db.exec('ALTER TABLE boutique ADD COLUMN defense INTEGER NOT NULL DEFAULT 0');
}
if (!colonnesBoutique.includes('categorie')) {
  db.exec("ALTER TABLE boutique ADD COLUMN categorie TEXT NOT NULL DEFAULT 'boutique'");
}

db.prepare("INSERT OR IGNORE INTO owner_tresor (cle, montant) VALUES ('global', 0)").run();

// Catalogue par défaut : INSERT OR IGNORE pour pouvoir ajouter de nouveaux articles
// à une base déjà existante sans écraser ce que les joueurs possèdent déjà.
const insertItem = db.prepare(
  'INSERT OR IGNORE INTO boutique (item_id, nom, prix, description, defense, categorie) VALUES (?, ?, ?, ?, ?, ?)'
);
const catalogueDefaut = [
  ['canne_peche', 'Canne à pêche', 250, "Un outil pour pêcher (décoratif pour l'instant)", 0, 'boutique'],
  ['ordinateur', 'Ordinateur portable', 1200, 'Augmente ton style', 0, 'boutique'],
  ['voiture', 'Voiture', 15000, 'Un véhicule de luxe', 0, 'boutique'],
  ['maison', 'Maison', 50000, 'Un chez-toi bien à toi', 0, 'boutique'],
  ['kit_premiers_secours', 'Kit de premiers secours', 350, 'Réduit légèrement les dégâts subis au travail', 5, 'boutique'],
  ['casque_militaire', 'Casque militaire', 700, 'Protection supplémentaire contre les accidents', 10, 'boutique'],
  ['gilet_pare_balles', 'Gilet pare-balles', 1200, 'Réduit nettement les dégâts subis au travail', 15, 'boutique'],
  ['gilet_blinde_lourd', 'Gilet blindé lourd', 2500, 'Protection maximale contre les accidents', 30, 'boutique'],
  ['montre_collection', 'Montre de collection', 5000, "Pièce d'horlogerie rare, obtenue via la capacité de l'Horloger", 0, 'boutique'],
  ['masque', 'Masque', 400, "Réduit légèrement le risque de te faire attraper lors d'un vol à la poche.", 0, 'supermarche'],
  ['kit_effraction', "Kit d'effraction", 800, "Augmente légèrement le montant récupéré lors d'un vol à la poche.", 0, 'supermarche'],
  ['pc_portable_hack', 'PC de piratage', 3000, "Indispensable pour tenter un vol bancaire (/voler banque). Sans lui, impossible de pirater.", 0, 'supermarche'],
  ['formation_hacking_1', 'Formation piratage — Niveau 1', 500, '+10 XP de hacking.', 0, 'formation'],
  ['formation_hacking_2', 'Formation piratage — Niveau 2', 1500, '+30 XP de hacking.', 0, 'formation'],
  ['formation_hacking_3', 'Formation piratage — Niveau 3', 4000, '+75 XP de hacking.', 0, 'formation'],
  ['formation_hacking_4', 'Formation piratage — Niveau 4 (élite)', 10000, '+200 XP de hacking.', 0, 'formation'],
];
const seedCatalogue = db.transaction((rows) => rows.forEach((r) => insertItem.run(...r)));
seedCatalogue(catalogueDefaut);

// --- Comptes ---
function getCompte(userId, guildId) {
  let compte = db.prepare('SELECT * FROM comptes WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
  if (!compte) {
    db.prepare('INSERT INTO comptes (user_id, guild_id) VALUES (?, ?)').run(userId, guildId);
    compte = db.prepare('SELECT * FROM comptes WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
  }
  return compte;
}

function updateCash(userId, guildId, delta) {
  getCompte(userId, guildId);
  db.prepare('UPDATE comptes SET cash = cash + ? WHERE user_id = ? AND guild_id = ?').run(delta, userId, guildId);
}

function updateBanque(userId, guildId, delta) {
  getCompte(userId, guildId);
  db.prepare('UPDATE comptes SET banque = banque + ? WHERE user_id = ? AND guild_id = ?').run(delta, userId, guildId);
}

function setLastWork(userId, guildId, timestamp) {
  db.prepare('UPDATE comptes SET last_work = ? WHERE user_id = ? AND guild_id = ?').run(timestamp, userId, guildId);
}

function setLastDaily(userId, guildId, timestamp) {
  db.prepare('UPDATE comptes SET last_daily = ? WHERE user_id = ? AND guild_id = ?').run(timestamp, userId, guildId);
}

function enregistrerGainTravail(userId, guildId, gainNet, gainBrutPourProgression) {
  getCompte(userId, guildId);
  db.prepare(
    'UPDATE comptes SET cash = cash + ?, nb_travaux = nb_travaux + 1, total_gagne = total_gagne + ? WHERE user_id = ? AND guild_id = ?'
  ).run(gainNet, gainBrutPourProgression, userId, guildId);
}

function setMetierActuel(userId, guildId, metierId) {
  getCompte(userId, guildId);
  db.prepare('UPDATE comptes SET metier_actuel = ? WHERE user_id = ? AND guild_id = ?').run(metierId, userId, guildId);
}

function resetCompte(userId, guildId) {
  db.prepare('DELETE FROM comptes WHERE user_id = ? AND guild_id = ?').run(userId, guildId);
  db.prepare('DELETE FROM metiers_debloques WHERE user_id = ? AND guild_id = ?').run(userId, guildId);
  db.prepare('DELETE FROM inventaire WHERE user_id = ? AND guild_id = ?').run(userId, guildId);
  getCompte(userId, guildId);
}

function logTransaction(fromUser, toUser, montant, type, guildId) {
  db.prepare('INSERT INTO transactions (guild_id, from_user, to_user, montant, type, timestamp) VALUES (?, ?, ?, ?, ?, ?)')
    .run(guildId, fromUser, toUser, montant, type, Date.now());
}

// --- Santé (PV) ---
function setPv(userId, guildId, valeur) {
  getCompte(userId, guildId);
  const clamped = Math.max(0, Math.min(100, valeur));
  db.prepare('UPDATE comptes SET pv = ? WHERE user_id = ? AND guild_id = ?').run(clamped, userId, guildId);
  return clamped;
}

function getDefenseTotale(userId, guildId) {
  const row = db.prepare(`
    SELECT COALESCE(SUM(b.defense), 0) AS total
    FROM inventaire i JOIN boutique b ON i.item_id = b.item_id
    WHERE i.user_id = ? AND i.guild_id = ? AND i.quantite > 0
  `).get(userId, guildId);
  return row.total;
}

function incrementerAccidents(userId, guildId) {
  getCompte(userId, guildId);
  db.prepare('UPDATE comptes SET accidents_subis = accidents_subis + 1 WHERE user_id = ? AND guild_id = ?').run(userId, guildId);
}

function getJourCourant() {
  return new Date().toISOString().slice(0, 10);
}

function setDailyInfo(userId, guildId, streak, jour) {
  getCompte(userId, guildId);
  db.prepare('UPDATE comptes SET daily_streak = ?, dernier_daily_jour = ? WHERE user_id = ? AND guild_id = ?')
    .run(streak, jour, userId, guildId);
}

// --- Réputation par métier ---
function ajouterReputation(userId, guildId, metierId, points = 1) {
  const existant = db.prepare('SELECT 1 FROM reputation_metiers WHERE user_id = ? AND guild_id = ? AND metier_id = ?')
    .get(userId, guildId, metierId);
  if (existant) {
    db.prepare('UPDATE reputation_metiers SET points = points + ? WHERE user_id = ? AND guild_id = ? AND metier_id = ?')
      .run(points, userId, guildId, metierId);
  } else {
    db.prepare('INSERT INTO reputation_metiers (user_id, guild_id, metier_id, points) VALUES (?, ?, ?, ?)')
      .run(userId, guildId, metierId, points);
  }
}

function getReputation(userId, guildId, metierId) {
  const row = db.prepare('SELECT points FROM reputation_metiers WHERE user_id = ? AND guild_id = ? AND metier_id = ?')
    .get(userId, guildId, metierId);
  return row ? row.points : 0;
}

function getReputationToutes(userId, guildId) {
  return db.prepare('SELECT metier_id, points FROM reputation_metiers WHERE user_id = ? AND guild_id = ? ORDER BY points DESC')
    .all(userId, guildId);
}

// --- Succès ---
function getSuccesDebloques(userId, guildId) {
  return db.prepare('SELECT succes_id FROM succes_debloques WHERE user_id = ? AND guild_id = ?')
    .all(userId, guildId).map((r) => r.succes_id);
}

function estSuccesDebloque(userId, guildId, succesId) {
  return !!db.prepare('SELECT 1 FROM succes_debloques WHERE user_id = ? AND guild_id = ? AND succes_id = ?')
    .get(userId, guildId, succesId);
}

function debloquerSucces(userId, guildId, succesId) {
  db.prepare('INSERT OR IGNORE INTO succes_debloques (user_id, guild_id, succes_id, obtenu_le) VALUES (?, ?, ?, ?)')
    .run(userId, guildId, succesId, Date.now());
}

function compterObjetsDistincts(userId, guildId) {
  const row = db.prepare('SELECT COUNT(*) AS c FROM inventaire WHERE user_id = ? AND guild_id = ? AND quantite > 0')
    .get(userId, guildId);
  return row.c;
}

// --- Quêtes journalières ---
function getQuetesDuJour(userId, guildId) {
  const jour = getJourCourant();
  return db.prepare('SELECT quete_id, progression, reclamee FROM quetes_progression WHERE user_id = ? AND guild_id = ? AND jour = ?')
    .all(userId, guildId, jour);
}

function incrementerQuete(userId, guildId, queteId, valeur = 1) {
  const jour = getJourCourant();
  const existant = db.prepare('SELECT 1 FROM quetes_progression WHERE user_id = ? AND guild_id = ? AND jour = ? AND quete_id = ?')
    .get(userId, guildId, jour, queteId);
  if (existant) {
    db.prepare('UPDATE quetes_progression SET progression = progression + ? WHERE user_id = ? AND guild_id = ? AND jour = ? AND quete_id = ?')
      .run(valeur, userId, guildId, jour, queteId);
  } else {
    db.prepare('INSERT INTO quetes_progression (user_id, guild_id, jour, quete_id, progression) VALUES (?, ?, ?, ?, ?)')
      .run(userId, guildId, jour, queteId, valeur);
  }
}

function marquerQueteReclamee(userId, guildId, queteId) {
  const jour = getJourCourant();
  db.prepare('UPDATE quetes_progression SET reclamee = 1 WHERE user_id = ? AND guild_id = ? AND jour = ? AND quete_id = ?')
    .run(userId, guildId, jour, queteId);
}

// --- Métiers débloqués ---
function estDebloque(userId, guildId, metierId) {
  const row = db.prepare('SELECT 1 FROM metiers_debloques WHERE user_id = ? AND guild_id = ? AND metier_id = ?')
    .get(userId, guildId, metierId);
  return !!row;
}

function debloquerMetier(userId, guildId, metierId) {
  db.prepare('INSERT OR IGNORE INTO metiers_debloques (user_id, guild_id, metier_id, debloque_le) VALUES (?, ?, ?, ?)')
    .run(userId, guildId, metierId, Date.now());
}

function getMetiersDebloques(userId, guildId) {
  return db.prepare('SELECT metier_id FROM metiers_debloques WHERE user_id = ? AND guild_id = ?')
    .all(userId, guildId).map((r) => r.metier_id);
}

// --- Boutique / inventaire ---
function getBoutique(categorie = 'boutique') {
  return db.prepare('SELECT * FROM boutique WHERE categorie = ? ORDER BY prix ASC').all(categorie);
}

function getItem(itemId) {
  return db.prepare('SELECT * FROM boutique WHERE item_id = ?').get(itemId);
}

function addInventaire(userId, guildId, itemId, quantite = 1) {
  const existant = db.prepare('SELECT * FROM inventaire WHERE user_id = ? AND guild_id = ? AND item_id = ?')
    .get(userId, guildId, itemId);
  if (existant) {
    db.prepare('UPDATE inventaire SET quantite = quantite + ? WHERE user_id = ? AND guild_id = ? AND item_id = ?')
      .run(quantite, userId, guildId, itemId);
  } else {
    db.prepare('INSERT INTO inventaire (user_id, guild_id, item_id, quantite) VALUES (?, ?, ?, ?)')
      .run(userId, guildId, itemId, quantite);
  }
}

function getInventaire(userId, guildId) {
  return db.prepare(`
    SELECT i.item_id, i.quantite, b.nom, b.prix, b.description, b.defense
    FROM inventaire i JOIN boutique b ON i.item_id = b.item_id
    WHERE i.user_id = ? AND i.guild_id = ? AND i.quantite > 0
  `).all(userId, guildId);
}

function getClassement(guildId, limit = 10) {
  return db.prepare(`
    SELECT user_id, (cash + banque) AS total
    FROM comptes WHERE guild_id = ? ORDER BY total DESC LIMIT ?
  `).all(guildId, limit);
}

// --- Quota quotidien du rôle Créateur ---
function getJourCourant() {
  return new Date().toISOString().slice(0, 10);
}

function getQuotaUtilise(userId, guildId) {
  const jour = getJourCourant();
  const row = db.prepare('SELECT montant_utilise FROM createur_quota WHERE user_id = ? AND guild_id = ? AND jour = ?')
    .get(userId, guildId, jour);
  return row ? row.montant_utilise : 0;
}

function ajouterQuotaUtilise(userId, guildId, montant) {
  const jour = getJourCourant();
  const existant = db.prepare('SELECT 1 FROM createur_quota WHERE user_id = ? AND guild_id = ? AND jour = ?')
    .get(userId, guildId, jour);
  if (existant) {
    db.prepare('UPDATE createur_quota SET montant_utilise = montant_utilise + ? WHERE user_id = ? AND guild_id = ? AND jour = ?')
      .run(montant, userId, guildId, jour);
  } else {
    db.prepare('INSERT INTO createur_quota (user_id, guild_id, jour, montant_utilise) VALUES (?, ?, ?, ?)')
      .run(userId, guildId, jour, montant);
  }
}

function ajouterCreateurReconnu(guildId, userId) {
  db.prepare('INSERT OR IGNORE INTO createurs_serveur (guild_id, user_id, reconnu_le) VALUES (?, ?, ?)')
    .run(guildId, userId, Date.now());
}

function estCreateurReconnu(guildId, userId) {
  return !!db.prepare('SELECT 1 FROM createurs_serveur WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
}

function getCreateursDuServeur(guildId) {
  return db.prepare('SELECT user_id FROM createurs_serveur WHERE guild_id = ?').all(guildId).map((r) => r.user_id);
}

// --- Trésor du serveur (taxes collectées, géré par le Créateur) ---
function getTresor(guildId) {
  const row = db.prepare('SELECT montant FROM tresor_serveur WHERE guild_id = ?').get(guildId);
  return row ? row.montant : 0;
}

function ajouterTresor(guildId, montant) {
  const existant = db.prepare('SELECT 1 FROM tresor_serveur WHERE guild_id = ?').get(guildId);
  if (existant) {
    db.prepare('UPDATE tresor_serveur SET montant = montant + ? WHERE guild_id = ?').run(montant, guildId);
  } else {
    db.prepare('INSERT INTO tresor_serveur (guild_id, montant) VALUES (?, ?)').run(guildId, montant);
  }
}

function retirerTresor(guildId, montant) {
  ajouterTresor(guildId, -montant);
}

// --- Revenus globaux du propriétaire (part des taxes de tous les serveurs) ---
function getRevenuOwner() {
  const row = db.prepare("SELECT montant FROM owner_tresor WHERE cle = 'global'").get();
  return row ? row.montant : 0;
}

function ajouterRevenuOwner(montant) {
  db.prepare("UPDATE owner_tresor SET montant = montant + ? WHERE cle = 'global'").run(montant);
}

function reinitialiserRevenuOwner() {
  const montant = getRevenuOwner();
  db.prepare("UPDATE owner_tresor SET montant = 0 WHERE cle = 'global'").run();
  return montant;
}

// --- Capacités de métier ---
function getDerniereCapacite(userId, guildId) {
  const row = db.prepare('SELECT derniere_utilisation FROM capacite_cooldown WHERE user_id = ? AND guild_id = ?')
    .get(userId, guildId);
  return row ? row.derniere_utilisation : 0;
}

function setDerniereCapacite(userId, guildId, timestamp) {
  const existant = db.prepare('SELECT 1 FROM capacite_cooldown WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
  if (existant) {
    db.prepare('UPDATE capacite_cooldown SET derniere_utilisation = ? WHERE user_id = ? AND guild_id = ?')
      .run(timestamp, userId, guildId);
  } else {
    db.prepare('INSERT INTO capacite_cooldown (user_id, guild_id, derniere_utilisation) VALUES (?, ?, ?)')
      .run(userId, guildId, timestamp);
  }
}

function crediterTousLesJoueurs(guildId, montant) {
  const info = db.prepare('UPDATE comptes SET cash = cash + ? WHERE guild_id = ?').run(montant, guildId);
  return info.changes;
}

function ajouterReputationSelonMetierActuel(guildId, points) {
  const joueurs = db.prepare('SELECT user_id, metier_actuel FROM comptes WHERE guild_id = ?').all(guildId);
  for (const j of joueurs) {
    ajouterReputation(j.user_id, guildId, j.metier_actuel || 'caissier', points);
  }
  return joueurs.length;
}

// --- Hacking / vols ---
function ajouterHackingXp(userId, guildId, points) {
  getCompte(userId, guildId);
  db.prepare('UPDATE comptes SET hacking_xp = hacking_xp + ? WHERE user_id = ? AND guild_id = ?')
    .run(points, userId, guildId);
}

function getDerniereTentativeVol(userId, guildId) {
  const row = db.prepare('SELECT derniere_tentative FROM vol_cooldown WHERE user_id = ? AND guild_id = ?')
    .get(userId, guildId);
  return row ? row.derniere_tentative : 0;
}

function setDerniereTentativeVol(userId, guildId, timestamp) {
  const existant = db.prepare('SELECT 1 FROM vol_cooldown WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
  if (existant) {
    db.prepare('UPDATE vol_cooldown SET derniere_tentative = ? WHERE user_id = ? AND guild_id = ?')
      .run(timestamp, userId, guildId);
  } else {
    db.prepare('INSERT INTO vol_cooldown (user_id, guild_id, derniere_tentative) VALUES (?, ?, ?)')
      .run(userId, guildId, timestamp);
  }
}

function possede(userId, guildId, itemId) {
  const row = db.prepare('SELECT 1 FROM inventaire WHERE user_id = ? AND guild_id = ? AND item_id = ? AND quantite > 0')
    .get(userId, guildId, itemId);
  return !!row;
}

// --- Crédits (prêts) ---
function creerDemandeCredit(guildId, userId, montant, jours, raison) {
  const info = db.prepare(
    'INSERT INTO credits (guild_id, demandeur_id, montant_initial, montant_du, jours_demandes, statut, raison, date_demande) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(guildId, userId, montant, montant, jours, 'en_attente', raison || null, Date.now());
  return info.lastInsertRowid;
}

function getCreditsEnAttente(guildId) {
  return db.prepare("SELECT * FROM credits WHERE guild_id = ? AND statut = 'en_attente' ORDER BY date_demande ASC")
    .all(guildId);
}

function getCreditActif(userId, guildId) {
  return db.prepare("SELECT * FROM credits WHERE guild_id = ? AND demandeur_id = ? AND statut = 'actif'")
    .get(guildId, userId);
}

function getCreditParId(id) {
  return db.prepare('SELECT * FROM credits WHERE id = ?').get(id);
}

function accepterCredit(id, jours) {
  const credit = getCreditParId(id);
  if (!credit) return null;
  const echeance = Date.now() + jours * 24 * 60 * 60 * 1000;
  db.prepare("UPDATE credits SET statut = 'actif', date_echeance = ?, dernier_ajustement = ? WHERE id = ?")
    .run(echeance, getJourCourant(), id);
  updateCash(credit.demandeur_id, credit.guild_id, credit.montant_initial);
  return credit;
}

function refuserCredit(id) {
  db.prepare("UPDATE credits SET statut = 'refuse' WHERE id = ?").run(id);
}

function rembourserCredit(id, montant) {
  const credit = getCreditParId(id);
  if (!credit) return null;
  const nouveauMontant = Math.max(0, credit.montant_du - montant);
  const statut = nouveauMontant === 0 ? 'rembourse' : 'actif';
  db.prepare('UPDATE credits SET montant_du = ?, statut = ? WHERE id = ?').run(nouveauMontant, statut, id);
  return { ...credit, montant_du: nouveauMontant, statut };
}

function appliquerPenalitesRetard() {
  const aujourdhui = getJourCourant();
  const enRetard = db.prepare(
    "SELECT * FROM credits WHERE statut = 'actif' AND date_echeance < ? AND (dernier_ajustement IS NULL OR dernier_ajustement != ?)"
  ).all(Date.now(), aujourdhui);

  for (const credit of enRetard) {
    const penalite = Math.max(1, Math.ceil(credit.montant_initial * 0.05));
    db.prepare('UPDATE credits SET montant_du = montant_du + ?, dernier_ajustement = ? WHERE id = ?')
      .run(penalite, aujourdhui, credit.id);
  }
  return enRetard.length;
}

module.exports = {
  db,
  getCompte,
  updateCash,
  updateBanque,
  setLastWork,
  setLastDaily,
  enregistrerGainTravail,
  setMetierActuel,
  resetCompte,
  logTransaction,
  setPv,
  getDefenseTotale,
  incrementerAccidents,
  getJourCourant,
  setDailyInfo,
  ajouterReputation,
  getReputation,
  getReputationToutes,
  getSuccesDebloques,
  estSuccesDebloque,
  debloquerSucces,
  compterObjetsDistincts,
  getQuetesDuJour,
  incrementerQuete,
  marquerQueteReclamee,
  estDebloque,
  debloquerMetier,
  getMetiersDebloques,
  getBoutique,
  getItem,
  addInventaire,
  getInventaire,
  getClassement,
  getQuotaUtilise,
  ajouterQuotaUtilise,
  ajouterCreateurReconnu,
  estCreateurReconnu,
  getCreateursDuServeur,
  getTresor,
  ajouterTresor,
  retirerTresor,
  getRevenuOwner,
  ajouterRevenuOwner,
  reinitialiserRevenuOwner,
  getDerniereCapacite,
  setDerniereCapacite,
  crediterTousLesJoueurs,
  ajouterReputationSelonMetierActuel,
  ajouterHackingXp,
  getDerniereTentativeVol,
  setDerniereTentativeVol,
  possede,
  creerDemandeCredit,
  getCreditsEnAttente,
  getCreditActif,
  getCreditParId,
  accepterCredit,
  refuserCredit,
  rembourserCredit,
  appliquerPenalitesRetard,
};
