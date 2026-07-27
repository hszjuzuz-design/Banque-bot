const { SlashCommandBuilder } = require('discord.js');
const { construireVueRarete } = require('../handlers/metiersHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('metiers')
    .setDescription('Parcours les métiers par rareté, en commençant par les plus courants'),
  async execute(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: '🚫 Cette commande ne fonctionne que sur un serveur.', ephemeral: true });
      return;
    }
    const vue = construireVueRarete(interaction.user.id, interaction.guildId, 0);
    await interaction.reply({ ...vue, ephemeral: true });
  },
};
