// Conversion : salaire net mensuel (France) / 151.67h (durée légale mensuelle) * 4h (un "service" simulé)
// Sources : INSEE/DARES/Hellowork/Glassdoor pour les métiers courants (2025-2026).
// Pour les métiers très rares sans grille salariale publique (astronaute, chasseur d'ouragans,
// chef d'orchestre international...), le salaire est une estimation raisonnée, clairement approximative.

function gainDepuisSalaire(salaireMensuelNet, heuresParService = 4) {
  const horaire = salaireMensuelNet / 151.67;
  return Math.round(horaire * heuresParService);
}

const METIERS = [
  // ─────────────── TRÈS COURANTS — débloqués dès le départ ───────────────
  {
    id: 'caissier', nom: 'Caissier', rarete: 'Très courant', emoji: '🛒',
    salaireMensuel: 1700, condition: null,
  },
  {
    id: 'serveur', nom: 'Serveur', rarete: 'Très courant', emoji: '🍽️',
    salaireMensuel: 1750, condition: null,
  },
  {
    id: 'ouvrier', nom: 'Ouvrier', rarete: 'Très courant', emoji: '🧱',
    salaireMensuel: 1900, condition: null,
  },
  {
    id: 'electricien', nom: 'Électricien', rarete: 'Très courant', emoji: '🔌',
    salaireMensuel: 2200, condition: null,
  },
  {
    id: 'enseignant', nom: 'Enseignant', rarete: 'Très courant', emoji: '📚',
    salaireMensuel: 2200, condition: null,
  },
  {
    id: 'developpeur', nom: 'Développeur informatique', rarete: 'Très courant', emoji: '💻',
    salaireMensuel: 3200, condition: null,
  },

  // ─────────────── COURANTS ───────────────
  {
    id: 'medecin_generaliste', nom: 'Médecin généraliste', rarete: 'Courant', emoji: '🩺',
    salaireMensuel: 5000,
    condition: { travaux: 15, totalGagne: 8000 },
    conditionTexte: 'Avoir travaillé 15 fois et cumulé 8 000 € de revenus',
  },
  {
    id: 'architecte', nom: 'Architecte', rarete: 'Courant', emoji: '📐',
    salaireMensuel: 3800,
    condition: { travaux: 12, totalGagne: 6000 },
    conditionTexte: 'Avoir travaillé 12 fois et cumulé 6 000 € de revenus',
  },
  {
    id: 'avocat', nom: 'Avocat', rarete: 'Courant', emoji: '⚖️',
    salaireMensuel: 4500,
    condition: { travaux: 15, totalGagne: 8000 },
    conditionTexte: 'Avoir travaillé 15 fois et cumulé 8 000 € de revenus',
  },
  {
    id: 'ingenieur_civil', nom: 'Ingénieur civil', rarete: 'Courant', emoji: '🏗️',
    salaireMensuel: 3600,
    condition: { travaux: 12, totalGagne: 6000 },
    conditionTexte: 'Avoir travaillé 12 fois et cumulé 6 000 € de revenus',
  },

  // ─────────────── PEU COURANTS ───────────────
  {
    id: 'data_scientist', nom: 'Data Scientist', rarete: 'Peu courant', emoji: '📊',
    salaireMensuel: 4200,
    condition: { travaux: 30, totalGagne: 25000 },
    conditionTexte: 'Avoir travaillé 30 fois et cumulé 25 000 € de revenus',
  },
  {
    id: 'pilote_ligne', nom: 'Pilote de ligne', rarete: 'Peu courant', emoji: '✈️',
    salaireMensuel: 8500,
    condition: { travaux: 40, totalGagne: 40000 },
    conditionTexte: 'Avoir travaillé 40 fois et cumulé 40 000 € de revenus',
  },
  {
    id: 'ingenieur_ia', nom: 'Ingénieur en intelligence artificielle', rarete: 'Peu courant', emoji: '🤖',
    salaireMensuel: 6000,
    condition: { travaux: 45, totalGagne: 60000, metierRequis: 'data_scientist' },
    conditionTexte: 'Avoir débloqué Data Scientist, travaillé 45 fois et cumulé 60 000 €',
  },
  {
    id: 'controleur_aerien', nom: 'Contrôleur aérien', rarete: 'Peu courant', emoji: '🛫',
    salaireMensuel: 5500,
    condition: { travaux: 35, totalGagne: 35000 },
    conditionTexte: 'Avoir travaillé 35 fois et cumulé 35 000 € de revenus',
  },

  // ─────────────── RARES ───────────────
  {
    id: 'horloger', nom: 'Horloger de haute complication', rarete: 'Rare', emoji: '⌚',
    salaireMensuel: 6500,
    condition: { travaux: 60, totalGagne: 120000 },
    conditionTexte: 'Avoir travaillé 60 fois et cumulé 120 000 € de revenus',
  },
  {
    id: 'demineur', nom: 'Démineur', rarete: 'Rare', emoji: '💣',
    salaireMensuel: 3200,
    condition: { travaux: 55, totalGagne: 100000 },
    conditionTexte: 'Avoir travaillé 55 fois et cumulé 100 000 € de revenus',
  },
  {
    id: 'chasseur_ouragans', nom: "Chasseur d'ouragans", rarete: 'Rare', emoji: '🌀',
    salaireMensuel: 4500,
    condition: { travaux: 60, totalGagne: 130000 },
    conditionTexte: 'Avoir travaillé 60 fois et cumulé 130 000 € de revenus',
  },

  // ─────────────── TRÈS RARES ───────────────
  {
    id: 'chirurgien_transplantation', nom: 'Chirurgien de transplantation', rarete: 'Très rare', emoji: '🫀',
    salaireMensuel: 12000,
    condition: { travaux: 100, totalGagne: 400000, metierRequis: 'medecin_generaliste' },
    conditionTexte: 'Avoir débloqué Médecin généraliste, travaillé 100 fois et cumulé 400 000 €',
  },
  {
    id: 'forces_speciales', nom: 'Membre des forces spéciales', rarete: 'Très rare', emoji: '🎖️',
    salaireMensuel: 4200,
    condition: { travaux: 150, totalGagne: 350000 },
    conditionTexte: 'Avoir travaillé 150 fois et cumulé 350 000 € de revenus',
  },
  {
    id: 'chef_orchestre', nom: "Chef d'orchestre international", rarete: 'Très rare', emoji: '🎼',
    salaireMensuel: 16000,
    condition: { travaux: 120, totalGagne: 600000 },
    conditionTexte: 'Avoir travaillé 120 fois et cumulé 600 000 € de revenus',
  },

  // ─────────────── EXCEPTIONNELLEMENT RARES ───────────────
  {
    id: 'astronaute', nom: 'Astronaute', rarete: 'Exceptionnellement rare', emoji: '🧑‍🚀',
    salaireMensuel: 7500,
    condition: { travaux: 200, totalGagne: 1000000, metierRequis: 'ingenieur_ia' },
    conditionTexte: "Avoir débloqué Ingénieur en IA, travaillé 200 fois et cumulé 1 000 000 €",
  },
  {
    id: 'prix_nobel', nom: 'Prix Nobel (titre)', rarete: 'Exceptionnellement rare', emoji: '🏅',
    salaireMensuel: 40000,
    condition: { travaux: 0, totalGagne: 2000000, premierDuClassement: true },
    conditionTexte: 'Avoir cumulé 2 000 000 € ET être classé n°1 au /classement du serveur',
    bonusDeblocage: 500000,
  },
  {
    id: 'ambassadeur_onu', nom: 'Ambassadeur auprès des Nations unies', rarete: 'Exceptionnellement rare', emoji: '🕊️',
    salaireMensuel: 9500,
    condition: { travaux: 180, totalGagne: 1500000, metierRequis: 'avocat' },
    conditionTexte: 'Avoir débloqué Avocat, travaillé 180 fois et cumulé 1 500 000 €',
  },
];

// Pré-calcule le gain de base pour chaque métier
for (const m of METIERS) {
  m.gainBase = gainDepuisSalaire(m.salaireMensuel);
}

const RARETE_ORDRE = ['Très courant', 'Courant', 'Peu courant', 'Rare', 'Très rare', 'Exceptionnellement rare'];
const RARETE_COULEUR = {
  'Très courant': 0x95a5a6,
  'Courant': 0x2ecc71,
  'Peu courant': 0x3498db,
  'Rare': 0x9b59b6,
  'Très rare': 0xe67e22,
  'Exceptionnellement rare': 0xf1c40f,
};

function getMetier(id) {
  return METIERS.find((m) => m.id === id);
}

module.exports = { METIERS, RARETE_ORDRE, RARETE_COULEUR, getMetier, gainDepuisSalaire };

