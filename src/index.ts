// deno-lint-ignore-file
import {
    Client,
    IntentsBitField,
    ActivityType,
    SlashCommandBuilder,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    ModalBuilder,
    TextInputStyle,
    TextInputBuilder,
    GuildMemberRoleManager,
    TextChannel,
} from "npm:discord.js";
import axios from "npm:axios";

import { load } from "https://deno.land/std@0.219.0/dotenv/mod.ts";


await load({export: true});

const client = new Client({
    intents: [IntentsBitField.Flags.Guilds],
});

interface clouddata {
    user: string;
    verb: string;
    name: string;
    value: string;
    timestamp: number;
}

const getRamdomInt = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min) + min);
}

client.on("ready", () => {
    console.log(`Logged in as ${client.user?.tag}`);
    client.application?.commands.set([
        new SlashCommandBuilder()
            .setName("authcreate")
            .setDescription("認証埋め込みの作成を行います。")
            .addChannelOption((option) =>
                option
                    .setName("channel")
                    .setRequired(false)
                    .setDescription("チャンネルを選択してください")
            ),
    ]);
    setInterval(async () => {
        client.user?.setPresence({
            activities: [
                {
                    name: `${client.ws.ping} ms | Deno ${Deno.version.deno}`,
                    type: ActivityType.Watching,
                },
            ],
            status: "dnd",
        });
    }, 1000);
});

