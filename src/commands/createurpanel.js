const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { aRoleCreateur, limitesCreateur, nomRoleCreateur } = require('../utils/permissions');
const { getQuotaUtilise } = require('../database');
const { formatMontant } = require('../utils/format');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('createur-panel')
    .setDescription('Panel administratif réservé au rôle Créateur du serveur (limité)'),
  async execute(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: '🚫 Cette commande ne fonctionne que sur un serveur.', ephemeral: true });
      return;
    }
    if (!aRoleCreateur(interaction.member)) {
      await interaction.reply({
        content: `🚫 Ce panel est réservé aux membres avec le rôle **${nomRoleCreateur()}**.`,
        ephemeral: true,
      });
      return;
    }

    const limites = limitesCreateur();
    const utilise = getQuotaUtilise(interaction.user.id, interaction.guildId);
    const restant = Math.max(0, limites.quotidienne - utilise);

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('🏛️ Panel Créateur')
      .setDescription(
        `Limite par action : **${formatMontant(limites.parAction)}**\n` +
        `Quota quotidien restant : **${formatMontant(restant)}** / ${formatMontant(limites.quotidienne)}\n\n` +
        `Ce panel te permet de donner ou retirer du **cash** (pas la banque) à un membre de ce serveur.`
      );

    const boutons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('createur_give').setLabel('Donner de l\'argent').setStyle(ButtonStyle.Success).setEmoji('💸'),
      new ButtonBuilder().setCustomId('createur_take').setLabel('Retirer de l\'argent').setStyle(ButtonStyle.Danger).setEmoji('➖'),
      new ButtonBuilder().setCustomId('createur_view').setLabel('Voir un solde').setStyle(ButtonStyle.Secondary).setEmoji('🔍')
    );

    await interaction.reply({ embeds: [embed], components: [boutons], ephemeral: true });
  },
};
