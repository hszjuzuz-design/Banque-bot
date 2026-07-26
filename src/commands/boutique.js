const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { getBoutique } = require('../database');
const { formatMontant } = require('../utils/format');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('boutique')
    .setDescription('Affiche les articles disponibles à l\'achat'),
  async execute(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: '🚫 Cette commande ne fonctionne que sur un serveur.', ephemeral: true });
      return;
    }
    const items = getBoutique();

    const embed = new EmbedBuilder()
      .setColor(0xf39c12)
      .setTitle('🛒 Boutique')
      .setDescription('Choisis un article dans le menu ci-dessous pour voir le détail et l\'acheter directement.');

    for (const item of items) {
      const defenseTexte = item.defense > 0 ? ` • 🛡️ Défense +${item.defense}` : '';
      embed.addFields({
        name: `${item.nom} — ${formatMontant(item.prix)}${defenseTexte}`,
        value: item.description || 'Aucune description',
      });
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId('boutique_select')
      .setPlaceholder('Sélectionne un article...')
      .addOptions(
        items.slice(0, 25).map((item) => ({
          label: item.nom.slice(0, 100),
          description: `${formatMontant(item.prix)}${item.defense > 0 ? ` • Défense +${item.defense}` : ''}`.slice(0, 100),
          value: item.item_id,
        }))
      );

    await interaction.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)] });
  },
};
