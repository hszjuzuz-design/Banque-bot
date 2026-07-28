const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const {
  getCompte,
  updateCash,
  creerDemandeCredit,
  getCreditActif,
  getCreditsEnAttente,
  rembourserCredit,
  ajouterTresor,
} = require('../database');
const { messageSiEnDette } = require('../utils/dette');
const { formatMontant, formatDuree } = require('../utils/format');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('credit')
    .setDescription('Demande, consulte ou rembourse un prêt auprès du Créateur du serveur')
    .addSubcommand((sub) =>
      sub
        .setName('demander')
        .setDescription('Demande un prêt (le Créateur doit approuver)')
        .addIntegerOption((opt) => opt.setName('montant').setDescription('Montant demandé').setRequired(true).setMinValue(1))
        .addIntegerOption((opt) =>
          opt.setName('jours').setDescription('Délai de remboursement en jours (1-30)').setRequired(true).setMinValue(1).setMaxValue(30)
        )
        .addStringOption((opt) => opt.setName('raison').setDescription('Pourquoi ce prêt ?').setRequired(false))
    )
    .addSubcommand((sub) => sub.setName('statut').setDescription('Consulte ton prêt actif'))
    .addSubcommand((sub) =>
      sub
        .setName('rembourser')
        .setDescription('Rembourse tout ou partie de ton prêt actif')
        .addIntegerOption((opt) => opt.setName('montant').setDescription('Montant à rembourser').setRequired(true).setMinValue(1))
    ),
  async execute(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: '🚫 Cette commande ne fonctionne que sur un serveur.', ephemeral: true });
      return;
    }
    const userId = interaction.user.id;
    const guildId = interaction.guildId;
    const sousCommande = interaction.options.getSubcommand();

    if (sousCommande === 'demander') {
      const montant = interaction.options.getInteger('montant');
      const jours = interaction.options.getInteger('jours');
      const raison = interaction.options.getString('raison');

      const dejaActif = getCreditActif(userId, guildId);
      if (dejaActif) {
        await interaction.reply({
          content: `🚫 Tu as déjà un prêt actif de **${formatMontant(dejaActif.montant_du)}** à rembourser. Utilise \`/credit statut\` pour le consulter.`,
          ephemeral: true,
        });
        return;
      }

      const enAttente = getCreditsEnAttente(guildId).filter((c) => c.demandeur_id === userId);
      if (enAttente.length > 0) {
        await interaction.reply({
          content: '🚫 Tu as déjà une demande de prêt en attente de validation par le Créateur.',
          ephemeral: true,
        });
        return;
      }

      creerDemandeCredit(guildId, userId, montant, jours, raison);

      await interaction.reply({
        content:
          `📋 Demande de prêt envoyée : **${formatMontant(montant)}**, à rembourser sous **${jours} jour(s)**.\n` +
          `Le Créateur/Président doit l'approuver via son panel (\`/createur-panel\`).`,
        ephemeral: true,
      });
      return;
    }

    if (sousCommande === 'statut') {
      const credit = getCreditActif(userId, guildId);
      if (!credit) {
        const enAttente = getCreditsEnAttente(guildId).find((c) => c.demandeur_id === userId);
        if (enAttente) {
          await interaction.reply({
            content: `📋 Ta demande de **${formatMontant(enAttente.montant_initial)}** est toujours en attente de validation.`,
            ephemeral: true,
          });
          return;
        }
        await interaction.reply({ content: "Tu n'as aucun prêt actif ni en attente.", ephemeral: true });
        return;
      }

      const tempsRestant = credit.date_echeance - Date.now();
      const enRetard = tempsRestant < 0;

      const embed = new EmbedBuilder()
        .setColor(enRetard ? 0xe74c3c : 0x3498db)
        .setTitle('📋 Ton prêt actif')
        .addFields(
          { name: 'Montant emprunté', value: formatMontant(credit.montant_initial), inline: true },
          { name: 'Reste à rembourser', value: formatMontant(credit.montant_du), inline: true },
          {
            name: 'Échéance',
            value: enRetard
              ? `⚠️ En retard depuis ${formatDuree(-tempsRestant)} — le montant dû augmente chaque jour !`
              : `${formatDuree(tempsRestant)} restant(s)`,
          }
        );
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // --- rembourser ---
    const montant = interaction.options.getInteger('montant');
    const credit = getCreditActif(userId, guildId);
    if (!credit) {
      await interaction.reply({ content: "🚫 Tu n'as aucun prêt actif à rembourser.", ephemeral: true });
      return;
    }

    const compte = getCompte(userId, guildId);
    if (compte.cash < montant) {
      await interaction.reply({
        content: `🚫 Fonds insuffisants. Tu as ${formatMontant(compte.cash)} en poche.`,
        ephemeral: true,
      });
      return;
    }

    const montantEffectif = Math.min(montant, credit.montant_du);
    updateCash(userId, guildId, -montantEffectif);
    ajouterTresor(guildId, montantEffectif);
    const resultat = rembourserCredit(credit.id, montantEffectif);

    if (resultat.statut === 'rembourse') {
      await interaction.reply(`✅ Prêt intégralement remboursé ! Tu as versé **${formatMontant(montantEffectif)}** au Trésor du serveur.`);
    } else {
      await interaction.reply(
        `💰 Remboursement de **${formatMontant(montantEffectif)}** effectué. Il te reste **${formatMontant(resultat.montant_du)}** à rembourser.`
      );
    }
  },
};
