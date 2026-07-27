const {
  getCompte,
  updateCash,
  setLastWork,
  setLastDaily,
  setPv,
  ajouterReputation,
  enregistrerGainTravail,
  getTresor,
  retirerTresor,
  crediterTousLesJoueurs,
  ajouterReputationSelonMetierActuel,
  addInventaire,
} = require('./database');
const { getMetier } = require('./metiers');
const { formatMontant } = require('./utils/format');

// cooldown en heures, croissant avec la rareté
const CAPACITES = {
  // --- Très courant (2h) ---
  caissier: {
    nom: 'Caisse arrondie', emoji: '🛒', cooldownHeures: 2, cibleRequise: false,
    description: 'Tu arrondis discrètement la caisse en ta faveur.',
    executer: (ctx) => {
      updateCash(ctx.userId, ctx.guildId, 75);
      return `🛒 Tu arrondis la caisse : **+${formatMontant(75)}**.`;
    },
  },
  serveur: {
    nom: 'Pourboire partagé', emoji: '🍽️', cooldownHeures: 2, cibleRequise: true,
    description: 'Tu partages un généreux pourboire avec un joueur.',
    executer: (ctx) => {
      updateCash(ctx.cibleId, ctx.guildId, 75);
      return `🍽️ Tu offres un pourboire de **${formatMontant(75)}** à ${ctx.cibleUser.username}.`;
    },
  },
  ouvrier: {
    nom: 'Coup de main', emoji: '🧱', cooldownHeures: 2, cibleRequise: true,
    description: 'Tu aides un collègue à finir plus vite : son cooldown de travail est réinitialisé.',
    executer: (ctx) => {
      setLastWork(ctx.cibleId, ctx.guildId, 0);
      return `🧱 Tu donnes un coup de main à ${ctx.cibleUser.username} : son cooldown de \`/travailler\` est réinitialisé !`;
    },
  },
  electricien: {
    nom: 'Coupure ciblée', emoji: '🔌', cooldownHeures: 2, cibleRequise: true,
    description: "Tu coupes le courant chez un joueur, retardant son prochain travail d'une heure.",
    executer: (ctx) => {
      setLastWork(ctx.cibleId, ctx.guildId, Date.now());
      return `🔌 Tu coupes le courant chez ${ctx.cibleUser.username} : son cooldown de \`/travailler\` repart de zéro !`;
    },
  },
  enseignant: {
    nom: 'Leçon particulière', emoji: '📚', cooldownHeures: 2, cibleRequise: true,
    description: 'Tu donnes un cours particulier qui améliore la réputation professionnelle de la cible.',
    executer: (ctx) => {
      const cibleCompte = getCompte(ctx.cibleId, ctx.guildId);
      ajouterReputation(ctx.cibleId, ctx.guildId, cibleCompte.metier_actuel || 'caissier', 5);
      return `📚 Tu donnes une leçon à ${ctx.cibleUser.username} : +5 points de réputation dans son métier actuel.`;
    },
  },
  developpeur: {
    nom: 'Optimisation', emoji: '💻', cooldownHeures: 2, cibleRequise: false,
    description: 'Tu optimises ton quotidien : un peu de cash et de repos.',
    executer: (ctx) => {
      updateCash(ctx.userId, ctx.guildId, 150);
      const compte = getCompte(ctx.userId, ctx.guildId);
      setPv(ctx.userId, ctx.guildId, compte.pv + 15);
      return `💻 Script d'optimisation lancé : **+${formatMontant(150)}** et +15 PV.`;
    },
  },

  // --- Courant (4h) ---
  medecin_generaliste: {
    nom: 'Consultation gratuite', emoji: '🩺', cooldownHeures: 4, cibleRequise: true,
    description: 'Tu soignes entièrement un joueur, gratuitement.',
    executer: (ctx) => {
      setPv(ctx.cibleId, ctx.guildId, 100);
      return `🩺 Consultation offerte à ${ctx.cibleUser.username} : PV entièrement restaurés (100/100).`;
    },
  },
  architecte: {
    nom: 'Permis accéléré', emoji: '📐', cooldownHeures: 4, cibleRequise: false,
    description: 'Un permis approuvé en un temps record te rapporte une commission.',
    executer: (ctx) => {
      updateCash(ctx.userId, ctx.guildId, 250);
      return `📐 Permis approuvé en un temps record : **+${formatMontant(250)}** de commission.`;
    },
  },
  avocat: {
    nom: 'Recours juridique', emoji: '⚖️', cooldownHeures: 4, cibleRequise: true,
    description: "Tu obtiens gain de cause : la cible peut refaire son /daily immédiatement.",
    executer: (ctx) => {
      setLastDaily(ctx.cibleId, ctx.guildId, 0);
      return `⚖️ Recours accepté pour ${ctx.cibleUser.username} : son cooldown \`/daily\` est réinitialisé !`;
    },
  },
  ingenieur_civil: {
    nom: 'Chantier accéléré', emoji: '🏗️', cooldownHeures: 4, cibleRequise: false,
    description: 'Tu accélères ton propre chantier.',
    executer: (ctx) => {
      setLastWork(ctx.userId, ctx.guildId, 0);
      return `🏗️ Chantier accéléré : ton cooldown de \`/travailler\` est réinitialisé !`;
    },
  },

  // --- Peu courant (8h) ---
  data_scientist: {
    nom: 'Prédiction', emoji: '📊', cooldownHeures: 8, cibleRequise: true,
    description: "Tu analyses les données financières d'un joueur.",
    executer: (ctx) => {
      const cibleCompte = getCompte(ctx.cibleId, ctx.guildId);
      const total = cibleCompte.cash + cibleCompte.banque;
      return `📊 Analyse de ${ctx.cibleUser.username} : fortune totale estimée à **${formatMontant(total)}** (${formatMontant(cibleCompte.cash)} en poche, ${formatMontant(cibleCompte.banque)} en banque).`;
    },
  },
  pilote_ligne: {
    nom: 'Vol direct', emoji: '✈️', cooldownHeures: 8, cibleRequise: true,
    description: "Tu transportes 300 € vers un joueur, sans aucune taxe prélevée.",
    executer: (ctx) => {
      const compte = getCompte(ctx.userId, ctx.guildId);
      if (compte.cash < 300) {
        return `🚫 Il te faut au moins ${formatMontant(300)} en poche pour affréter ce vol.`;
      }
      updateCash(ctx.userId, ctx.guildId, -300);
      updateCash(ctx.cibleId, ctx.guildId, 300);
      return `✈️ Vol direct effectué : **${formatMontant(300)}** livrés à ${ctx.cibleUser.username}, sans taxe.`;
    },
  },
  ingenieur_ia: {
    nom: 'Script automatique', emoji: '🤖', cooldownHeures: 8, cibleRequise: false,
    description: 'Un script effectue un service de travail supplémentaire à ta place.',
    executer: (ctx) => {
      const metier = getMetier(ctx.compte.metier_actuel) || getMetier('caissier');
      enregistrerGainTravail(ctx.userId, ctx.guildId, metier.gainBase, metier.gainBase);
      return `🤖 Script exécuté : un service supplémentaire de **${metier.nom}** rapporte **${formatMontant(metier.gainBase)}**, sans consommer ton cooldown normal.`;
    },
  },
  controleur_aerien: {
    nom: 'Priorité accordée', emoji: '🛫', cooldownHeures: 8, cibleRequise: true,
    description: "Tu accordes une priorité totale à un joueur : travail et daily réinitialisés.",
    executer: (ctx) => {
      setLastWork(ctx.cibleId, ctx.guildId, 0);
      setLastDaily(ctx.cibleId, ctx.guildId, 0);
      return `🛫 Priorité accordée à ${ctx.cibleUser.username} : \`/travailler\` et \`/daily\` sont réinitialisés !`;
    },
  },

  // --- Rare (12h) ---
  horloger: {
    nom: 'Pièce de collection', emoji: '⌚', cooldownHeures: 12, cibleRequise: false,
    description: "Tu assembles une pièce d'horlogerie rare pour ta collection.",
    executer: (ctx) => {
      addInventaire(ctx.userId, ctx.guildId, 'montre_collection', 1);
      return `⌚ Tu assembles une **Montre de collection** unique, ajoutée à ton inventaire.`;
    },
  },
  demineur: {
    nom: 'Désamorçage', emoji: '💣', cooldownHeures: 12, cibleRequise: true,
    description: 'Tu désamorces une situation dangereuse pour un joueur, avec prime de risque.',
    executer: (ctx) => {
      setPv(ctx.cibleId, ctx.guildId, 100);
      updateCash(ctx.cibleId, ctx.guildId, 100);
      return `💣 Désamorçage réussi pour ${ctx.cibleUser.username} : PV restaurés + prime de risque de **${formatMontant(100)}**.`;
    },
  },
  chasseur_ouragans: {
    nom: 'Alerte météo', emoji: '🌀', cooldownHeures: 12, cibleRequise: true,
    description: "Tu déclenches une évacuation d'urgence qui soigne entièrement la cible.",
    executer: (ctx) => {
      setPv(ctx.cibleId, ctx.guildId, 100);
      return `🌀 Évacuation d'urgence pour ${ctx.cibleUser.username} : PV entièrement restaurés (100/100).`;
    },
  },

  // --- Très rare (24h) ---
  chirurgien_transplantation: {
    nom: "Greffe d'urgence", emoji: '🫀', cooldownHeures: 24, cibleRequise: true,
    description: 'Tu sauves la vie de la cible, peu importe son état.',
    executer: (ctx) => {
      setPv(ctx.cibleId, ctx.guildId, 100);
      return `🫀 Greffe d'urgence réussie sur ${ctx.cibleUser.username} : PV entièrement restaurés (100/100).`;
    },
  },
  forces_speciales: {
    nom: 'Extraction', emoji: '🎖️', cooldownHeures: 24, cibleRequise: true,
    description: "Tu extrais la cible d'une zone à risque et la remets sur pied avec une prime.",
    executer: (ctx) => {
      setPv(ctx.cibleId, ctx.guildId, 100);
      updateCash(ctx.cibleId, ctx.guildId, 200);
      return `🎖️ Extraction réussie pour ${ctx.cibleUser.username} : PV restaurés + prime de **${formatMontant(200)}**.`;
    },
  },
  chef_orchestre: {
    nom: 'Concert de gala', emoji: '🎼', cooldownHeures: 24, cibleRequise: false,
    description: 'Tu organises un concert de gala : tout le serveur touche des recettes.',
    executer: (ctx) => {
      const nb = crediterTousLesJoueurs(ctx.guildId, 50);
      return `🎼 Concert de gala donné ! **${nb} joueur(s)** du serveur reçoivent **+${formatMontant(50)}**.`;
    },
  },

  // --- Exceptionnellement rare (48h) ---
  astronaute: {
    nom: 'Retour de mission', emoji: '🧑‍🚀', cooldownHeures: 48, cibleRequise: false,
    description: 'Tu reviens de mission spatiale avec une prime exceptionnelle.',
    executer: (ctx) => {
      updateCash(ctx.userId, ctx.guildId, 3000);
      return `🧑‍🚀 Retour de mission réussi : prime exceptionnelle de **${formatMontant(3000)}** !`;
    },
  },
  prix_nobel: {
    nom: 'Prestige mondial', emoji: '🏅', cooldownHeures: 48, cibleRequise: false,
    description: 'Ton prestige rejaillit sur tout le serveur.',
    executer: (ctx) => {
      const nb = ajouterReputationSelonMetierActuel(ctx.guildId, 10);
      return `🏅 Ton prestige mondial inspire **${nb} joueur(s)** : +10 points de réputation dans leur métier actuel pour chacun.`;
    },
  },
  ambassadeur_onu: {
    nom: 'Sanctions internationales', emoji: '🕊️', cooldownHeures: 48, cibleRequise: false,
    description: "Tu imposes des sanctions économiques : une partie du Trésor du serveur (géré par le Créateur/Président) est saisie.",
    executer: (ctx) => {
      const disponible = getTresor(ctx.guildId);
      const montant = Math.min(1000, disponible);
      if (montant <= 0) {
        return '🕊️ Le Trésor du serveur est vide, aucune sanction possible pour le moment.';
      }
      retirerTresor(ctx.guildId, montant);
      updateCash(ctx.userId, ctx.guildId, montant);
      return `🕊️ Sanctions internationales appliquées : **${formatMontant(montant)}** saisis dans le Trésor du serveur et versés sur ton compte.`;
    },
  },
};

function getCapacite(metierId) {
  return CAPACITES[metierId] || null;
}

module.exports = { CAPACITES, getCapacite };
