const { getQuetesDuJour, updateCash, marquerQueteReclamee } = require('../database');
const { getQuete } = require('../quetes');
const { formatMontant } = require('../utils/format');

async function reclamerQuete(interaction) {
  const queteId = interaction.customId.replace('quete_reclamer_', '');
  const quete = getQuete(queteId);
  if (!quete) {
    await interaction.reply({ content: '🚫 Quête introuvable.', ephemeral: true });
    return;
  }

  const userId = interaction.user.id;
  const guildId = interaction.guildId;
  const progression = getQuetesDuJour(userId, guildId);
  const p = progression.find((q) => q.quete_id === queteId);

  if (!p || p.progression < quete.objectif) {
    await interaction.reply({ content: "🚫 Cette quête n'est pas encore terminée.", ephemeral: true });
    return;
  }
  if (p.reclamee) {
    await interaction.reply({ content: '🚫 Tu as déjà réclamé cette récompense aujourd\'hui.', ephemeral: true });
    return;
  }

  updateCash(userId, guildId, quete.recompense);
  marquerQueteReclamee(userId, guildId, queteId);

  await interaction.reply({
    content: `🎉 Récompense réclamée : **${formatMontant(quete.recompense)}** pour "${quete.nom}" !`,
    ephemeral: true,
  });
}

module.exports = { reclamerQuete };
