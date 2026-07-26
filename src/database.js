const Database = require('better-sqlite3');
const path = require('path');

// En production sur Railway, DB_PATH doit pointer vers un volume persistant
// (ex: /data/banque.sqlite) sinon la base est perdue à chaque redéploiement.
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'banque.sqlite');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// --- Création des tables (toutes scoped par guild_id sauf la boutique, commune à tous les serveurs) ---
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
    description TEXT
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
`);

// --- Migration : si une ancienne base (mono-serveur) existe, on la fait évoluer ---
function migrerVersMultiServeur(table, colonnesExtra = '') {
  const colonnes = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  if (colonnes.length > 0 && !colonnes.includes('guild_id')) {
    // Ancienne table sans guild_id détectée : on la renomme et recrée avec guild_id = 'LEGACY'
    db.exec(`ALTER TABLE ${table} RENAME TO ${table}_legacy`);
    return true;
  }
  return false;
}
// (Les CREATE TABLE IF NOT EXISTS ci-dessus suffisent pour une base neuve ;
//  pour une base existante déjà multi-serveurs, rien à faire de plus ici.)

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

// Boutique de départ (uniquement si vide)
const nbItems = db.prepare('SELECT COUNT(*) as c FROM boutique').get().c;
if (nbItems === 0) {
  const insert = db.prepare('INSERT INTO boutique (item_id, nom, prix, description) VALUES (?, ?, ?, ?)');
  const items = [
    ['canne_peche', 'Canne à pêche', 250, "Un outil pour pêcher (décoratif pour l'instant)"],
    ['ordinateur', 'Ordinateur portable', 1200, 'Augmente ton style'],
    ['voiture', 'Voiture', 15000, 'Un véhicule de luxe'],
    ['maison', 'Maison', 50000, 'Un chez-toi bien à toi'],
  ];
  const insertMany = db.transaction((rows) => rows.forEach((r) => insert.run(...r)));
  insertMany(items);
}

// --- Fonctions comptes (toutes scoped à un serveur précis) ---
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

function enregistrerGainTravail(userId, guildId, gain) {
  getCompte(userId, guildId);
  db.prepare(
    'UPDATE comptes SET cash = cash + ?, nb_travaux = nb_travaux + 1, total_gagne = total_gagne + ? WHERE user_id = ? AND guild_id = ?'
  ).run(gain, gain, userId, guildId);
}

function setMetierActuel(userId, guildId, metierId) {
  getCompte(userId, guildId);
  db.prepare('UPDATE comptes SET metier_actuel = ? WHERE user_id = ? AND guild_id = ?').run(metierId, userId, guildId);
}

function resetCompte(userId, guildId) {
  db.prepare('DELETE FROM comptes WHERE user_id = ? AND guild_id = ?').run(userId, guildId);
  db.prepare('DELETE FROM metiers_debloques WHERE user_id = ? AND guild_id = ?').run(userId, guildId);
  db.prepare('DELETE FROM inventaire WHERE user_id = ? AND guild_id = ?').run(userId, guildId);
  getCompte(userId, guildId); // recrée un compte neuf
}

function logTransaction(fromUser, toUser, montant, type, guildId) {
  db.prepare('INSERT INTO transactions (guild_id, from_user, to_user, montant, type, timestamp) VALUES (?, ?, ?, ?, ?, ?)')
    .run(guildId, fromUser, toUser, montant, type, Date.now());
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

// --- Boutique / inventaire (catalogue commun, inventaire par serveur) ---
function getBoutique() {
  return db.prepare('SELECT * FROM boutique ORDER BY prix ASC').all();
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
    SELECT i.item_id, i.quantite, b.nom, b.prix, b.description
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

// --- Quota quotidien du rôle Président (pour limiter les abus) ---
function getJourCourant() {
  return new Date().toISOString().slice(0, 10); // ex: "2026-07-25"
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
};
