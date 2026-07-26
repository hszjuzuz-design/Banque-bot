const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getCompte, getReputationToutes, getSuccesDebloques, getQuetesDuJour } = require('../database');
const { getRang } = require('../rangs');
const { getMetier } = require('../metiers');
const { SUCCES } = require('../succes');
const { QUETES } = require('../quetes');
const { formatMontant } = require('../utils/format');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profil')
    .setDescription('Affiche ta progression : rang, réputation, succès et quêtes du jour')
    .addUserOption((opt) => opt.setName('utilisateur').setDescription('Profil à consulter').setRequired(false)),
  async execute(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: '🚫 Cette commande ne fonctionne que sur un serveur.', ephemeral: true });
      return;
    }
    const cible = interaction.options.getUser('utilisateur') || interaction.user;
    const guildId = interaction.guildId;
    const compte = getCompte(cible.id, guildId);
    const rang = getRang(compte.total_gagne);

    const reputations = getReputationToutes(cible.id, guildId).slice(0, 3);
    const topReputation = reputations.length > 0
      ? reputations.map((r) => {
          const m = getMetier(r.metier_id);
          return `${m ? m.emoji : '💼'} ${m ? m.nom : r.metier_id} — ${r.points} pts`;
        }).join('\n')
      : 'Aucune réputation acquise pour le moment.';

    const succesDebloques = getSuccesDebloques(cible.id, guildId);
    const quetesJour = getQuetesDuJour(cible.id, guildId);
    const quetesTerminees = QUETES.filter((q) => {
      const p = quetesJour.find((qj) => qj.quete_id === q.id);
      return p && p.progression >= q.objectif;
    }).length;

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle(`${rang.emoji} Profil de ${cible.username}`)
      .addFields(
        {
          name: 'Rang économique',
          value: rang.suivant
            ? `**${rang.nom}** — ${formatMontant(rang.restant)} avant **${rang.suivant}**`
            : `**${rang.nom}** (rang maximum)`,
        },
        { name: 'PV', value: `${compte.pv}/100`, inline: true },
        { name: 'Services effectués', value: `${compte.nb_travaux}`, inline: true },
        { name: 'Série /daily', value: `🔥 ${compte.daily_streak} jour(s)`, inline: true },
        { name: 'Réputation (top 3 métiers)', value: topReputation },
        { name: 'Succès', value: `${succesDebloques.length}/${SUCCES.length} débloqués — voir \`/succes\`` },
        { name: 'Quêtes du jour', value: `${quetesTerminees}/${QUETES.length} terminées — voir \`/quetes\`` }
      );

    await interaction.reply({ embeds: [embed] });
  },
};
