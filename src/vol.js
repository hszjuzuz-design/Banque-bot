// Taux basés sur les vraies statistiques officielles françaises :
// - Taux d'élucidation des vols sans violence < 8% à un an (Ministère de l'Intérieur, bilan 2025)
//   => environ 92% des vols ne sont jamais résolus par la police.
// - Vol simple (art. 311-3 du Code pénal) : jusqu'à 45 000 € d'amende.
// - Piratage informatique / accès frauduleux à un STAD (art. 323-1 du Code pénal) : jusqu'à 100 000 € d'amende.
const CHANCE_ATTRAPE = 0.08; // 8%, identique pour poche et banque (simplification)

const AMENDE_VOL_POCHE = 45000;
const AMENDE_VOL_BANQUE = 100000;

const COOLDOWN_VOL_MS = 3 * 60 * 60 * 1000; // 3h entre deux tentatives, poche ou banque confondues

// Points de hacking_xp accordés par formation, utilisés lors de l'achat en boutique
const XP_FORMATIONS = {
  formation_hacking_1: 10,
  formation_hacking_2: 30,
  formation_hacking_3: 75,
  formation_hacking_4: 200,
};

// Paliers de compétence en hacking : plus l'XP est haute, plus on vole un pourcentage
// important de la banque ciblée, et moins on a de risques d'être attrapé.
const PALIERS_HACKING = [
  { xpMin: 0, nom: 'Débutant', pourcentageMin: 0.05, pourcentageMax: 0.10, malusChanceAttrape: 0.02 },
  { xpMin: 10, nom: 'Initié', pourcentageMin: 0.10, pourcentageMax: 0.15, malusChanceAttrape: 0 },
  { xpMin: 30, nom: 'Confirmé', pourcentageMin: 0.15, pourcentageMax: 0.20, malusChanceAttrape: -0.01 },
  { xpMin: 75, nom: 'Expert', pourcentageMin: 0.20, pourcentageMax: 0.30, malusChanceAttrape: -0.02 },
  { xpMin: 200, nom: 'Élite', pourcentageMin: 0.30, pourcentageMax: 0.40, malusChanceAttrape: -0.03 },
];

function getPalierHacking(xp) {
  let palier = PALIERS_HACKING[0];
  for (const p of PALIERS_HACKING) {
    if (xp >= p.xpMin) palier = p;
  }
  return palier;
}

// --- Vol à la poche ---
const VOL_POCHE_MIN = 0.10;
const VOL_POCHE_MAX = 0.30;
const VOL_POCHE_PLAFOND = 2000;

function tenterVolPoche({ cashCible, possedeMasque, possedeKit }) {
  let chanceAttrape = CHANCE_ATTRAPE;
  if (possedeMasque) chanceAttrape = Math.max(0.01, chanceAttrape - 0.03);

  const attrape = Math.random() < chanceAttrape;
  if (attrape) {
    return { attrape: true, montant: 0, amende: AMENDE_VOL_POCHE };
  }

  let pourcentageMax = VOL_POCHE_MAX;
  if (possedeKit) pourcentageMax += 0.05;
  const pourcentage = VOL_POCHE_MIN + Math.random() * (pourcentageMax - VOL_POCHE_MIN);
  const montant = Math.min(VOL_POCHE_PLAFOND, Math.max(1, Math.round(cashCible * pourcentage)));

  return { attrape: false, montant, amende: 0 };
}

// --- Vol bancaire (piratage) ---
function tenterVolBanque({ banqueCible, hackingXp }) {
  const palier = getPalierHacking(hackingXp);
  const chanceAttrape = Math.max(0.01, CHANCE_ATTRAPE + palier.malusChanceAttrape);

  const attrape = Math.random() < chanceAttrape;
  if (attrape) {
    return { attrape: true, montant: 0, amende: AMENDE_VOL_BANQUE, palier };
  }

  const pourcentage = palier.pourcentageMin + Math.random() * (palier.pourcentageMax - palier.pourcentageMin);
  const montant = Math.max(1, Math.round(banqueCible * pourcentage));

  return { attrape: false, montant, amende: 0, palier };
}

module.exports = {
  CHANCE_ATTRAPE,
  AMENDE_VOL_POCHE,
  AMENDE_VOL_BANQUE,
  COOLDOWN_VOL_MS,
  XP_FORMATIONS,
  PALIERS_HACKING,
  getPalierHacking,
  tenterVolPoche,
  tenterVolBanque,
};
