const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getCompte, setMetierActuel } = require('../database');
const { METIERS, RARETE_COULEUR } = require('../metiers');
const { estDisponible } = require('../utils/progression');
const { getCapacite } = require('../capacites');
const { formatMontant } = require('../utils/format');

/**
 * Construit la vue (embed + boutons) pour un métier donné, à l'index fourni
 * dans le tableau METIERS. Utilisée à la fois par la commande /metiers et
 * par les boutons de navigation/sélection.
 */
function construireVueMetier(userId, guildId, index) {
  const idx = Math.max(0, Math.min(METIERS.length - 1, index));
  const metier = METIERS[idx];
  const compte = getCompte(userId, guildId);
  const disponible = estDisponible(userId, guildId, metier);
  const estActif = compte.metier_actuel === metier.id;
  const capacite = getCapacite(metier.id);

  const embed = new EmbedBuilder()
    .setColor(RARETE_COULEUR[metier.rarete])
    .setTitle(`${metier.emoji} ${metier.nom}  (${idx + 1}/${METIERS.length})`)
    .addFields(
      { name: 'Rareté', value: metier.rarete, inline: true },
      { name: 'Gain par service', value: formatMontant(metier.gainBase), inline: true },
      {
        name: 'Statut',
        value: estActif
          ? "⭐ C'est ton métier actuel"
          : disponible
          ? '🔓 Débloqué'
          : `🔒 Verrouillé\n${metier.conditionTexte}`,
      }
    );

  if (capacite) {
    embed.addFields({
      name: `${capacite.emoji} Capacité spéciale : ${capacite.nom}`,
      value: `${capacite.description}\nRecharge : ${capacite.cooldownHeures}h`,
    });
  }

  const navigation = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`metiers_nav_${idx - 1}`)
      .setLabel('Précédent')
      .setEmoji('⬅️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(idx === 0),
    new ButtonBuilder()
      .setCustomId(`metiers_nav_${idx + 1}`)
      .setLabel('Suivant')
      .setEmoji('➡️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(idx === METIERS.length - 1)
  );

  const action = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`metiers_choisir_${idx}`)
      .setLabel(estActif ? 'Déjà ton métier' : 'Choisir ce métier')
      .setEmoji('✅')
      .setStyle(disponible && !estActif ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setDisabled(!disponible || estActif)
  );

  return { embeds: [embed], components: [navigation, action] };
}

async function naviguerMetier(interaction) {
  const idx = parseInt(interaction.customId.replace('metiers_nav_', ''), 10);
  const vue = construireVueMetier(interaction.user.id, interaction.guildId, idx);
  await interaction.update(vue);
}

async function choisirMetierBouton(interaction) {
  const idx = parseInt(interaction.customId.replace('metiers_choisir_', ''), 10);
  const metier = METIERS[idx];
  const userId = interaction.user.id;
  const guildId = interaction.guildId;

  if (!estDisponible(userId, guildId, metier)) {
    await interaction.reply({ content: "🚫 Ce métier n'est pas encore débloqué.", ephemeral: true });
    return;
  }

  setMetierActuel(userId, guildId, metier.id);

  const vue = construireVueMetier(userId, guildId, idx);
  await interaction.update(vue);
  await interaction.followUp({
    content: `✅ Tu exerces maintenant le métier de **${metier.nom}** !`,
    ephemeral: true,
  });
}

module.exports = { construireVueMetier, naviguerMetier, choisirMetierBouton };
