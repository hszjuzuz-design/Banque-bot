const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getCompte } = require('../database');
const { formatMontant } = require('../utils/format');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('solde')
    .setDescription('Affiche ton solde ou celui de quelqu\'un d\'autre')
    .addUserOption((opt) =>
      opt.setName('utilisateur').setDescription('Utilisateur à consulter').setRequired(false)
    ),
  async execute(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: '🚫 Cette commande ne fonctionne que sur un serveur.', ephemeral: true });
      return;
    }
    const cible = interaction.options.getUser('utilisateur') || interaction.user;
    const compte = getCompte(cible.id, interaction.guildId);
    const total = compte.cash + compte.banque;

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle(`💳 Compte de ${cible.username}`)
      .addFields(
        { name: 'En poche', value: formatMontant(compte.cash), inline: true },
        { name: 'À la banque', value: formatMontant(compte.banque), inline: true },
        { name: 'Total', value: formatMontant(total), inline: true }
      )
      .setThumbnail(cible.displayAvatarURL());

    await interaction.reply({ embeds: [embed] });
  },
};
