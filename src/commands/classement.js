const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getClassement } = require('../database');
const { formatMontant } = require('../utils/format');

const MEDAILLES = ['🥇', '🥈', '🥉'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('classement')
    .setDescription('Affiche les utilisateurs les plus riches'),
  async execute(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: '🚫 Cette commande ne fonctionne que sur un serveur.', ephemeral: true });
      return;
    }
    const top = getClassement(interaction.guildId, 10);

    const embed = new EmbedBuilder().setColor(0xe74c3c).setTitle('🏆 Classement des fortunes');

    if (top.length === 0) {
      embed.setDescription('Aucun compte pour le moment.');
    } else {
      const lignes = await Promise.all(
        top.map(async (entry, i) => {
          const rang = MEDAILLES[i] || `${i + 1}.`;
          let nom;
          try {
            const user = await interaction.client.users.fetch(entry.user_id);
            nom = user.username;
          } catch {
            nom = 'Utilisateur inconnu';
          }
          return `${rang} **${nom}** — ${formatMontant(entry.total)}`;
        })
      );
      embed.setDescription(lignes.join('\n'));
    }

    await interaction.reply({ embeds: [embed] });
  },
};
