const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getInventaire } = require('../database');
const { formatMontant } = require('../utils/format');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('inventaire')
    .setDescription('Affiche ton inventaire'),
  async execute(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: '🚫 Cette commande ne fonctionne que sur un serveur.', ephemeral: true });
      return;
    }
    const items = getInventaire(interaction.user.id, interaction.guildId);

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle(`🎒 Inventaire de ${interaction.user.username}`);

    if (items.length === 0) {
      embed.setDescription('Ton inventaire est vide. Va faire un tour à la `/boutique` !');
    } else {
      for (const item of items) {
        embed.addFields({
          name: item.nom,
          value: `Quantité : ${item.quantite} — Valeur unitaire : ${formatMontant(item.prix)}`,
        });
      }
    }

    await interaction.reply({ embeds: [embed] });
  },
};
