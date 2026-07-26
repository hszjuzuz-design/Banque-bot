const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getItem, getCompte, updateCash, addInventaire, logTransaction } = require('../database');
const { verifierSucces } = require('../utils/progression');
const { formatMontant } = require('../utils/format');

async function selectionnerArticle(interaction) {
  const itemId = interaction.values[0];
  const item = getItem(itemId);

  if (!item) {
    await interaction.reply({ content: '🚫 Article introuvable.', ephemeral: true });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0xf39c12)
    .setTitle(`🛒 ${item.nom}`)
    .setDescription(item.description || 'Aucune description')
    .addFields({ name: 'Prix', value: formatMontant(item.prix), inline: true });

  if (item.defense > 0) {
    embed.addFields({ name: 'Défense', value: `+${item.defense}`, inline: true });
  }

  const bouton = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`boutique_acheter_${itemId}`)
      .setLabel('Acheter (x1)')
      .setStyle(ButtonStyle.Success)
      .setEmoji('🛍️')
  );

  await interaction.reply({ embeds: [embed], components: [bouton], ephemeral: true });
}

async function acheterViaBoutique(interaction) {
  if (!interaction.guildId) {
    await interaction.reply({ content: '🚫 Cette action ne fonctionne que sur un serveur.', ephemeral: true });
    return;
  }
  const itemId = interaction.customId.replace('boutique_acheter_', '');
  const item = getItem(itemId);

  if (!item) {
    await interaction.reply({ content: '🚫 Article introuvable.', ephemeral: true });
    return;
  }

  const userId = interaction.user.id;
  const guildId = interaction.guildId;
  const compte = getCompte(userId, guildId);

  if (compte.cash < item.prix) {
    await interaction.reply({
      content: `🚫 Fonds insuffisants. ${item.nom} coûte ${formatMontant(item.prix)}, tu as ${formatMontant(compte.cash)}.`,
      ephemeral: true,
    });
    return;
  }

  updateCash(userId, guildId, -item.prix);
  addInventaire(userId, guildId, itemId, 1);
  logTransaction(userId, null, item.prix, 'achat', guildId);

  await interaction.reply({
    content: `✅ Tu as acheté **${item.nom}** pour **${formatMontant(item.prix)}**.`,
    ephemeral: true,
  });

  const nouveauxSucces = verifierSucces(userId, guildId);
  if (nouveauxSucces.length > 0) {
    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('🏆 Succès débloqué(s) !')
      .setDescription(
        nouveauxSucces.map((s) => `${s.emoji} **${s.nom}** — ${s.description} (+${formatMontant(s.recompense)})`).join('\n')
      );
    await interaction.followUp({ embeds: [embed], ephemeral: true });
  }
}

module.exports = { selectionnerArticle, acheterViaBoutique };
