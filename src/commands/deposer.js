const { SlashCommandBuilder } = require('discord.js');
const { getCompte, updateCash, updateBanque, logTransaction } = require('../database');
const { formatMontant } = require('../utils/format');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deposer')
    .setDescription('Dépose de l\'argent de ta poche vers la banque')
    .addIntegerOption((opt) =>
      opt.setName('montant').setDescription('Montant à déposer (ou "tout")').setRequired(false).setMinValue(1)
    ),
  async execute(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: '🚫 Cette commande ne fonctionne que sur un serveur.', ephemeral: true });
      return;
    }
    const userId = interaction.user.id;
    const guildId = interaction.guildId;
    const compte = getCompte(userId, guildId);
    const montant = interaction.options.getInteger('montant') ?? compte.cash;

    if (montant <= 0) {
      await interaction.reply({ content: '🚫 Montant invalide.', ephemeral: true });
      return;
    }
    if (compte.cash < montant) {
      await interaction.reply({
        content: `🚫 Tu n'as que ${formatMontant(compte.cash)} en poche.`,
        ephemeral: true,
      });
      return;
    }

    updateCash(userId, guildId, -montant);
    updateBanque(userId, guildId, montant);
    logTransaction(userId, userId, montant, 'depot', guildId);

    await interaction.reply(`🏦 Tu as déposé **${formatMontant(montant)}** à la banque.`);
  },
};
