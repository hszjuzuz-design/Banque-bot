const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const { aRoleCreateur, limitesCreateur, nomRoleCreateur } = require('../utils/permissions');
const {
  getCompte,
  updateCash,
  logTransaction,
  getQuotaUtilise,
  ajouterQuotaUtilise,
  getTresor,
  retirerTresor,
} = require('../database');
const { formatMontant } = require('../utils/format');

async function ouvrirModal(interaction) {
  if (!aRoleCreateur(interaction.member)) {
    await interaction.reply({ content: '🚫 Accès refusé.', ephemeral: true });
    return;
  }
  const id = interaction.customId;
  const modal = new ModalBuilder().setCustomId(id + '_modal').setTitle(
    id === 'createur_give'
      ? 'Donner de l\'argent'
      : id === 'createur_take'
      ? 'Retirer de l\'argent'
      : 'Voir un solde'
  );
  const champ1 = new TextInputBuilder()
    .setCustomId('user_id')
    .setLabel('ID Discord du joueur')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Ex: 123456789')
    .setRequired(true);
  modal.addComponents(new ActionRowBuilder().addComponents(champ1));
  if (id !== 'createur_view') {
    const champ2 = new TextInputBuilder()
      .setCustomId('montant')
      .setLabel('Montant')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: 500')
      .setRequired(true);
    modal.addComponents(new ActionRowBuilder().addComponents(champ2));
  }
  await interaction.showModal(modal);
}

async function traiterModal(interaction) {
  if (!aRoleCreateur(interaction.member)) {
    await interaction.reply({ content: '🚫 Accès refusé.', ephemeral: true });
    return;
  }
  const guildId = interaction.guildId;
  const createurId = interaction.user.id;
  const userId = interaction.fields.getTextInputValue('user_id');
  const montantStr = interaction.fields.getTextInputValue('montant').trim();
  const montant = montantStr ? parseInt(montantStr, 10) : 0;
  const id = interaction.customId.replace('_modal', '');

  if (id === 'createur_view') {
    const compte = getCompte(userId, guildId);
    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle(`💰 Compte de <@${userId}>`)
      .addFields(
        { name: 'En poche', value: formatMontant(compte.cash), inline: true },
        { name: 'À la banque', value: formatMontant(compte.banque), inline: true },
        { name: 'Total', value: formatMontant(compte.cash + compte.banque), inline: true }
      );
    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  if (!Number.isInteger(montant) || montant <= 0) {
    await interaction.reply({ content: '🚫 Montant invalide.', ephemeral: true });
    return;
  }

  const limites = limitesCreateur();
  if (montant > limites.parAction) {
    await interaction.reply({
      content: `🚫 Ce montant dépasse la limite par action (${formatMontant(limites.parAction)}).`,
      ephemeral: true,
    });
    return;
  }

  const dejaUtilise = getQuotaUtilise(createurId, guildId);
  if (dejaUtilise + montant > limites.quotidienne) {
    const restant = Math.max(0, limites.quotidienne - dejaUtilise);
    await interaction.reply({
      content: `🚫 Quota quotidien dépassé. Il te reste **${formatMontant(restant)}** aujourd'hui.`,
      ephemeral: true,
    });
    return;
  }

  if (id === 'createur_give') {
    updateCash(userId, guildId, montant);
    logTransaction(null, userId, montant, 'gift_createur', guildId);
  } else {
    const compte = getCompte(userId, guildId);
    if (compte.cash < montant) {
      await interaction.reply({
        content: `🚫 Le joueur n'a que ${formatMontant(compte.cash)} en poche.`,
        ephemeral: true,
      });
      return;
    }
    updateCash(userId, guildId, -montant);
    logTransaction(userId, null, montant, 'retrait_createur', guildId);
  }

  ajouterQuotaUtilise(createurId, guildId, montant);
  const action = id === 'createur_give' ? 'donné' : 'retiré';
  await interaction.reply({
    content: `✅ Tu as ${action} **${formatMontant(montant)}** à <@${userId}>.`,
    ephemeral: true,
  });
}

async function afficherTresor(interaction) {
  if (!aRoleCreateur(interaction.member)) {
    await interaction.reply({ content: '🚫 Accès refusé.', ephemeral: true });
    return;
  }
  const tresor = getTresor(interaction.guildId);

  const embed = new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle('🏛️ Trésor du serveur')
    .setDescription(
      `Solde actuel : **${formatMontant(tresor)}**\n\n` +
      "Alimenté par les taxes, les amendes de vol et les remboursements de crédit."
    );

  const bouton = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('createur_tresor_retirer')
      .setLabel('Retirer du Trésor')
      .setStyle(ButtonStyle.Success)
      .setEmoji('💰')
      .setDisabled(tresor <= 0)
  );

  await interaction.reply({ embeds: [embed], components: [bouton], ephemeral: true });
}

async function ouvrirModalTresor(interaction) {
  if (!aRoleCreateur(interaction.member)) {
    await interaction.reply({ content: '🚫 Accès refusé.', ephemeral: true });
    return;
  }
  const modal = new ModalBuilder().setCustomId('createur_tresor_retirer_modal').setTitle('Retirer du Trésor');
  const champ = new TextInputBuilder()
    .setCustomId('montant')
    .setLabel('Montant à retirer')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Ex: 500')
    .setRequired(true);
  modal.addComponents(new ActionRowBuilder().addComponents(champ));
  await interaction.showModal(modal);
}

async function traiterModalTresor(interaction) {
  if (!aRoleCreateur(interaction.member)) {
    await interaction.reply({ content: '🚫 Accès refusé.', ephemeral: true });
    return;
  }

  const guildId = interaction.guildId;
  const createurId = interaction.user.id;
  const montant = parseInt(interaction.fields.getTextInputValue('montant').trim(), 10);

  if (!Number.isInteger(montant) || montant <= 0) {
    await interaction.reply({ content: '🚫 Montant invalide.', ephemeral: true });
    return;
  }

  const limites = limitesCreateur();
  if (montant > limites.parAction) {
    await interaction.reply({
      content: `🚫 Ce montant dépasse la limite par action (${formatMontant(limites.parAction)}).`,
      ephemeral: true,
    });
    return;
  }

  const dejaUtilise = getQuotaUtilise(createurId, guildId);
  if (dejaUtilise + montant > limites.quotidienne) {
    const restant = Math.max(0, limites.quotidienne - dejaUtilise);
    await interaction.reply({
      content: `🚫 Quota quotidien dépassé. Il te reste **${formatMontant(restant)}** aujourd'hui.`,
      ephemeral: true,
    });
    return;
  }

  const tresor = getTresor(guildId);
  if (montant > tresor) {
    await interaction.reply({
      content: `🚫 Le Trésor ne contient que **${formatMontant(tresor)}**.`,
      ephemeral: true,
    });
    return;
  }

  retirerTresor(guildId, montant);
  updateCash(createurId, guildId, montant);
  ajouterQuotaUtilise(createurId, guildId, montant);
  logTransaction(null, createurId, montant, 'retrait_tresor', guildId);

  await interaction.reply({
    content: `✅ Tu as retiré **${formatMontant(montant)}** du Trésor du serveur.`,
    ephemeral: true,
  });
}

module.exports = { ouvrirModal, traiterModal, afficherTresor, ouvrirModalTresor, traiterModalTresor };
