const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

const TOKEN = process.env.TOKEN; // ✅ from Railway env
const FORBIDDEN_ROLE = "1453134783252271196";

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// 🔴 Ban when member joins
client.on("guildMemberAdd", async (member) => {
  if (member.roles.cache.has(FORBIDDEN_ROLE)) {
    await member.ban({ reason: "Forbidden role on join" });
  }
});

// 🔴 Ban when role is added later
client.on("guildMemberUpdate", async (oldMember, newMember) => {
  if (
    !oldMember.roles.cache.has(FORBIDDEN_ROLE) &&
     newMember.roles.cache.has(FORBIDDEN_ROLE)
  ) {
    await newMember.ban({ reason: "Forbidden role added" });
  }
});

// console.log("TOKEN VALUE:", TOKEN);
// console.log("TOKEN TYPE:", typeof TOKEN);
// console.log("TOKEN LENGTH:", TOKEN?.length);

client.login(TOKEN);


