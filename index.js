const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

const TOKEN = process.env.TOKEN;

// 🔴 ROLE IDS
const FORBIDDEN_ROLE = "1453134783252271196";
const SAFE_ROLE = "1249806993401577504";

// ⏳ 10 minutes (milliseconds)
const WARNING_TIME = 600_000;

// Track users with pending bans
const pendingWarnings = new Map();

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// ================= HELPERS =================

function hasRole(member, roleId) {
  return member.roles.cache.has(roleId);
}

async function handleForbiddenRole(member) {
  // 🔄 ALWAYS fetch fresh data (prevents false bans)
  const freshMember = await member.guild.members.fetch(member.id);

  const hasForbidden = hasRole(freshMember, FORBIDDEN_ROLE);
  const hasSafe = hasRole(freshMember, SAFE_ROLE);

  // no forbidden → nothing to do
  if (!hasForbidden) return;

  // ❌ no safe role → instant ban
  if (!hasSafe) {
    await freshMember.ban({
      reason: "Forbidden role without safe role"
    });
    return;
  }

  // already warned → do nothing
  if (pendingWarnings.has(freshMember.id)) return;

  // ⚠️ warn user
  try {
    await freshMember.send(
      `⚠️ **Warning**\n\nYou say you're irreligious aka kafir in **${member.guild.name}** even though you have muslim role.\n` +
      `you have to remove it within ${WARNING_TIME / 1000} seconds or you will be banned.`
    );
  } catch {
    console.log(`Could not DM ${freshMember.user.tag}`);
  }

  // ⏳ schedule ban
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

// ================= EVENTS =================

// 🔴 On member join
client.on("guildMemberAdd", async (member) => {
  await handleForbiddenRole(member);
});

// 🔴 On role update
client.on("guildMemberUpdate", async (oldMember, newMember) => {
  const hadForbidden = oldMember.roles.cache.has(FORBIDDEN_ROLE);
  const hasForbidden = newMember.roles.cache.has(FORBIDDEN_ROLE);

  // Forbidden role added
  if (!hadForbidden && hasForbidden) {
    await handleForbiddenRole(newMember);
  }

  // Forbidden role removed → cancel pending ban
  if (hadForbidden && !hasForbidden) {
    const timeout = pendingWarnings.get(newMember.id);
    if (timeout) {
      clearTimeout(timeout);
      pendingWarnings.delete(newMember.id);
    }
  }
});

client.login(TOKEN);
