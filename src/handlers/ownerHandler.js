const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
} = require('discord.js');
const { estProprietaire } = require('../utils/permissions');
const {
  getCompte,
  updateCash,
  updateBanque,
  resetCompte,
  logTransaction,
  addInventaire,
  getItem,
} = require('../database');
const { formatMontant } = require('../utils/format');

const ACTIONS = {
  add_cash: { label: 'Ajouter du cash', style: ButtonStyle.Success, emoji: '💰' },
  remove_cash: { label: 'Retirer du cash', style: ButtonStyle.Danger, emoji: '➖' },
  add_banque: { label: 'Ajouter en banque', style: ButtonStyle.Success, emoji: '🏦' },
  remove_banque: { label: 'Retirer de la banque', style: ButtonStyle.Danger, emoji: '🏦' },
  give_item: { label: 'Donner un objet', style: ButtonStyle.Primary, emoji: '🎁' },
  reset_account: { label: 'Réinitialiser un compte', style: ButtonStyle.Danger, emoji: '🗑️' },
  view_account: { label: 'Voir un compte', style: ButtonStyle.Secondary, emoji: '🔍' },
};

async function menuServeurs(client) {
  const guilds = [...client.guilds.cache.values()].slice(0, 25);
  const menu = new StringSelectMenuBuilder()
    .setCustomId('owner_select_guild')
    .setPlaceholder('Choisis un serveur à administrer')
    .addOptions(guilds.map((g) => ({ label: g.name.slice(0, 100), description: `${g.memberCount} membres`, value: g.id })));
  return [new ActionRowBuilder().addComponents(menu)];
}

async function selectionnerServeur(interaction) {
  if (!estProprietaire(interaction.user.id)) return;

  const guildId = interaction.values[0];
  const guild = await interaction.client.guilds.fetch(guildId);

  const embed = new EmbedBuilder()
    .setColor(0xe74c3c)
    .setTitle(`🛡️ Panel — ${guild.name}`)
    .setDescription('Choisis une action. Toutes les actions demandent l\'ID Discord de la cible.');

  const rangees = [];
  const entries = Object.entries(ACTIONS);
  for (let i = 0; i < entries.length; i += 3) {
    const rangee = new ActionRowBuilder();
    for (const [key, def] of entries.slice(i, i + 3)) {
      rangee.addComponents(
        new ButtonBuilder().setCustomId(`owner_${key}_${guildId}`).setLabel(def.label).setStyle(def.style).setEmoji(def.emoji)
      );
    }
    rangees.push(rangee);
  }
  const retour = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('owner_back').setLabel('Changer de serveur').setStyle(ButtonStyle.Secondary).setEmoji('🔙')
  );
  rangees.push(retour);

  await interaction.update({ embeds: [embed], components: rangees.slice(0, 5) });
}

async function retourMenuServeurs(interaction) {
  if (!estProprietaire(interaction.user.id)) return;
  const embed = new EmbedBuilder()
    .setColor(0xe74c3c)
    .setTitle('🛡️ Panel Propriétaire')
    .setDescription('Choisis un serveur pour accéder aux actions administratives (sans limite).');
  await interaction.update({ embeds: [embed], components: await menuServeurs(interaction.client) });
}

async function ouvrirActionModal(interaction) {
  if (!estProprietaire(interaction.user.id)) return;

  // customId format : owner_<action>_<guildId>
  const raw = interaction.customId.replace('owner_', '');
  const segs = raw.split('_');
  const guildId = segs.pop();
  const action = segs.join('_');

  const modal = new ModalBuilder().setCustomId(`ownermodal_${action}_${guildId}`).setTitle(ACTIONS[action]?.label || 'Action');

  const champCible = new TextInputBuilder()
    .setCustomId('cible')
    .setLabel("ID Discord de l'utilisateur")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const composants = [new ActionRowBuilder().addComponents(champCible)];

  if (['add_cash', 'remove_cash', 'add_banque', 'remove_banque'].includes(action)) {
    composants.push(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('montant').setLabel('Montant').setStyle(TextInputStyle.Short).setRequired(true)
      )
    );
  } else if (action === 'give_item') {
    composants.push(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('item')
          .setLabel("Identifiant de l'article (voir /boutique)")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('quantite').setLabel('Quantité').setStyle(TextInputStyle.Short).setRequired(false)
      )
    );
  } else if (action === 'reset_account') {
    composants.push(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('confirmation')
          .setLabel('Tape CONFIRMER pour réinitialiser')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );
  }

  modal.addComponents(...composants);
  await interaction.showModal(modal);
}

