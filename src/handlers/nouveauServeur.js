const { EmbedBuilder } = require('discord.js');
const { ajouterCreateurReconnu } = require('../database');
const { nomRoleCreateur } = require('../utils/permissions');

// Associe l'ID d'un message envoyé au propriétaire à l'ID du serveur concerné,
// pour retrouver le bon contexte quand il répond (via la fonction "Répondre" de Discord).
const demandesEnAttente = new Map(); // messageId -> guildId

async function creerInvitation(guild) {
  const canaux = guild.channels.cache.filter(
    (c) => c.isTextBased() && c.viewable && c.permissionsFor(guild.members.me)?.has(['CreateInstantInvite'])
  );
  const canal = canaux.first();
  if (!canal) return null;

  try {
    const invite = await canal.createInvite({ maxAge: 0, maxUses: 0, unique: false, reason: 'Invitation pour le propriétaire du bot' });
    return `https://discord.gg/${invite.code}`;
  } catch {
    return null;
  }
}

async function obtenirOuCreerRoleCreateur(guild) {
  const nom = nomRoleCreateur();
  let role = guild.roles.cache.find((r) => r.name === nom);
  if (!role) {
    try {
      role = await guild.roles.create({
        name: nom,
        color: 0xf1c40f,
        mentionable: false,
        reason: 'Rôle Créateur créé automatiquement par le bot Banque',
      });
    } catch {
      return null;
    }
  }
  return role;
}

function extraireIds(texte) {
  const ids = new Set();
  const regexMention = /<@!?(\d{15,20})>/g;
  let m;
  while ((m = regexMention.exec(texte)) !== null) ids.add(m[1]);
  for (const morceau of texte.split(/[\s,]+/)) {
    if (/^\d{15,20}$/.test(morceau)) ids.add(morceau);
  }
  return [...ids];
}

/**
 * Appelée quand le bot rejoint un nouveau serveur : crée une invitation,
 * puis envoie un MP au propriétaire du bot pour lui demander qui sont les créateurs.
 */
async function gererNouveauServeur(guild, client) {
  const ownerId = process.env.OWNER_ID;
  if (!ownerId) return;

  let ownerUser;
  try {
    ownerUser = await client.users.fetch(ownerId);
  } catch {
    return;
  }

  const invite = await creerInvitation(guild);
  const proprietaireServeur = await guild.fetchOwner().catch(() => null);

  const embed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle(`✅ Nouveau serveur : ${guild.name}`)
    .setDescription(
      `👥 ${guild.memberCount} membres\n` +
      (invite ? `🔗 ${invite}` : '🔗 Impossible de générer une invitation (permissions manquantes).') +
      `\n👑 Propriétaire Discord du serveur : ${proprietaireServeur ? proprietaireServeur.user.tag : 'inconnu'}` +
      (proprietaireServeur ? ` (\`${proprietaireServeur.id}\`)` : '')
    )
    .addFields({
      name: '❓ Qui sont les créateurs de ce serveur ?',
      value:
        'Utilise la fonction **Répondre** de Discord sur ce message précis, en indiquant leurs ID Discord ' +
        `ou mentions (séparés par des virgules ou espaces). Ils recevront le rôle **${nomRoleCreateur()}** ` +
        'et un message de confirmation. Tape `ignorer` pour ne rien faire.',
    });

  try {
    const messageEnvoye = await ownerUser.send({ embeds: [embed] });
    demandesEnAttente.set(messageEnvoye.id, guild.id);
  } catch {
    // Le propriétaire a peut-être ses MP fermés ; rien à faire de plus.
  }
}

/**
 * Appelée sur chaque message reçu en MP du propriétaire : si c'est une réponse
 * à une demande en attente, attribue le rôle Créateur aux ID fournis.
 */
async function traiterReponseCreateurs(message) {
  if (!message.reference?.messageId) return false;
  const guildId = demandesEnAttente.get(message.reference.messageId);
  if (!guildId) return false;

  demandesEnAttente.delete(message.reference.messageId);

  const contenu = message.content.trim();
  if (contenu.toLowerCase() === 'ignorer') {
    await message.reply('👍 Compris, rien ne sera fait pour ce serveur.');
    return true;
  }

  const guild = await message.client.guilds.fetch(guildId).catch(() => null);
  if (!guild) {
    await message.reply("🚫 Je ne suis plus sur ce serveur, impossible d'attribuer le rôle.");
    return true;
  }

  const ids = extraireIds(contenu);
  if (ids.length === 0) {
    await message.reply("🚫 Je n'ai trouvé aucun ID Discord valide dans ta réponse.");
    return true;
  }

  const role = await obtenirOuCreerRoleCreateur(guild);
  if (!role) {
    await message.reply(
      `🚫 Je n'ai pas réussi à créer/trouver le rôle **${nomRoleCreateur()}** sur ${guild.name} (vérifie mes permissions "Gérer les rôles").`
    );
    return true;
  }

  const reussis = [];
  const echoues = [];

  for (const id of ids) {
    try {
      const membre = await guild.members.fetch({ user: id, force: true });
      await membre.roles.add(role);
      ajouterCreateurReconnu(guild.id, id);
      reussis.push(membre.user.username);

      try {
        await membre.send(
          `🎉 **Bravo !** Tu as été reconnu comme l'un des créateurs de **${guild.name}**.\n` +
          `Tu as maintenant accès au panel \`/createur-panel\` avec des droits d'administration limités sur ce serveur.`
        );
      } catch {
        // MP fermés, tant pis, le rôle est quand même attribué.
      }
    } catch (error) {
      console.error(`Impossible de trouver/attribuer le rôle à ${id} sur ${guild.name} :`, error.message);
      echoues.push(id);
    }
  }

  let recap = '';
  if (reussis.length > 0) recap += `✅ Rôle **${nomRoleCreateur()}** attribué à : ${reussis.join(', ')}\n`;
  if (echoues.length > 0) recap += `⚠️ Introuvables sur ${guild.name} : ${echoues.join(', ')}`;

  await message.reply(recap || 'Aucune action effectuée.');
  return true;
}

module.exports = { gererNouveauServeur, traiterReponseCreateurs };
