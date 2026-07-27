const { SlashCommandBuilder } = require('discord.js');
const { construireVueMetier } = require('../handlers/metiersHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('metiers')
    .setDescription('Parcours les 23 métiers un par un, avec leurs conditions et capacités'),
  async execute(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: '🚫 Cette commande ne fonctionne que sur un serveur.', ephemeral: true });
      return;
    }
    const vue = construireVueMetier(interaction.user.id, interaction.guildId, 0);
    await interaction.reply({ ...vue, ephemeral: true });
  },
};
