const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const {
  getCompte,
  setLastWork,
  enregistrerGainTravail,
  ajouterReputation,
  getReputation,
  incrementerQuete,
} = require('../database');
const { getMetier } = require('../metiers');
const { verifierDeblocages, verifierSucces } = require('../utils/progression');
const { formatMontant, formatDuree } = require('../utils/format');

const COOLDOWN_MS = 60 * 60 * 1000; // 1 heure = un "service"
const VARIANCE = 0.15; // ±15% autour du gain de base
const BONUS_REPUTATION_MAX = 0.20; // +20% de gain maximum grâce à la réputation
const REPUTATION_PAR_PALIER = 10; // 1% de bonus tous les 10 points de réputation

module.exports = {
  data: new SlashCommandBuilder()
    .setName('travailler')
    .setDescription('Fais un service dans ton métier actuel pour gagner de l\'argent (cooldown 1h)'),
  async execute(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: '🚫 Cette commande ne fonctionne que sur un serveur.', ephemeral: true });
      return;
    }
    const userId = interaction.user.id;
    const guildId = interaction.guildId;
    const compte = getCompte(userId, guildId);
    const maintenant = Date.now();
    const tempsRestant = compte.last_work + COOLDOWN_MS - maintenant;

    if (tempsRestant > 0) {
      await interaction.reply({
        content: `⏳ Tu es fatigué. Reviens travailler dans **${formatDuree(tempsRestant)}**.`,
        ephemeral: true,
      });
      return;
    }

    const metier = getMetier(compte.metier_actuel) || getMetier('caissier');

    const reputationActuelle = getReputation(userId, guildId, metier.id);
    const bonusReputation = Math.min(
      BONUS_REPUTATION_MAX,
      Math.floor(reputationActuelle / REPUTATION_PAR_PALIER) * 0.01
    );

    const facteur = 1 + (Math.random() * 2 - 1) * VARIANCE;
    const gain = Math.max(1, Math.round(metier.gainBase * facteur * (1 + bonusReputation)));

    setLastWork(userId, guildId, maintenant);
    enregistrerGainTravail(userId, guildId, gain, gain);
    ajouterReputation(userId, guildId, metier.id, 1);
    incrementerQuete(userId, guildId, 'travailler_3', 1);
    incrementerQuete(userId, guildId, 'gagner_500', gain);

    const nouveauxMetiers = verifierDeblocages(userId, guildId);
    const nouveauxSucces = verifierSucces(userId, guildId);

    let contenu = `${metier.emoji} Service terminé en tant que **${metier.nom}** : tu gagnes **${formatMontant(gain)}**.`;
    if (bonusReputation > 0) {
      contenu += `\n📈 Bonus de réputation : +${Math.round(bonusReputation * 100)}% (${reputationActuelle + 1} points dans ce métier)`;
    }

    await interaction.reply(contenu);

    if (nouveauxMetiers.length > 0) {
      const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle('🎉 Nouveau(x) métier(s) débloqué(s) !')
        .setDescription(
          nouveauxMetiers
            .map((m) => `${m.emoji} **${m.nom}** (${m.rarete}) — utilise \`/choisir-metier\` pour l'exercer`)
            .join('\n')
        );
      await interaction.followUp({ embeds: [embed] });
    }

    if (nouveauxSucces.length > 0) {
      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('🏆 Succès débloqué(s) !')
        .setDescription(
          nouveauxSucces
            .map((s) => `${s.emoji} **${s.nom}** — ${s.description} (+${formatMontant(s.recompense)})`)
            .join('\n')
        );
      await interaction.followUp({ embeds: [embed] });
    }
  },
};
