const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const {
  getCompte,
  updateCash,
  setLastDaily,
  setDailyInfo,
  logTransaction,
  getJourCourant,
} = require('../database');
const { verifierSucces } = require('../utils/progression');
const { formatMontant, formatDuree } = require('../utils/format');

const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 heures
const RECOMPENSE_BASE = 500;
const BONUS_PAR_JOUR_DE_SERIE = 30;
const BONUS_MAX = 300;

function jourPrecedent(jour) {
  const d = new Date(jour + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

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

    const aujourdhui = getJourCourant();
    let nouvelleSerie = 1;
    if (compte.dernier_daily_jour === jourPrecedent(aujourdhui)) {
      nouvelleSerie = compte.daily_streak + 1;
    }

    const bonusSerie = Math.min(BONUS_MAX, (nouvelleSerie - 1) * BONUS_PAR_JOUR_DE_SERIE);
    const montant = RECOMPENSE_BASE + bonusSerie;

    updateCash(userId, guildId, montant);
    setLastDaily(userId, guildId, maintenant);
    setDailyInfo(userId, guildId, nouvelleSerie, aujourdhui);
    logTransaction(null, userId, montant, 'daily', guildId);

    const nouveauxSucces = verifierSucces(userId, guildId);

    let contenu = `🎁 Récompense quotidienne récupérée : **${formatMontant(montant)}**`;
    if (bonusSerie > 0) {
      contenu += ` (dont +${formatMontant(bonusSerie)} de bonus de série)`;
    }
    contenu += `\n🔥 Série actuelle : **${nouvelleSerie} jour(s)** d'affilée`;

    await interaction.reply(contenu);

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
