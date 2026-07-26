const { SlashCommandBuilder } = require('discord.js');
const { getCompte, updateCash, updateBanque, logTransaction } = require('../database');
const { formatMontant } = require('../utils/format');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('retirer')
    .setDescription('Retire de l\'argent de la banque vers ta poche')
    .addIntegerOption((opt) =>
      opt.setName('montant').setDescription('Montant à retirer (ou "tout")').setRequired(false).setMinValue(1)
    ),
  async execute(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: '🚫 Cette commande ne fonctionne que sur un serveur.', ephemeral: true });
      return;
    }
    const userId = interaction.user.id;
    const guildId = interaction.guildId;
    const compte = getCompte(userId, guildId);
    const montant = interaction.options.getInteger('montant') ?? compte.banque;

    if (montant <= 0) {
      await interaction.reply({ content: '🚫 Montant invalide.', ephemeral: true });
      return;
    }
    if (compte.banque < montant) {
      await interaction.reply({
        content: `🚫 Tu n'as que ${formatMontant(compte.banque)} à la banque.`,
        ephemeral: true,
      });
      return;
    }

    updateBanque(userId, guildId, -montant);
    updateCash(userId, guildId, montant);
    logTransaction(userId, userId, montant, 'retrait', guildId);

    await interaction.reply(`💵 Tu as retiré **${formatMontant(montant)}** de la banque.`);
  },
};
