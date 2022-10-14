const { XummSdk } = require("xumm-sdk");
const Sdk = new XummSdk(
    "cc0b7438-9fa8-4f46-a39b-0c36af5365c3",
    "2182bf9e-4fe2-40a6-b104-ac9c3769d287"
);
const {
  Client,
  Intents,
  Interaction,
  MessageEmbed,
  MessageAttachment,
} = require("discord.js");
const { token } = require("./config.json");
const xrpl = require("xrpl");
const lodash = require("lodash");
let payloadqr = "";
let payloadurl = "";
let subscription = "";
let signedtof = false;
let usertag = "";
let junkbal = "";
let junklookup = "";
let account = "";
let rolecontent = "You Need to Run /verify First";

const applicationCommands = [
  {
    name: "verify",
    description: "Authenticates Users",
  },
  {
    name: "assign",
    description: "Assign your roles, after you have ran /verify.",
  },
];

const main = async () => {
  const hex = Buffer.from(usertag).toString("hex").toUpperCase();
  const request = {
    TransactionType: "SignIn",
    Memo: [
      {
        Memo: { MemoData: hex },
      },
    ],
  };

  //create and subscribe to XUMM payload
  subscription = await Sdk.payload
    .createAndSubscribe(request, (event) => {
      // console.log('New payload event', event.data)

      if (Object.keys(event.data).indexOf("signed") > -1) {
        return event.data;
      }
      payloadqr = subscription.created.refs.qr_png;
      payloadurl = subscription.created.next.always;
    })
    .catch((error) => {
      console.error(error);
    });

  const resolveData = await subscription.resolved;
  if (resolveData.signed == false) {
    signedtof = false;
  } else if (resolveData.signed == true) {
    signedtof = true;
    // Lookup wallet address
    const result = await Sdk.payload
      .get(resolveData.payload_uuidv4)
      .catch((error) => {
        console.error(error);
      });
    account = result.response.account;
    //connect to XRPL and check balance
    const SERVER_URL = "wss://s2.ripple.com/";
    const xrplclient = new xrpl.Client(SERVER_URL);
    await xrplclient.connect().catch((error) => {
      console.error(error);
    });
    const response = await xrplclient
      .request({
        command: "account_lines",
        account: account,
      })
      .catch((error) => {
        console.error(error);
      });
    // console.log(response)
    //console.log(response.result.lines)

    junklookup = lodash.filter(response.result.lines, {
        account: "r4pDJ7bT1rANe9nAdFR9pyVRwtJZQUEFpj",
    });
    junkbal = junklookup[0].balance;

    xrplclient.disconnect();
    // console.log(account)
  }
};

// Create a new client instance
const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
});

// When the client is ready, run this code (only once)
client.once("ready", async () => {
  console.log("Bot is Ready!");

    const guildId = "696909323292508241";
  const guild = client.guilds.cache.get(guildId);
  
	let commands = client.application.commands
  if (guild) {
    commands = guild.commands;
  }

  if (commands) {
    const currentCommands = await commands.fetch();
		await Promise.all(currentCommands.map((command) => commands.delete(command)))
		await Promise.all(applicationCommands.map((command) => commands.create(command)))
  }
});

client.on("interactionCreate", async (Interaction) => {
    main();
    
  const authEmbed = new MessageEmbed()
    .setColor("#E80AB0")
    .setTitle("AUTH LINK - Click here for mobile")
    .setURL(`${payloadurl}`)
    .setDescription(
      "Verify your XUMM Wallet to unlock exclusive Discord Server Roles! *The last wallet you sign, will the be roles you are assigned"
    )
    .setImage(`${payloadqr}`)
    .setTimestamp()
    ;

  if (!Interaction.isCommand()) {
    return;
  }
  const { commandName, options } = Interaction;

    if (signedtof === true) {
        if (junkbal >= 1) { // Verified role
            let verifiedrole = Interaction.guild.roles.cache.get("919291566504427561");
            Interaction.member.roles.add(verifiedrole);
        }
        console.log(Interaction.member.user.tag + "has been verified!, they hold: " + junkbal + " junk");

    //reset values
    signedtof = false;
    junkbal = 0;
    rolecontent = "Roles successfully assigned";
  } else if (signedtof === false) {
    rolecontent = "Please run /verify first";
    signedtof = false;
    junkbal = 0;
  }

  if (commandName === "verify") {
     await Interaction.reply({
      content: "\u200B",
      ephemeral: true,
      embeds: [authEmbed],
    });

    await Interaction.followUp({
      content:
        "Please run /assign to receive your qualifying roles. After signing the XUMM transaction.",
      ephemeral: true,
    });
  }
  if (commandName === "assign") {
    Interaction.reply({
      content: `${rolecontent}`,
      ephemeral: true,
    });
  }
});
rolecontent = "Please run /verify first";
// Login to Discord with your client's token
client.login(token);
