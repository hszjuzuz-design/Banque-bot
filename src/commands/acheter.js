const { SlashCommandBuilder } = require('discord.js');
const { getCompte, getItem, updateCash, addInventaire, logTransaction } = require('../database');
const { formatMontant } = require('../utils/format');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('acheter')
    .setDescription('Achète un article de la boutique')
    .addStringOption((opt) => opt.setName('article').setDescription('Identifiant de l\'article (voir /boutique)').setRequired(true))
    .addIntegerOption((opt) => opt.setName('quantite').setDescription('Quantité').setRequired(false).setMinValue(1)),
  async execute(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: '🚫 Cette commande ne fonctionne que sur un serveur.', ephemeral: true });
      return;
    }
    const userId = interaction.user.id;
    const guildId = interaction.guildId;
    const itemId = interaction.options.getString('article');
    const quantite = interaction.options.getInteger('quantite') ?? 1;

    const item = getItem(itemId);
    if (!item) {
      await interaction.reply({ content: '🚫 Article introuvable. Vérifie l\'identifiant avec `/boutique`.', ephemeral: true });
      return;
    }

    const coutTotal = item.prix * quantite;
    const compte = getCompte(userId, guildId);

    if (compte.cash < coutTotal) {
      await interaction.reply({
        content: `🚫 Fonds insuffisants. ${quantite}x ${item.nom} coûte ${formatMontant(coutTotal)}, tu as ${formatMontant(compte.cash)}.`,
        ephemeral: true,
      });
      return;
    }

    updateCash(userId, guildId, -coutTotal);
    addInventaire(userId, guildId, itemId, quantite);
    logTransaction(userId, null, coutTotal, 'achat', guildId);

    await interaction.reply(`✅ Tu as acheté **${quantite}x ${item.nom}** pour **${formatMontant(coutTotal)}**.`);
  },
};

