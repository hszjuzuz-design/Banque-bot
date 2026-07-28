const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { getBoutique } = require('../database');
const { formatMontant } = require('../utils/format');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('supermarche')
    .setDescription("Équipement et formations pour te préparer à l'illégalité (masques, PC, formations de piratage)"),
  async execute(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: '🚫 Cette commande ne fonctionne que sur un serveur.', ephemeral: true });
      return;
    }
    const equipement = getBoutique('supermarche');
    const formations = getBoutique('formation');
    const items = [...equipement, ...formations];

    const embed = new EmbedBuilder()
      .setColor(0x1abc9c)
      .setTitle('🏪 Supermarché')
      .setDescription("Choisis un article dans le menu ci-dessous pour voir le détail et l'acheter.");

    if (equipement.length > 0) {
      embed.addFields({
        name: '🛠️ Équipement',
        value: equipement.map((it) => `**${it.nom}** — ${formatMontant(it.prix)}\n${it.description}`).join('\n\n'),
      });
    }
    if (formations.length > 0) {
      embed.addFields({
        name: '🎓 Formations de piratage',
        value: formations.map((it) => `**${it.nom}** — ${formatMontant(it.prix)}\n${it.description}`).join('\n\n'),
      });
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId('boutique_select')
      .setPlaceholder('Sélectionne un article...')
      .addOptions(
        items.slice(0, 25).map((item) => ({
          label: item.nom.slice(0, 100),
          description: formatMontant(item.prix).slice(0, 100),
          value: item.item_id,
        }))
      );

    await interaction.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)] });
  },
};
