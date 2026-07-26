const {
  getCompte,
  estDebloque,
  debloquerMetier,
  updateCash,
  getClassement,
  getMetiersDebloques,
  getSuccesDebloques,
  estSuccesDebloque,
  debloquerSucces,
  compterObjetsDistincts,
} = require('../database');
const { METIERS } = require('../metiers');
const { SUCCES } = require('../succes');

/**
 * Vérifie tous les métiers non débloqués d'un utilisateur (sur un serveur donné) et débloque
 * ceux dont les conditions sont remplies. Retourne la liste des métiers nouvellement débloqués.
 */
function verifierDeblocages(userId, guildId) {
  const compte = getCompte(userId, guildId);
  const nouveaux = [];

  for (const metier of METIERS) {
    if (!metier.condition) continue;
    if (estDebloque(userId, guildId, metier.id)) continue;

    const c = metier.condition;
    let ok = compte.nb_travaux >= (c.travaux || 0) && compte.total_gagne >= (c.totalGagne || 0);

    if (ok && c.metierRequis) {
      ok = estDebloque(userId, guildId, c.metierRequis);
    }

    if (ok && c.premierDuClassement) {
      const top = getClassement(guildId, 1);
      ok = top.length > 0 && top[0].user_id === userId;
    }

    if (ok) {
      debloquerMetier(userId, guildId, metier.id);
      if (metier.bonusDeblocage) {
        updateCash(userId, guildId, metier.bonusDeblocage);
      }
      nouveaux.push(metier);
    }
  }

  return nouveaux;
}

function estDisponible(userId, guildId, metier) {
  if (!metier.condition) return true;
  return estDebloque(userId, guildId, metier.id);
}

/**
 * Vérifie tous les succès non débloqués d'un utilisateur et débloque ceux
 * dont la condition est remplie, en versant la récompense associée.
 */
function verifierSucces(userId, guildId) {
  const compte = getCompte(userId, guildId);
  const metiersDebloques = getMetiersDebloques(userId, guildId);
  const nbObjetsDistincts = compterObjetsDistincts(userId, guildId);
  const ctx = { compte, metiersDebloques, nbObjetsDistincts };

  const nouveaux = [];
  for (const succes of SUCCES) {
    if (estSuccesDebloque(userId, guildId, succes.id)) continue;
    if (succes.condition(ctx)) {
      debloquerSucces(userId, guildId, succes.id);
      if (succes.recompense) {
        updateCash(userId, guildId, succes.recompense);
      }
      nouveaux.push(succes);
    }
  }
  return nouveaux;
}

module.exports = { verifierDeblocages, estDisponible, verifierSucces };