client.on("interactionCreate", async (i) => {
    if (i.isChatInputCommand()) {
        if (i.commandName === "authcreate") {
            if (!i.memberPermissions?.has("Administrator")) return;
            const embed = new EmbedBuilder()
                .setTitle("Scratch認証")
                .setDescription(
                    "下の「認証」ボタンを押して、ScratchのアカウントとDiscordアカウントの紐付けを開始してください。"
                )
                .setColor("Green");
            const button = new ButtonBuilder()
                .setCustomId("start")
                .setLabel("認証")
                .setStyle(ButtonStyle.Success);
            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);
            i.reply({ embeds: [embed], components: [row] });
        }
    }
    if (i.isButton()) {
        if (i.customId.startsWith("auth_")) {
            let uuid = i.customId.slice(5, 15), scratchId = i.customId.slice(16);
            await i.deferReply({
                ephemeral: true,
            });
            const { data } = await axios({
                url: `https://clouddata.scratch.mit.edu/logs?projectid=${Deno.env.get("PROJECT_ID")}&limit=40&offset=0`,
                responseType: "json",
                method: "get",
            });
            if (data.find((elem: clouddata) =>
                elem.value === uuid &&
                elem.user === scratchId
            )) {
                i.followUp("認証が完了しました。");
                if (i.channel?.isTextBased()) {
                    (i.member?.roles as GuildMemberRoleManager).add(Deno.env.get("ROLE_ID") as string);
                    const embed = new EmbedBuilder()
                        .setTitle("認証完了")
                        .setColor("Green")
                        .addFields(
                            { name: "scratchユーザ名", value: `[${scratchId}](https://scratch.mit.edu/users/${scratchId})` },
                            { name: "Discordユーザ名", value: `${i.user?.tag}(<@!${i.user?.id}>)` },
                            { name: "DiscordユーザID", value: i.user?.id},
                            { name: "検証用ID", value: uuid },
                            { name: "認証日時", value: new Date().toLocaleString() },
                        )
                    const channel = i.guild?.channels.cache.get(Deno.env.get("LOG_CHANNEL_ID") as string) as TextChannel;
                    if(channel && channel.isTextBased()) {
                        channel.send({ embeds: [embed] });
                    }
                }
            } else {
                console.log(data, uuid, scratchId);
                i.followUp("認証に失敗しました。ユーザー名が正しいかどうかを確認してください。");
            }
        }
        if (i.customId === "start") {
            const modal = new ModalBuilder().setCustomId("auth").setTitle("scratch認証")
            const username_input = new TextInputBuilder()
                .setCustomId('username')
                .setLabel("Scratchのユーザー名を入力してください")
                .setStyle(TextInputStyle.Short);
            const username_row = new ActionRowBuilder<TextInputBuilder>().addComponents(username_input);
            modal.addComponents(username_row);
            await i.showModal(modal);
            // await i.deferReply({ ephemeral: true });
            // i.user?.send("あなたのScratchアカウントを入力してください。")
            //     .then(async (dm) => {
            //         await i.followUp("DMを送信しました。");
            //         const collector = dm.channel?.createMessageCollector({
            //             filter: (m) => m.author.id === i.user?.id,
            //             time: 60000, // 60s
            //         });
            //         let scratchId: string = "", uuid: string = "";
            //         collector?.on("collect", async (m) => {
            //             console.log(`content: ${m.content}`);
            //             const res = await m.channel.send("確認中です...");
            //             axios({
            //                 url: `https://api.scratch.mit.edu/users/${encodeURIComponent(m.cleanContent)}`,
            //                 responseType: "json",
            //                 method: "get",
            //             }).then(() => {
            //                 scratchId = m.cleanContent, uuid = `${getRamdomInt(1e9, 1e10 - 1).toString()}`;
            //                 console.log(scratchId);
            //                 const embed = new EmbedBuilder()
            //                     .setTitle("認証コード")
            //                     .setDescription(`\`\`\`\n${uuid}\n\`\`\``)
            //                     .setColor("Green");
            //                 const auth = new ButtonBuilder()
            //                     .setCustomId("auth")
            //                     .setLabel("プロジェクトに入力しました")
            //                     .setStyle(ButtonStyle.Success);
            //                 const row = new ActionRowBuilder<ButtonBuilder>().addComponents(auth);
            //                 res.edit({
            //                     content: `ユーザー名の確認ができました。\n次に、下のコード(\`XXXXXXXXX\`形式)を、 https://scratch.mit.edu/projects/${process.env.PROJECT_ID}/fullscreen/ に入力してください。`,
            //                     embeds: [embed],
            //                     components: [row],
            //                 });
            //                 collector?.stop();
            //                 return handleButton(res);
            //             }).catch((e) => {
            //                 console.log(e);
            //             });
            //         });
            //         collector?.on("end", (collected) => {
            //             i.user?.send("終了しました。");
            //         });
            //         const handleButton = async (message: Message) => {
            //             const collector = message.createMessageComponentCollector();
            //             collector.on("collect", async (i) => {
            //                 await i.deferReply();
            //                 const { data } = await axios({
            //                     url: `https://clouddata.scratch.mit.edu/logs?projectid=${process.env.PROJECT_ID}&limit=40&offset=0`,
            //                     responseType: "json",
            //                     method: "get",
            //                 });
            //                 console.log(data);
            //                 if (data.find((elem: clouddata) =>
            //                     elem.value === uuid &&
            //                     elem.user === scratchId
            //                 )) {
            //                     i.followUp("認証が完了しました。");
            //                     // i.user?.roles.add(process.env.ROLE_ID);
            //                     console.log(i.member?.roles);
            //                 } else {
            //                     i.followUp("認証に失敗しました。");
            //                 }
            //             });
            //         };
            //     }).catch((e) => {
            //         if (e.toString().includes("Cannot send messages to this user"))
            //             return i.followUp("DMの送信ができません。DM設定を変更してください。");
            //     });
        }
    }
    if (i.isModalSubmit()) {
        if (i.customId === "auth") {
            let scratchId: string = i.fields.getTextInputValue("username");
            let uuid: string = getRamdomInt(1e9, 1e10 - 1).toString();
            await i.deferReply({ ephemeral: true });
            axios({
                url: `https://api.scratch.mit.edu/users/${encodeURIComponent(scratchId)}`,
                responseType: "json",
                method: "get",
            }).then(() => {
                const embed = new EmbedBuilder()
                    .setTitle("認証コード")
                    .setDescription(`\`\`\`\n${uuid}\n\`\`\``)
                    .setColor("Green");
                const auth = new ButtonBuilder()
                    .setCustomId("auth_" + uuid + "_" + scratchId)
                    .setLabel("プロジェクトに入力しました")
                    .setStyle(ButtonStyle.Success);
                const row = new ActionRowBuilder<ButtonBuilder>().addComponents(auth);
                i.editReply({
                    content: `ユーザー名の確認ができました。\n次に、下のコード(\`XXXXXXXXX\`形式)を、 https://scratch.mit.edu/projects/${Deno.env.get("PROJECT_ID")}/fullscreen/ に入力してください。`,
                    embeds: [embed],
                    components: [row],
                });
            }).catch((e) => {
                i.reply({
                    ephemeral: true,
                    content: "有効なユーザー名を入力してください"
                })
            });
        }
    }
});


client.login(Deno.env.get("TOKEN"));