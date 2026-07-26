const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getSuccesDebloques } = require('../database');
const { SUCCES } = require('../succes');
const { formatMontant } = require('../utils/format');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('succes')
    .setDescription('Affiche la liste des succès et lesquels tu as débloqués'),
  async execute(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: '🚫 Cette commande ne fonctionne que sur un serveur.', ephemeral: true });
      return;
    }
    const debloques = new Set(getSuccesDebloques(interaction.user.id, interaction.guildId));

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle(`🏆 Succès (${debloques.size}/${SUCCES.length})`)
      .setDescription(
        SUCCES.map((s) => {
          const fait = debloques.has(s.id);
          const coche = fait ? '✅' : '🔒';
          return `${coche} ${s.emoji} **${s.nom}** — ${s.description} (+${formatMontant(s.recompense)})`;
        }).join('\n')
      );

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
