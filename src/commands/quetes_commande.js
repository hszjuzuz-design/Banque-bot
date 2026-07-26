const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getQuetesDuJour } = require('../database');
const { QUETES } = require('../quetes');
const { formatMontant } = require('../utils/format');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quetes')
    .setDescription('Affiche tes quêtes journalières et leur progression'),
  async execute(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: '🚫 Cette commande ne fonctionne que sur un serveur.', ephemeral: true });
      return;
    }
    const progression = getQuetesDuJour(interaction.user.id, interaction.guildId);

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('📋 Quêtes du jour')
      .setDescription('Se réinitialisent chaque jour à minuit UTC.');

    const boutons = new ActionRowBuilder();
    let auMoinsUnBouton = false;

    for (const quete of QUETES) {
      const p = progression.find((q) => q.quete_id === quete.id);
      const actuel = p ? p.progression : 0;
      const termine = actuel >= quete.objectif;
      const reclamee = p ? !!p.reclamee : false;

      let etat = `${Math.min(actuel, quete.objectif)}/${quete.objectif}`;
      if (termine && reclamee) etat = '✅ Réclamée';
      else if (termine) etat = '🎁 Prête à réclamer !';

      embed.addFields({
        name: `${quete.emoji} ${quete.nom} — ${formatMontant(quete.recompense)}`,
        value: `${quete.description}\nProgression : ${etat}`,
      });

      if (termine && !reclamee) {
        auMoinsUnBouton = true;
        boutons.addComponents(
          new ButtonBuilder()
            .setCustomId(`quete_reclamer_${quete.id}`)
            .setLabel(`Réclamer : ${quete.nom}`)
            .setStyle(ButtonStyle.Success)
            .setEmoji('🎁')
        );
      }
    }

    await interaction.reply({
      embeds: [embed],
      components: auMoinsUnBouton ? [boutons] : [],
      ephemeral: true,
    });
  },
};
