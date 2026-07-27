const { SlashCommandBuilder } = require('discord.js');
const { getCompte, getDerniereCapacite, setDerniereCapacite } = require('../database');
const { getMetier } = require('../metiers');
const { getCapacite } = require('../capacites');
const { formatDuree } = require('../utils/format');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('capacite')
    .setDescription('Active la capacité spéciale de ton métier actuel')
    .addUserOption((opt) =>
      opt.setName('cible').setDescription('Joueur ciblé (si la capacité en a besoin)').setRequired(false)
    ),
  async execute(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: '🚫 Cette commande ne fonctionne que sur un serveur.', ephemeral: true });
      return;
    }
    const userId = interaction.user.id;
    const guildId = interaction.guildId;
    const compte = getCompte(userId, guildId);
    const metier = getMetier(compte.metier_actuel) || getMetier('caissier');
    const capacite = getCapacite(metier.id);

    if (!capacite) {
      await interaction.reply({
        content: `🚫 Ton métier actuel (**${metier.nom}**) n'a pas encore de capacité spéciale.`,
        ephemeral: true,
      });
      return;
    }

    const maintenant = Date.now();
    const derniere = getDerniereCapacite(userId, guildId);
    const cooldownMs = capacite.cooldownHeures * 60 * 60 * 1000;
    const tempsRestant = derniere + cooldownMs - maintenant;

    if (tempsRestant > 0) {
      await interaction.reply({
        content: `⏳ **${capacite.nom}** est en recharge. Reviens dans **${formatDuree(tempsRestant)}**.`,
        ephemeral: true,
      });
      return;
    }

    const cibleUser = interaction.options.getUser('cible');

    if (capacite.cibleRequise && !cibleUser) {
      await interaction.reply({
        content: `🚫 **${capacite.nom}** nécessite de cibler quelqu'un : \`/capacite cible:@joueur\`.`,
        ephemeral: true,
      });
      return;
    }

    const ctx = {
      userId,
      guildId,
      compte,
      cibleId: cibleUser ? cibleUser.id : null,
      cibleUser,
      guild: interaction.guild,
    };

    const resultat = capacite.executer(ctx);
    setDerniereCapacite(userId, guildId, maintenant);

    await interaction.reply(`${capacite.emoji} **${capacite.nom}**\n${resultat}`);
  },
};
