const { getMetier, METIERS } = require('./metiers');

const RARETES_RARES = ['Rare', 'Très rare', 'Exceptionnellement rare'];

const SUCCES = [
  {
    id: 'premier_travail', nom: 'Premier salaire', emoji: '🥉', recompense: 100,
    description: 'Effectue ton premier service avec /travailler',
    condition: (ctx) => ctx.compte.nb_travaux >= 1,
  },
  {
    id: 'dix_travaux', nom: 'Travailleur régulier', emoji: '🥈', recompense: 300,
    description: '10 services effectués',
    condition: (ctx) => ctx.compte.nb_travaux >= 10,
  },
  {
    id: 'cinquante_travaux', nom: 'Pilier du travail', emoji: '🥇', recompense: 1000,
    description: '50 services effectués',
    condition: (ctx) => ctx.compte.nb_travaux >= 50,
  },
  {
    id: 'cent_travaux', nom: 'Vétéran du travail', emoji: '🏆', recompense: 2500,
    description: '100 services effectués',
    condition: (ctx) => ctx.compte.nb_travaux >= 100,
  },
  {
    id: 'dix_mille', nom: 'Premiers 10 000 €', emoji: '💵', recompense: 200,
    description: '10 000 € cumulés gagnés',
    condition: (ctx) => ctx.compte.total_gagne >= 10000,
  },
  {
    id: 'cent_mille', nom: 'Six chiffres', emoji: '💰', recompense: 1000,
    description: '100 000 € cumulés gagnés',
    condition: (ctx) => ctx.compte.total_gagne >= 100000,
  },
  {
    id: 'million', nom: 'Millionnaire', emoji: '🤑', recompense: 5000,
    description: '1 000 000 € cumulés gagnés',
    condition: (ctx) => ctx.compte.total_gagne >= 1000000,
  },
  {
    id: 'epargnant', nom: 'Épargnant prudent', emoji: '🏦', recompense: 500,
    description: '50 000 € à la banque',
    condition: (ctx) => ctx.compte.banque >= 50000,
  },
  {
    id: 'metier_rare', nom: 'Ambitieux', emoji: '⭐', recompense: 750,
    description: 'Débloquer un métier Rare ou plus rare',
    condition: (ctx) => ctx.metiersDebloques.some((id) => {
      const m = getMetier(id);
      return m && RARETES_RARES.includes(m.rarete);
    }),
  },
  {
    id: 'collectionneur', nom: 'Collectionneur', emoji: '🎒', recompense: 400,
    description: 'Posséder 5 objets différents',
    condition: (ctx) => ctx.nbObjetsDistincts >= 5,
  },
  {
    id: 'fidele', nom: 'Habitué', emoji: '📅', recompense: 500,
    description: '7 jours de suite avec /daily',
    condition: (ctx) => ctx.compte.daily_streak >= 7,
  },
  {
    id: 'increvable', nom: 'Increvable', emoji: '🩹', recompense: 300,
    description: 'Survivre à 5 accidents du travail',
    condition: (ctx) => ctx.compte.accidents_subis >= 5,
  },
];

function getSucces(id) {
  return SUCCES.find((s) => s.id === id);
}

module.exports = { SUCCES, getSucces };
