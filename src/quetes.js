const QUETES = [
  {
    id: 'travailler_3', nom: 'Trois services', emoji: '🛠️',
    description: "Travaille 3 fois aujourd'hui",
    objectif: 3, recompense: 200,
  },
  {
    id: 'gagner_500', nom: 'Bon salaire', emoji: '💵',
    description: "Gagne 500 € aujourd'hui (net d'impôts)",
    objectif: 500, recompense: 150,
  },
  {
    id: 'deposer_argent', nom: 'Épargne du jour', emoji: '🏦',
    description: "Fais un dépôt à la banque aujourd'hui",
    objectif: 1, recompense: 100,
  },
];

function getQuete(id) {
  return QUETES.find((q) => q.id === id);
}

module.exports = { QUETES, getQuete };
