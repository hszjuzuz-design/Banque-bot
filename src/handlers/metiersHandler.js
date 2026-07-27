const { EmbedBuilder } = require('discord.js');
const { getMetier, RARETE_COULEUR } = require('../metiers');
const { estDisponible } = require('../utils/progression');
const { getCapacite } = require('../capacites');
const { formatMontant } = require('../utils/format');

async function selectionnerMetier(interaction) {
  const metierId = interaction.values[0];
  const metier = getMetier(metierId);

  if (!metier) {
    await interaction.reply({ content: '🚫 Métier introuvable.', ephemeral: true });
    return;
  }

  const userId = interaction.user.id;
  const guildId = interaction.guildId;
  const disponible = estDisponible(userId, guildId, metier);
  const capacite = getCapacite(metier.id);

  const embed = new EmbedBuilder()
    .setColor(RARETE_COULEUR[metier.rarete])
    .setTitle(`${metier.emoji} ${metier.nom}`)
    .addFields(
      { name: 'Rareté', value: metier.rarete, inline: true },
      { name: 'Gain par service', value: formatMontant(metier.gainBase), inline: true },
      {
        name: 'Statut',
        value: disponible
          ? "🔓 Débloqué — utilise `/choisir-metier` pour l'exercer"
          : `🔒 Verrouillé\n${metier.conditionTexte}`,
      }
    );

  if (capacite) {
    embed.addFields({
      name: `${capacite.emoji} Capacité spéciale : ${capacite.nom}`,
      value: `${capacite.description}\nRecharge : ${capacite.cooldownHeures}h — utilise \`/capacite\` une fois ce métier actif.`,
    });
  }

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

module.exports = { selectionnerMetier };
