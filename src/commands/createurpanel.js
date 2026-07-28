const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { aRoleCreateur, limitesCreateur, nomRoleCreateur } = require('../utils/permissions');
const { getQuotaUtilise, getTresor, getCreditsEnAttente } = require('../database');
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
    const tresor = getTresor(interaction.guildId);
    const demandesEnAttente = getCreditsEnAttente(interaction.guildId).length;

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('🏛️ Panel Créateur')
      .setDescription(
        `Limite par action : **${formatMontant(limites.parAction)}**\n` +
        `Quota quotidien restant : **${formatMontant(restant)}** / ${formatMontant(limites.quotidienne)}\n` +
        `Trésor du serveur : **${formatMontant(tresor)}**\n` +
        `Demandes de crédit en attente : **${demandesEnAttente}**`
      );

    const boutons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('createur_give').setLabel('Donner').setStyle(ButtonStyle.Success).setEmoji('💸'),
      new ButtonBuilder().setCustomId('createur_take').setLabel('Retirer').setStyle(ButtonStyle.Danger).setEmoji('➖'),
      new ButtonBuilder().setCustomId('createur_view').setLabel('Voir un solde').setStyle(ButtonStyle.Secondary).setEmoji('🔍'),
      new ButtonBuilder().setCustomId('createur_tresor').setLabel('Trésor').setStyle(ButtonStyle.Primary).setEmoji('🏛️'),
      new ButtonBuilder().setCustomId('createur_credits').setLabel('Demandes de crédit').setStyle(ButtonStyle.Primary).setEmoji('📋')
    );

    await interaction.reply({ embeds: [embed], components: [boutons], ephemeral: true });
  },
};
