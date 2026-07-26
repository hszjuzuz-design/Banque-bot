const { SlashCommandBuilder } = require('discord.js');
const { getCompte, updateCash, setLastDaily, logTransaction } = require('../database');
const { formatMontant, formatDuree } = require('../utils/format');

const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 heures
const RECOMPENSE = 500;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Récupère ta récompense quotidienne'),
  async execute(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: '🚫 Cette commande ne fonctionne que sur un serveur.', ephemeral: true });
      return;
    }
    const userId = interaction.user.id;
    const guildId = interaction.guildId;
    const compte = getCompte(userId, guildId);
    const maintenant = Date.now();
    const tempsRestant = compte.last_daily + COOLDOWN_MS - maintenant;

    if (tempsRestant > 0) {
      await interaction.reply({
        content: `⏳ Tu as déjà récupéré ta récompense. Reviens dans **${formatDuree(tempsRestant)}**.`,
        ephemeral: true,
      });
      return;
    }

    updateCash(userId, guildId, RECOMPENSE);
    setLastDaily(userId, guildId, maintenant);
    logTransaction(null, userId, RECOMPENSE, 'daily', guildId);

    await interaction.reply(`🎁 Récompense quotidienne récupérée : **${formatMontant(RECOMPENSE)}** !`);
  },
};
