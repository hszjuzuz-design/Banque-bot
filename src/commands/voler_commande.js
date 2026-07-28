const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const {
  getCompte,
  updateCash,
  updateBanque,
  possede,
  logTransaction,
  getDerniereTentativeVol,
  setDerniereTentativeVol,
  ajouterTresor,
} = require('../database');
const { tenterVolPoche, tenterVolBanque, COOLDOWN_VOL_MS } = require('../vol');
const { messageSiEnDette } = require('../utils/dette');
const { formatMontant, formatDuree } = require('../utils/format');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('voler')
    .setDescription("Tente un vol — risqué, régi par les vraies statistiques françaises")
    .addSubcommand((sub) =>
      sub
        .setName('poche')
        .setDescription("Vole le cash d'un joueur (dans sa poche)")
        .addUserOption((opt) => opt.setName('cible').setDescription('Joueur ciblé').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('banque')
        .setDescription("Pirate le compte bancaire d'un joueur (nécessite un PC de piratage)")
        .addUserOption((opt) => opt.setName('cible').setDescription('Joueur ciblé').setRequired(true))
    ),
  async execute(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: '🚫 Cette commande ne fonctionne que sur un serveur.', ephemeral: true });
      return;
    }

    const sousCommande = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    const guildId = interaction.guildId;
    const cible = interaction.options.getUser('cible');

    if (cible.id === userId) {
      await interaction.reply({ content: '🚫 Tu ne peux pas te voler toi-même.', ephemeral: true });
      return;
    }
    if (cible.bot) {
      await interaction.reply({ content: '🚫 Tu ne peux pas voler un bot.', ephemeral: true });
      return;
    }

    const compte = getCompte(userId, guildId);

    const erreurDette = messageSiEnDette(compte);
    if (erreurDette) {
      await interaction.reply({ content: erreurDette, ephemeral: true });
      return;
    }

    const maintenant = Date.now();
    const derniere = getDerniereTentativeVol(userId, guildId);
    const tempsRestant = derniere + COOLDOWN_VOL_MS - maintenant;
    if (tempsRestant > 0) {
      await interaction.reply({
        content: `⏳ Tu dois te faire discret. Retente dans **${formatDuree(tempsRestant)}**.`,
        ephemeral: true,
      });
      return;
    }

    const compteCible = getCompte(cible.id, guildId);

    if (sousCommande === 'poche') {
      if (compteCible.cash <= 0) {
        await interaction.reply({ content: `🚫 ${cible.username} n'a rien en poche.`, ephemeral: true });
        return;
      }

      const possedeMasque = possede(userId, guildId, 'masque');
      const possedeKit = possede(userId, guildId, 'kit_effraction');
      const resultat = tenterVolPoche({ cashCible: compteCible.cash, possedeMasque, possedeKit });

      setDerniereTentativeVol(userId, guildId, maintenant);

      if (resultat.attrape) {
        updateCash(userId, guildId, -resultat.amende);
        ajouterTresor(guildId, resultat.amende);
        logTransaction(userId, null, resultat.amende, 'amende_vol_poche', guildId);

        const embed = new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle('🚨 Attrapé sur le fait !')
          .setDescription(
            `Tu t'es fait prendre en tentant de voler ${cible.username}.\n` +
            `Amende légale (vol simple, art. 311-3 du Code pénal) : **${formatMontant(resultat.amende)}**, versée au Trésor du serveur.`
          );
        await interaction.reply({ embeds: [embed] });
        return;
      }

      updateCash(cible.id, guildId, -resultat.montant);
      updateCash(userId, guildId, resultat.montant);
      logTransaction(cible.id, userId, resultat.montant, 'vol_poche', guildId);

      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('🕶️ Vol réussi')
        .setDescription(`Tu as discrètement fait les poches de ${cible.username} : **${formatMontant(resultat.montant)}** subtilisés.`);
      await interaction.reply({ embeds: [embed] });
      return;
    }

    // --- sous-commande banque ---
    if (!possede(userId, guildId, 'pc_portable_hack')) {
      await interaction.reply({
        content: "🚫 Il te faut un **PC de piratage** pour tenter un vol bancaire — disponible au `/supermarche`.",
        ephemeral: true,
      });
      return;
    }
    if (compteCible.banque <= 0) {
      await interaction.reply({ content: `🚫 ${cible.username} n'a rien à la banque.`, ephemeral: true });
      return;
    }

    const resultat = tenterVolBanque({ banqueCible: compteCible.banque, hackingXp: compte.hacking_xp });
    setDerniereTentativeVol(userId, guildId, maintenant);

    if (resultat.attrape) {
      updateCash(userId, guildId, -resultat.amende);
      ajouterTresor(guildId, resultat.amende);
      logTransaction(userId, null, resultat.amende, 'amende_vol_banque', guildId);

      const embed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle('🚨 Piratage détecté !')
        .setDescription(
          `Ton intrusion a été repérée en tentant de pirater le compte de ${cible.username}.\n` +
          `Amende légale (piratage informatique, art. 323-1 du Code pénal) : **${formatMontant(resultat.amende)}**, versée au Trésor du serveur.`
        );
      await interaction.reply({ embeds: [embed] });
      return;
    }

    updateBanque(cible.id, guildId, -resultat.montant);
    updateCash(userId, guildId, resultat.montant);
    logTransaction(cible.id, userId, resultat.montant, 'vol_banque', guildId);

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('💻 Piratage réussi')
      .setDescription(
        `Niveau **${resultat.palier.nom}** : tu as siphonné **${formatMontant(resultat.montant)}** du compte bancaire de ${cible.username}.`
      );
    await interaction.reply({ embeds: [embed] });
  },
};
