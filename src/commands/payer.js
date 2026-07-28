const { SlashCommandBuilder } = require('discord.js');
const { getCompte, updateCash, logTransaction } = require('../database');
const { messageSiEnDette } = require('../utils/dette');
const { formatMontant } = require('../utils/format');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('payer')
    .setDescription('Transfère de l\'argent (cash) à un autre utilisateur')
    .addUserOption((opt) => opt.setName('utilisateur').setDescription('Destinataire').setRequired(true))
    .addIntegerOption((opt) =>
      opt.setName('montant').setDescription('Montant à transférer').setRequired(true).setMinValue(1)
    ),
  async execute(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: '🚫 Cette commande ne fonctionne que sur un serveur.', ephemeral: true });
      return;
    }
    const guildId = interaction.guildId;
    const expediteur = interaction.user;
    const destinataire = interaction.options.getUser('utilisateur');
    const montant = interaction.options.getInteger('montant');

    if (destinataire.id === expediteur.id) {
      await interaction.reply({ content: '🚫 Tu ne peux pas te payer toi-même.', ephemeral: true });
      return;
    }
    if (destinataire.bot) {
      await interaction.reply({ content: '🚫 Tu ne peux pas payer un bot.', ephemeral: true });
      return;
    }

    const compte = getCompte(expediteur.id, guildId);
    const erreurDette = messageSiEnDette(compte);
    if (erreurDette) {
      await interaction.reply({ content: erreurDette, ephemeral: true });
      return;
    }
    if (compte.cash < montant) {
      await interaction.reply({
        content: `🚫 Fonds insuffisants. Tu as ${formatMontant(compte.cash)} en poche.`,
        ephemeral: true,
      });
      return;
    }

    updateCash(expediteur.id, guildId, -montant);
    updateCash(destinataire.id, guildId, montant);
    logTransaction(expediteur.id, destinataire.id, montant, 'transfert', guildId);

    await interaction.reply(
      `💸 ${expediteur.username} a transféré **${formatMontant(montant)}** à ${destinataire.username}.`
    );
  },
};
