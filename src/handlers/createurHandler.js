const {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
} = require('discord.js');
const { aRoleCreateur, limitesCreateur, nomRoleCreateur } = require('../utils/permissions');
const { getCompte, updateCash, logTransaction, getQuotaUtilise, ajouterQuotaUtilise } = require('../database');
const { formatMontant } = require('../utils/format');

async function ouvrirModal(interaction) {
  const action = interaction.customId; // createur_give | createur_take | createur_view

  if (!aRoleCreateur(interaction.member)) {
    await interaction.reply({ content: '🚫 Accès refusé.', ephemeral: true });
    return;
  }

  const modal = new ModalBuilder().setCustomId(`${action}_modal`);
  const champCible = new TextInputBuilder()
    .setCustomId('cible')
    .setLabel("ID Discord de l'utilisateur")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Ex: 123456789012345678')
    .setRequired(true);

  const rows = [new ActionRowBuilder().addComponents(champCible)];

  if (action !== 'createur_view') {
    const champMontant = new TextInputBuilder()
      .setCustomId('montant')
      .setLabel('Montant')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: 1000')
      .setRequired(true);
    rows.push(new ActionRowBuilder().addComponents(champMontant));
    modal.setTitle(action === 'createur_give' ? "Donner de l'argent" : "Retirer de l'argent");
  } else {
    modal.setTitle('Voir un solde');
  }

  modal.addComponents(...rows);
  await interaction.showModal(modal);
}

async function traiterModal(interaction) {
  if (!aRoleCreateur(interaction.member)) {
    await interaction.reply({ content: '🚫 Accès refusé.', ephemeral: true });
    return;
  }

  const guildId = interaction.guildId;
  const createurId = interaction.user.id;
  const cibleId = interaction.fields.getTextInputValue('cible').trim();
  const action = interaction.customId.replace('_modal', '');

  let membreCible;
  try {
    membreCible = await interaction.guild.members.fetch(cibleId);
  } catch {
    await interaction.reply({ content: "🚫 Utilisateur introuvable sur ce serveur. Vérifie l'ID.", ephemeral: true });
    return;
  }

  if (action === 'createur_view') {
    const compte = getCompte(cibleId, guildId);
    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle(`💳 Compte de ${membreCible.user.username}`)
      .addFields(
        { name: 'En poche', value: formatMontant(compte.cash), inline: true },
        { name: 'À la banque', value: formatMontant(compte.banque), inline: true },
        { name: 'Total', value: formatMontant(compte.cash + compte.banque), inline: true }
      );
    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  const montantTexte = interaction.fields.getTextInputValue('montant').trim();
  const montant = parseInt(montantTexte, 10);

  if (!Number.isInteger(montant) || montant <= 0) {
    await interaction.reply({ content: '🚫 Montant invalide.', ephemeral: true });
    return;
  }

  if (cibleId === createurId) {
    await interaction.reply({ content: '🚫 Tu ne peux pas agir sur ton propre compte via ce panel.', ephemeral: true });
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

  if (action === 'createur_take') {
    const compteCible = getCompte(cibleId, guildId);
    if (compteCible.cash < montant) {
      await interaction.reply({
        content: `🚫 ${membreCible.user.username} n'a que ${formatMontant(compteCible.cash)} en poche.`,
        ephemeral: true,
      });
      return;
    }
  }

  const delta = action === 'createur_give' ? montant : -montant;
  updateCash(cibleId, guildId, delta);
  ajouterQuotaUtilise(createurId, guildId, montant);
  logTransaction(
    action === 'createur_give' ? null : cibleId,
    action === 'createur_give' ? cibleId : null,
    montant,
    'createur',
    guildId
  );

  const verbe = action === 'createur_give' ? 'donné' : 'retiré';
  await interaction.reply({
    content: `✅ Tu as ${verbe} **${formatMontant(montant)}** ${action === 'createur_give' ? 'à' : 'de'} ${membreCible.user.username}.`,
    ephemeral: true,
  });
}

module.exports = { ouvrirModal, traiterModal };
