const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { getCompte } = require('../database');
const { METIERS, RARETE_ORDRE, RARETE_COULEUR } = require('../metiers');
const { estDisponible } = require('../utils/progression');
const { formatMontant } = require('../utils/format');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('metiers')
    .setDescription('Affiche tous les métiers, leur rareté et les conditions pour les débloquer')
    .addStringOption((opt) =>
      opt
        .setName('rarete')
        .setDescription('Filtrer par rareté')
        .setRequired(false)
        .addChoices(...RARETE_ORDRE.map((r) => ({ name: r, value: r })))
    ),
  async execute(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: '🚫 Cette commande ne fonctionne que sur un serveur.', ephemeral: true });
      return;
    }
    const userId = interaction.user.id;
    const guildId = interaction.guildId;
    const compte = getCompte(userId, guildId);
    const filtre = interaction.options.getString('rarete');
    const raretesAAfficher = filtre ? [filtre] : RARETE_ORDRE;

    const embeds = raretesAAfficher.map((rarete) => {
      const metiers = METIERS.filter((m) => m.rarete === rarete);
      const embed = new EmbedBuilder().setColor(RARETE_COULEUR[rarete]).setTitle(`${rarete}`);

      const lignes = metiers.map((m) => {
        const disponible = estDisponible(userId, guildId, m);
        const cadenas = disponible ? '🔓' : '🔒';
        const actuel = compte.metier_actuel === m.id ? ' ⭐ *(métier actuel)*' : '';
        let ligne = `${cadenas} ${m.emoji} **${m.nom}** — ${formatMontant(m.gainBase)}/service${actuel}`;
        if (!disponible && m.conditionTexte) {
          ligne += `\n　　↳ *Condition : ${m.conditionTexte}*`;
        }
        return ligne;
      });

      embed.setDescription(lignes.join('\n'));
      return embed;
    });

    // Discord limite à 10 embeds par message
    const menu = new StringSelectMenuBuilder()
      .setCustomId('metiers_select')
      .setPlaceholder('Sélectionne un métier pour voir le détail...')
      .addOptions(
        METIERS.slice(0, 25).map((m) => ({
          label: m.nom.slice(0, 100),
          description: `${m.rarete} • ${formatMontant(m.gainBase)}/service`.slice(0, 100),
          value: m.id,
        }))
      );

    await interaction.reply({
      embeds: embeds.slice(0, 10),
      components: [new ActionRowBuilder().addComponents(menu)],
    });
  },
};
