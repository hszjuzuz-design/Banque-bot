const { getCompte, estDebloque, debloquerMetier, updateCash, getClassement } = require('../database');
const { METIERS } = require('../metiers');

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

module.exports = { verifierDeblocages, estDisponible };
