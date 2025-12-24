const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

const TOKEN = process.env.TOKEN;

const FORBIDDEN_ROLE = "1453134783252271196";
const SAFE_ROLE = "1249806993401577504";

const WARNING_TIME = 600_000;

const pendingWarnings = new Map();

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

function hasRole(member, roleId) {
  return member.roles.cache.has(roleId);
}

async function handleForbiddenRole(member) {
  
  const freshMember = await member.guild.members.fetch(member.id);

  const hasForbidden = hasRole(freshMember, FORBIDDEN_ROLE);
  const hasSafe = hasRole(freshMember, SAFE_ROLE);

  if (!hasForbidden) return;

  if (!hasSafe) {
    await freshMember.ban({
      reason: "Forbidden role without safe role"
    });
    return;
  }

  if (pendingWarnings.has(freshMember.id)) return;

  try {
    await freshMember.send(
      `⚠️ **Warning**\n\nYou say you're irreligious aka kafir in **${member.guild.name}** even though you have muslim role.\n` +
      `you have to remove it within ${WARNING_TIME / 1000} seconds or you will be banned.`
    );
  } catch {
    console.log(`Could not DM ${freshMember.user.tag}`);
  }

  const timeout = setTimeout(async () => {
    try {
      const refreshed = await freshMember.guild.members.fetch(freshMember.id);

      if (hasRole(refreshed, FORBIDDEN_ROLE)) {
        await refreshed.ban({
          reason: "Forbidden role not removed after warning"
        });
      }
    } catch (err) {
      console.error("Post-warning check failed:", err.message);
    } finally {
      pendingWarnings.delete(freshMember.id);
    }
  }, WARNING_TIME);

  pendingWarnings.set(freshMember.id, timeout);
}


client.on("guildMemberAdd", async (member) => {
  await handleForbiddenRole(member);
});

client.on("guildMemberUpdate", async (oldMember, newMember) => {
  const hadForbidden = oldMember.roles.cache.has(FORBIDDEN_ROLE);
  const hasForbidden = newMember.roles.cache.has(FORBIDDEN_ROLE);

  if (!hadForbidden && hasForbidden) {
    await handleForbiddenRole(newMember);
  }

  if (hadForbidden && !hasForbidden) {
    const timeout = pendingWarnings.get(newMember.id);
    if (timeout) {
      clearTimeout(timeout);
      pendingWarnings.delete(newMember.id);
    }
  }
});

client.login(TOKEN);
