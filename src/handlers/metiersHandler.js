const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require('discord.js');
const { getCompte, setMetierActuel } = require('../database');
const { METIERS, RARETE_ORDRE, RARETE_COULEUR } = require('../metiers');
const { estDisponible } = require('../utils/progression');
const { getCapacite } = require('../capacites');
const { formatMontant } = require('../utils/format');

/**
 * Construit la vue (embed + composants) pour une page de rareté donnée.
 * Une page = une rareté = tous les métiers de cette rareté.
 */
function construireVueRarete(userId, guildId, rareteIndex) {
  const idx = Math.max(0, Math.min(RARETE_ORDRE.length - 1, rareteIndex));
  const rarete = RARETE_ORDRE[idx];
  const compte = getCompte(userId, guildId);
  const metiersDeCetteRarete = METIERS.filter((m) => m.rarete === rarete);

  const embed = new EmbedBuilder()
    .setColor(RARETE_COULEUR[rarete])
    .setTitle(`${rarete}  (${idx + 1}/${RARETE_ORDRE.length})`)
    .setDescription('Choisis un métier dans le menu ci-dessous pour l\'exercer.');

  for (const metier of metiersDeCetteRarete) {
    const disponible = estDisponible(userId, guildId, metier);
    const estActif = compte.metier_actuel === metier.id;
    const capacite = getCapacite(metier.id);
    const cadenas = estActif ? '⭐' : disponible ? '🔓' : '🔒';

    let valeur = `${formatMontant(metier.gainBase)}/service`;
    if (!disponible && metier.conditionTexte) {
      valeur += `\n↳ *Condition : ${metier.conditionTexte}*`;
    }
    if (capacite) {
      valeur += `\n${capacite.emoji} Capacité : *${capacite.nom}* (recharge ${capacite.cooldownHeures}h)`;
    }

    embed.addFields({ name: `${cadenas} ${metier.emoji} ${metier.nom}`, value: valeur });
  }

  const navigation = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`metiers_rarete_${idx - 1}`)
      .setLabel('Rareté précédente')
      .setEmoji('⬅️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(idx === 0),
    new ButtonBuilder()
      .setCustomId(`metiers_rarete_${idx + 1}`)
      .setLabel('Rareté suivante')
      .setEmoji('➡️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(idx === RARETE_ORDRE.length - 1)
  );

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`metiers_choix_${idx}`)
    .setPlaceholder('Choisir un métier de cette page...')
    .addOptions(
      metiersDeCetteRarete.map((m) => ({
        label: m.nom.slice(0, 100),
        description: `${formatMontant(m.gainBase)}/service`.slice(0, 100),
        value: m.id,
        emoji: m.emoji,
      }))
    );

  return {
    embeds: [embed],
    components: [navigation, new ActionRowBuilder().addComponents(menu)],
  };
}

async function naviguerRarete(interaction) {
  const idx = parseInt(interaction.customId.replace('metiers_rarete_', ''), 10);
  const vue = construireVueRarete(interaction.user.id, interaction.guildId, idx);
  await interaction.update(vue);
}

async function choisirMetierMenu(interaction) {
  const idx = parseInt(interaction.customId.replace('metiers_choix_', ''), 10);
  const metierId = interaction.values[0];
  const metier = METIERS.find((m) => m.id === metierId);
  const userId = interaction.user.id;
  const guildId = interaction.guildId;

  if (!metier) {
    await interaction.reply({ content: '🚫 Métier introuvable.', ephemeral: true });
    return;
  }

  if (!estDisponible(userId, guildId, metier)) {
    await interaction.reply({
      content: `🚫 **${metier.nom}** n'est pas encore débloqué.\n↳ Condition : ${metier.conditionTexte}`,
      ephemeral: true,
    });
    return;
  }

  setMetierActuel(userId, guildId, metier.id);

  const vue = construireVueRarete(userId, guildId, idx);
  await interaction.update(vue);
  await interaction.followUp({
    content: `✅ Tu exerces maintenant le métier de **${metier.nom}** !`,
    ephemeral: true,
  });
}

module.exports = { construireVueRarete, naviguerRarete, choisirMetierMenu };