async function traiterActionModal(interaction) {
  if (!estProprietaire(interaction.user.id)) return;

  // customId format : ownermodal_<action>_<guildId>
  const raw = interaction.customId.replace('ownermodal_', '');
  const segs = raw.split('_');
  const guildId = segs.pop();
  const action = segs.join('_');

  const guild = await interaction.client.guilds.fetch(guildId).catch(() => null);
  if (!guild) {
    await interaction.reply({ content: "🚫 Serveur introuvable (le bot n'y est peut-être plus).", ephemeral: true });
    return;
  }

  const cibleId = interaction.fields.getTextInputValue('cible').trim();
  let membre;
  try {
    membre = await guild.members.fetch(cibleId);
  } catch {
    await interaction.reply({ content: '🚫 Utilisateur introuvable sur ce serveur.', ephemeral: true });
    return;
  }

  if (action === 'view_account') {
    const compte = getCompte(cibleId, guildId);
    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle(`💳 ${membre.user.username} — ${guild.name}`)
      .addFields(
        { name: 'En poche', value: formatMontant(compte.cash), inline: true },
        { name: 'À la banque', value: formatMontant(compte.banque), inline: true },
        { name: 'Métier actuel', value: compte.metier_actuel || 'aucun', inline: true },
        { name: 'Services effectués', value: `${compte.nb_travaux}`, inline: true },
        { name: 'Total gagné (cumulé)', value: formatMontant(compte.total_gagne), inline: true }
      );
    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  if (action === 'reset_account') {
    const confirmation = interaction.fields.getTextInputValue('confirmation').trim();
    if (confirmation !== 'CONFIRMER') {
      await interaction.reply({ content: '🚫 Réinitialisation annulée (confirmation incorrecte).', ephemeral: true });
      return;
    }
    resetCompte(cibleId, guildId);
    await interaction.reply({ content: `✅ Compte de ${membre.user.username} réinitialisé sur ${guild.name}.`, ephemeral: true });
    return;
  }

  if (action === 'give_item') {
    const itemId = interaction.fields.getTextInputValue('item').trim();
    const quantiteTexte = interaction.fields.getTextInputValue('quantite')?.trim();
    const quantite = quantiteTexte ? parseInt(quantiteTexte, 10) : 1;
    const item = getItem(itemId);
    if (!item) {
      await interaction.reply({ content: '🚫 Article introuvable.', ephemeral: true });
      return;
    }
    addInventaire(cibleId, guildId, itemId, quantite);
    await interaction.reply({
      content: `✅ ${quantite}x **${item.nom}** donné à ${membre.user.username} sur ${guild.name}.`,
      ephemeral: true,
    });
    return;
  }

  // Actions monétaires : add_cash, remove_cash, add_banque, remove_banque
  const montant = parseInt(interaction.fields.getTextInputValue('montant').trim(), 10);
  if (!Number.isInteger(montant) || montant <= 0) {
    await interaction.reply({ content: '🚫 Montant invalide.', ephemeral: true });
    return;
  }

  const signe = action.startsWith('remove_') ? -1 : 1;
  const delta = montant * signe;

  if (action.endsWith('_cash')) {
    updateCash(cibleId, guildId, delta);
  } else {
    updateBanque(cibleId, guildId, delta);
  }
  logTransaction(signe > 0 ? null : cibleId, signe > 0 ? cibleId : null, montant, 'owner', guildId);

  const compteType = action.endsWith('_cash') ? 'cash' : 'banque';
  const verbe = signe > 0 ? 'ajouté' : 'retiré';
  await interaction.reply({
    content: `✅ ${formatMontant(montant)} (${compteType}) ${verbe} pour ${membre.user.username} sur ${guild.name}.`,
    ephemeral: true,
  });
}

async function envoyerPanelInitial(channel, client) {
  const embed = new EmbedBuilder()
    .setColor(0xe74c3c)
    .setTitle('🛡️ Panel Propriétaire')
    .setDescription('Choisis un serveur pour accéder aux actions administratives (sans limite).');

  await channel.send({ embeds: [embed], components: await menuServeurs(client) });
}

module.exports = { selectionnerServeur, retourMenuServeurs, ouvrirActionModal, traiterActionModal, envoyerPanelInitial };
