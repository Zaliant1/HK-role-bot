import { Client, GatewayIntentBits } from 'discord.js';
const { Guilds, GuildMessages, GuildMembers } = GatewayIntentBits;


import { interactionHandler } from './interactions/interactions.js';
import { syncRestoredRolesHandler, incrementUserCountHandler } from './handlers.js';
import { HOME_GUILD_ID, ASSIGNABLE_ROLES } from './constants.js';
import { skipUser } from './utils.js';
import { targetUserReset } from '../db/helper.js';

const client = new Client({ intents: [Guilds, GuildMessages] });


client.on('clientReady', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.login(process.env.DISCORD_TOKEN || 'YOUR_BOT_TOKEN');

client.on('guildCreate', async (guild) => {
  if (guild.id !== HOME_GUILD_ID) {
    console.log(`Unauthorized guild join attempt: ${guild.name} (${guild.id}). Leaving.`);
    await guild.leave();
  }
});

client.on('guildMemberUpdate', async (oldMember, newMember) => {
  const { guild, roles: newRoles, user } = newMember;
  const { id: guildId } = guild || {};
  const { roles: oldRoles } = oldMember;
  const { id: userId, username: userName } = user || {};
  const { MUTED_ROLE } = ASSIGNABLE_ROLES;


  if (guildId !== HOME_GUILD_ID) return;

  if (!oldRoles.cache.has(MUTED_ROLE) && newRoles.cache.has(MUTED_ROLE)) {
    await targetUserReset(userId, newMember.joinedTimestamp);
  }
  await syncRestoredRolesHandler({ oldRoles, newRoles, userId, userName });
});

client.on("messageCreate", async (message) => {
  const { author, guild, member } = message;
  const { bot: isBot, id: userId, username: userName } = author;
  const { joinedTimestamp, roles } = member || {};
  const { id: guildId } = guild || {};



  if (isBot || !guild) return;
  if (guildId !== HOME_GUILD_ID) return;
  if (skipUser(member)) return;

  await incrementUserCountHandler({ userId, userName, joinedTimestamp, roles });

});


client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.guildId !== HOME_GUILD_ID) return;

  await interactionHandler(interaction);
});
export { client as discordClient };
