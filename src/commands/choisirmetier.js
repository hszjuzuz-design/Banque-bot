const { SlashCommandBuilder } = require('discord.js');
const { setMetierActuel } = require('../database');
const { METIERS, getMetier } = require('../metiers');
const { estDisponible } = require('../utils/progression');
const { formatMontant } = require('../utils/format');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('choisir-metier')
    .setDescription('Change ton métier actif parmi ceux que tu as débloqués')
    .addStringOption((opt) =>
      opt
        .setName('metier')
        .setDescription('Le métier à exercer')
        .setRequired(true)
        .addChoices(...METIERS.map((m) => ({ name: `${m.nom} (${m.rarete})`, value: m.id })))
    ),
  async execute(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: '🚫 Cette commande ne fonctionne que sur un serveur.', ephemeral: true });
      return;
    }
    const userId = interaction.user.id;
    const guildId = interaction.guildId;
    const metierId = interaction.options.getString('metier');
    const metier = getMetier(metierId);

    if (!metier) {
      await interaction.reply({ content: '🚫 Métier introuvable.', ephemeral: true });
      return;
    }

    if (!estDisponible(userId, guildId, metier)) {
      await interaction.reply({
        content: `🔒 Tu n'as pas encore débloqué **${metier.nom}**.\n*Condition : ${metier.conditionTexte}*`,
        ephemeral: true,
      });
      return;
    }

    setMetierActuel(userId, guildId, metierId);

    await interaction.reply(
      `${metier.emoji} Tu exerces maintenant le métier de **${metier.nom}** (~${formatMontant(metier.gainBase)}/service via \`/travailler\`).`
    );
  },
};
