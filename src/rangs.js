const RANGS = [
  { seuil: 0, nom: 'Précaire', emoji: '🥄' },
  { seuil: 5000, nom: 'Stable', emoji: '🧰' },
  { seuil: 25000, nom: 'Aisé', emoji: '💼' },
  { seuil: 100000, nom: 'Riche', emoji: '💎' },
  { seuil: 500000, nom: 'Fortuné', emoji: '👑' },
  { seuil: 2000000, nom: 'Magnat', emoji: '🏛️' },
  { seuil: 10000000, nom: 'Légende', emoji: '🌟' },
];

/**
 * Retourne le rang actuel basé sur le total cumulé gagné, ainsi que
 * la progression vers le rang suivant (ou null si rang maximum atteint).
 */
function getRang(totalGagne) {
  let actuel = RANGS[0];
  let suivant = null;

  for (let i = 0; i < RANGS.length; i++) {
    if (totalGagne >= RANGS[i].seuil) {
      actuel = RANGS[i];
      suivant = RANGS[i + 1] || null;
    }
  }

  return {
    nom: actuel.nom,
    emoji: actuel.emoji,
    suivant: suivant ? suivant.nom : null,
    seuilSuivant: suivant ? suivant.seuil : null,
    restant: suivant ? suivant.seuil - totalGagne : 0,
  };
}

module.exports = { RANGS, getRang };
