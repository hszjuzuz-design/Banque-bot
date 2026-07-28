const { formatMontant } = require('./format');

/**
 * Retourne un message d'erreur si le compte est en dette (cash négatif),
 * ou null si tout va bien. Les gains (travail, daily, capacités, vol) restent
 * toujours autorisés — seules les dépenses/sorties d'argent sont bloquées,
 * pour forcer le joueur à repasser au-dessus de 0 avant de pouvoir dépenser.
 */
function messageSiEnDette(compte) {
  if (compte.cash >= 0) return null;
  return (
    `🚫 Tu es en dette de **${formatMontant(Math.abs(compte.cash))}** (solde négatif). ` +
    `Il faut repasser au-dessus de 0 € en poche avant de pouvoir dépenser ou transférer de l'argent. ` +
    `Continue à gagner de l'argent avec \`/travailler\`, \`/daily\` ou tes capacités.`
  );
}

module.exports = { messageSiEnDette };
