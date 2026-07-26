const { nomRoleCreateur } = require('../utils/permissions');
const { estCreateurReconnu, ajouterCreateurReconnu } = require('../database');

/**
 * Appelée à chaque mise à jour des rôles d'un membre. Si le rôle Créateur vient
 * d'être ajouté (peu importe comment — manuellement ou via le flux automatique),
 * envoie un MP de félicitations et enregistre la personne comme créateur reconnu.
 */
async function surveillerAjoutRoleCreateur(oldMember, newMember) {
  const nomRole = nomRoleCreateur();
  const avaitLeRoleAvant = oldMember.roles.cache.some((r) => r.name === nomRole);
  const aLeRoleMaintenant = newMember.roles.cache.some((r) => r.name === nomRole);

  if (avaitLeRoleAvant || !aLeRoleMaintenant) return; // rien de nouveau

  // Si déjà enregistré (ex: attribué via le flux automatique guildCreate qui a
  // déjà envoyé son propre MP juste avant), on évite d'envoyer un deuxième MP.
  if (estCreateurReconnu(newMember.guild.id, newMember.id)) return;

  ajouterCreateurReconnu(newMember.guild.id, newMember.id);

  try {
    await newMember.send(
      `🎉 **Félicitations !** Tu as été désigné(e) gérant(e) de l'économie de **${newMember.guild.name}**.\n` +
      `Tu as maintenant accès au panel \`/createur-panel\` avec des droits d'administration limités sur ce serveur.`
    );
  } catch {
    // MP fermés, tant pis, le rôle reste attribué normalement.
  }
}

module.exports = { surveillerAjoutRoleCreateur };
