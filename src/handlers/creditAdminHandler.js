const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { aRoleCreateur } = require('../utils/permissions');
const { getCreditsEnAttente, getCreditParId, accepterCredit, refuserCredit } = require('../database');
const { formatMontant } = require('../utils/format');

async function afficherDemandesCredit(interaction) {
  if (!aRoleCreateur(interaction.member)) {
    await interaction.reply({ content: '🚫 Accès refusé.', ephemeral: true });
    return;
  }
  const demandes = getCreditsEnAttente(interaction.guildId);

  if (demandes.length === 0) {
    await interaction.reply({ content: 'Aucune demande de crédit en attente.', ephemeral: true });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle('📋 Demandes de crédit en attente')
    .setDescription(
      demandes
        .map((c) => `**#${c.id}** — <@${c.demandeur_id}> demande ${formatMontant(c.montant_initial)}${c.raison ? ` (${c.raison})` : ''}`)
        .join('\n')
    );

  const menu = new StringSelectMenuBuilder()
    .setCustomId('createur_credit_select')
    .setPlaceholder('Choisis une demande à traiter...')
    .addOptions(
      demandes.slice(0, 25).map((c) => ({
        label: `Demande #${c.id} — ${formatMontant(c.montant_initial)}`,
        description: `Demandeur : ${c.demandeur_id}`.slice(0, 100),
        value: String(c.id),
      }))
    );

  await interaction.reply({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(menu)],
    ephemeral: true,
  });
}

async function selectionnerDemandeCredit(interaction) {
  if (!aRoleCreateur(interaction.member)) {
    await interaction.reply({ content: '🚫 Accès refusé.', ephemeral: true });
    return;
  }
  const id = parseInt(interaction.values[0], 10);
  const credit = getCreditParId(id);

  if (!credit || credit.statut !== 'en_attente') {
    await interaction.reply({ content: '🚫 Cette demande a déjà été traitée.', ephemeral: true });
    return;
  }

  const membre = await interaction.guild.members.fetch(credit.demandeur_id).catch(() => null);

  const embed = new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle(`📋 Demande de crédit #${credit.id}`)
    .addFields(
      { name: 'Demandeur', value: membre ? membre.user.username : credit.demandeur_id, inline: true },
      { name: 'Montant', value: formatMontant(credit.montant_initial), inline: true },
      { name: 'Raison', value: credit.raison || 'Non précisée' }
    );

  const boutons = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`createur_credit_accepter_${credit.id}`).setLabel('Accepter').setStyle(ButtonStyle.Success).setEmoji('✅'),
    new ButtonBuilder().setCustomId(`createur_credit_refuser_${credit.id}`).setLabel('Refuser').setStyle(ButtonStyle.Danger).setEmoji('❌')
  );

  await interaction.reply({ embeds: [embed], components: [boutons], ephemeral: true });
}

async function traiterDecisionCredit(interaction) {
  if (!aRoleCreateur(interaction.member)) {
    await interaction.reply({ content: '🚫 Accès refusé.', ephemeral: true });
    return;
  }

  const accepte = interaction.customId.startsWith('createur_credit_accepter_');
  const id = parseInt(
    interaction.customId.replace('createur_credit_accepter_', '').replace('createur_credit_refuser_', ''),
    10
  );
  const credit = getCreditParId(id);

  if (!credit || credit.statut !== 'en_attente') {
    await interaction.reply({ content: '🚫 Cette demande a déjà été traitée.', ephemeral: true });
    return;
  }

  const joursParDefaut = credit.jours_demandes;

  const utilisateur = await interaction.client.users.fetch(credit.demandeur_id).catch(() => null);

  if (accepte) {
    accepterCredit(id, joursParDefaut);
    await interaction.reply({
      content: `✅ Prêt de **${formatMontant(credit.montant_initial)}** accordé à <@${credit.demandeur_id}>.`,
      ephemeral: true,
    });
    if (utilisateur) {
      await utilisateur
        .send(
          `✅ Ton prêt de **${formatMontant(credit.montant_initial)}** a été approuvé par le Créateur de **${interaction.guild.name}** ! ` +
          `L'argent a été ajouté à ta poche. N'oublie pas de rembourser via \`/credit rembourser\`.`
        )
        .catch(() => {});
    }
  } else {
    refuserCredit(id);
    await interaction.reply({
      content: `❌ Demande de prêt de <@${credit.demandeur_id}> refusée.`,
      ephemeral: true,
    });
    if (utilisateur) {
      await utilisateur
        .send(`❌ Ta demande de prêt de **${formatMontant(credit.montant_initial)}** sur **${interaction.guild.name}** a été refusée.`)
        .catch(() => {});
    }
  }
}

module.exports = { afficherDemandesCredit, selectionnerDemandeCredit, traiterDecisionCredit };
