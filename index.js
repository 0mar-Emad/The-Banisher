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
const WARNING_TIME = 600_000; // 10min seconds

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// helper
function hasRole(member, roleId) {
  return member.roles.cache.has(roleId);
}

async function warnAndMaybeBan(member) {
  const hasForbidden = hasRole(member, FORBIDDEN_ROLE);
  const hasSafe = hasRole(member, SAFE_ROLE);

  // no forbidden → do nothing
  if (!hasForbidden) return;

  // ❌ no safe role → instant ban
  if (!hasSafe) {
    await member.ban({ reason: "Forbidden role without safe role" });
    return;
  }

  // ⚠️ has safe role → warn first
  try {
    await member.send(
      `⚠️ **Warning**\n\nYou say you're irreligious aka kafir in **${member.guild.name}** even though you have muslim role.\n` +
      `you have to remove it within ${WARNING_TIME / 1000} seconds or you will be banned.`
    );
  } catch {
    console.log(`Could not DM ${member.user.tag}`);
  }

  // wait
  setTimeout(async () => {
    try {
      const refreshed = await member.guild.members.fetch(member.id);

      // if still has forbidden role → ban
      if (hasRole(refreshed, FORBIDDEN_ROLE)) {
        await refreshed.ban({
          reason: "Forbidden role not removed after warning"
        });
      }
    } catch (err) {
      console.error("Post-warning check failed:", err.message);
    }
  }, WARNING_TIME);
}

// 🔴 On join
client.on("guildMemberAdd", async (member) => {
  await warnAndMaybeBan(member);
});

// 🔴 On role update
client.on("guildMemberUpdate", async (oldMember, newMember) => {
  const gainedForbidden =
    !oldMember.roles.cache.has(FORBIDDEN_ROLE) &&
     newMember.roles.cache.has(FORBIDDEN_ROLE);

  if (gainedForbidden) {
    await warnAndMaybeBan(newMember);
  }
});

// console.log("TOKEN VALUE:", TOKEN);
// console.log("TOKEN TYPE:", typeof TOKEN);
// console.log("TOKEN LENGTH:", TOKEN?.length);

client.login(TOKEN);






