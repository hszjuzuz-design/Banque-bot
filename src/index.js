require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection, Partials, REST, Routes } = require('discord.js');
const { ouvrirModal: ouvrirModalCreateur, traiterModal: traiterModalCreateur } = require('./handlers/createurHandler');
const {
  selectionnerServeur,
  retourMenuServeurs,
  ouvrirActionModal,
  traiterActionModal,
  envoyerPanelInitial,
} = require('./handlers/ownerHandler');
const { gererNouveauServeur, traiterReponseCreateurs } = require('./handlers/nouveauServeur');
const { reclamerQuete } = require('./handlers/queteHandler');
const { selectionnerArticle, acheterViaBoutique } = require('./handlers/boutiqueHandler');
const { selectionnerMetier } = require('./handlers/metiersHandler');
const { surveillerAjoutRoleCreateur } = require('./handlers/roleCreateurHandler');
const { estProprietaire } = require('./utils/permissions');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers, // nécessaire pour détecter l'attribution du rôle Créateur
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent, // nécessaire pour lire le message secret et les réponses en MP
  ],
  partials: [Partials.Channel, Partials.Message], // requis pour recevoir des messages/interactions en MP
});
client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
}

async function deployerCommandesSurGuilde(rest, commandsData, guildId) {
  try {
    await rest.put(Routes.applicationGuildCommands(client.user.id, guildId), { body: commandsData });
    return true;
  } catch (error) {
    console.error(`⚠️ Échec du déploiement des commandes sur le serveur ${guildId} :`, error.message);
    return false;
  }
}

async function deployerCommandes() {
  const rest = new REST().setToken(process.env.DISCORD_TOKEN);
  const commandsData = [...client.commands.values()].map((c) => c.data.toJSON());

  let reussies = 0;
  for (const guild of client.guilds.cache.values()) {
    const ok = await deployerCommandesSurGuilde(rest, commandsData, guild.id);
    if (ok) reussies++;
  }
  console.log(`✅ Commandes slash déployées sur ${reussies}/${client.guilds.cache.size} serveur(s).`);
}

client.once('ready', async () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);
  console.log(`🏦 Banque prête sur ${client.guilds.cache.size} serveur(s).`);
  await deployerCommandes();
});

// --- Nouveau serveur : invitation + demande d'identification des créateurs en MP ---
client.on('guildCreate', async (guild) => {
  try {
    const rest = new REST().setToken(process.env.DISCORD_TOKEN);
    const commandsData = [...client.commands.values()].map((c) => c.data.toJSON());
    await deployerCommandesSurGuilde(rest, commandsData, guild.id);
    await gererNouveauServeur(guild, client);
  } catch (error) {
    console.error("Erreur lors de la gestion d'un nouveau serveur :", error);
  }
});

// --- Messages privés du propriétaire : commande secrète + réponses d'identification ---
client.on('guildMemberUpdate', async (oldMember, newMember) => {
  try {
    await surveillerAjoutRoleCreateur(oldMember, newMember);
  } catch (error) {
    console.error('Erreur guildMemberUpdate (rôle Créateur) :', error);
  }
});

client.on('messageCreate', async (message) => {
  try {
    if (message.author.bot) return;
    if (message.guild) return; // uniquement en message privé
    if (!estProprietaire(message.author.id)) return;

    // Réponse à une demande "qui sont les créateurs de ce serveur ?"
    const traite = await traiterReponseCreateurs(message);
    if (traite) return;

    // Commande cachée : jamais un slash command, donc invisible dans le picker "/"
    const declencheur = (process.env.OWNER_PANEL_TRIGGER || '!panel').toLowerCase();
    if (message.content.trim().toLowerCase() === declencheur) {
      await envoyerPanelInitial(message.channel, client);
    }
  } catch (error) {
    console.error('Erreur messageCreate (MP propriétaire) :', error);
  }
});

async function repondreErreur(interaction, erreur, contexte) {
  console.error(`Erreur (${contexte}) :`, erreur);
  const message = { content: '⚠️ Une erreur est survenue.', ephemeral: true };
  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(message);
    } else {
      await interaction.reply(message);
    }
  } catch {
    // L'interaction a peut-être expiré, on ignore.
  }
}

client.on('interactionCreate', async (interaction) => {
  try {
    // --- Slash commands ---
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      await command.execute(interaction);
      return;
    }

    // --- Boutons ---
    if (interaction.isButton()) {
      const id = interaction.customId;

      if (id === 'createur_give' || id === 'createur_take' || id === 'createur_view') {
        await ouvrirModalCreateur(interaction);
        return;
      }

      if (id.startsWith('quete_reclamer_')) {
        await reclamerQuete(interaction);
        return;
      }

      if (id.startsWith('boutique_acheter_')) {
        await acheterViaBoutique(interaction);
        return;
      }

      if (id === 'owner_back') {
        await retourMenuServeurs(interaction);
        return;
      }

      if (id.startsWith('owner_')) {
        await ouvrirActionModal(interaction);
        return;
      }

      return;
    }

    // --- Menus déroulants ---
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'owner_select_guild') {
        await selectionnerServeur(interaction);
        return;
      }
      if (interaction.customId === 'boutique_select') {
        await selectionnerArticle(interaction);
        return;
      }
      if (interaction.customId === 'metiers_select') {
        await selectionnerMetier(interaction);
        return;
      }
      return;
    }

    // --- Modals ---
    if (interaction.isModalSubmit()) {
      const id = interaction.customId;

      if (id.startsWith('createur_') && id.endsWith('_modal')) {
        await traiterModalCreateur(interaction);
        return;
      }

      if (id.startsWith('ownermodal_')) {
        await traiterActionModal(interaction);
        return;
      }

      return;
    }
  } catch (error) {
    await repondreErreur(interaction, error, interaction.customId || interaction.commandName);
  }
});

client.login(process.env.DISCORD_TOKEN);
