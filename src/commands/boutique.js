const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getBoutique } = require('../database');
const { formatMontant } = require('../utils/format');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('boutique')
    .setDescription('Affiche les articles disponibles à l\'achat'),
  async execute(interaction) {
    const items = getBoutique();

    const embed = new EmbedBuilder()
      .setColor(0xf39c12)
      .setTitle('🛒 Boutique')
      .setDescription('Utilise `/acheter` avec l\'identifiant de l\'article pour l\'acheter.');

    for (const item of items) {
      embed.addFields({
        name: `${item.nom} — ${formatMontant(item.prix)}`,
        value: `\`${item.item_id}\` — ${item.description || 'Aucune description'}`,
      });
    }

    await interaction.reply({ embeds: [embed] });
  },
};
