require("dotenv").config();
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Bot is active!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Keep-alive server is running on port ${PORT}`);
});

const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { NewMessage } = require("telegram/events");
const input = require("input");
const fs = require("fs");
const {getJakartaHour} = require("./utils/jakartaHour")

const apiId = Number(process.env.API_ID);
const apiHash = process.env.API_HASH;

console.log("API_ID:", process.env.API_ID ? "ADA" : "KOSONG");
console.log("API_HASH:", process.env.API_HASH ? "ADA" : "KOSONG");
console.log("SESSION:", process.env.SESSION ? "ADA" : "KOSONG");
console.log("USER_IDS:", process.env.USER_IDS ? "ADA" : "KOSONG");

const sessionData = process.env.SESSION || "";

const client = new TelegramClient(
    new StringSession(sessionData),
    apiId,
    apiHash,
    { connectionRetries: 5 }
);

const groups = [
    "adoptmeindooooo",
    "adoptmeindosuper",
    "lpmAdoptmeindon"
];

const delay = (ms) => new Promise(res => setTimeout(res, ms));
const runningUsers = {};
const userStatus = {};
let delayLoop = 480000;

async function main() {
    // await client.start({
    //     phoneNumber: async () => await input.text("Nomor: "),
    //     password: async () => await input.text("Password: "),
    //     phoneCode: async () => await input.text("OTP: "),
    // });
    // console.log(client.session.save());
    console.log("Session exists:", fs.existsSync("session.txt"));
    console.log("Session length:", sessionData.length);
    console.log("ready")
    await client.connect(); // kalau mau login ulang ini di comment
    console.log("Client connected 🚀");
    // console.log("Me:", await client.getMe());

    console.log("Login berhasil!");

    client.addEventHandler(async (event) => {
        const sender = event.message.senderId;
        const msg = event.message.message;

        console.log("Sender ID:", sender.toString());
        const USER_IDS = (process.env.USER_IDS || "").split(",")

        if (!USER_IDS.includes(sender.toString())) return;
        
        console.log("Masuk:", msg);

        const userId = sender.toString();

        if (msg === "/status") {
            const status = userStatus[userId];
            const targetList = groups.map(g => `• ${g}`).join("\n");
            if (!runningUsers[userId]) {
                await event.message.reply({
                    message: `Bot off
                    ⏱  Delay: ${delayLoop / 60000} menit
                    🔗 Source: ${status?.source || "-"}
                    👥 Target: ${targetList}
                    👤 Running : ${Object.keys(runningUsers).length} user`
                })
                return;
            }
            await event.message.reply({
        message: `Bot on
        ⏱  Delay: ${delayLoop / 60000} menit
        🔗 Source: ${status?.source || "-"}
        👥 Target: ${targetList}
        👤 Running : ${Object.keys(runningUsers).length} user`
        });
            return;
        }

        if (msg.startsWith("/delay ")) {
            if (userId !== process.env.OWNER_ID) {
                console.log("Bukan owner");
                return;
            }
            const menit = parseInt(msg.split(" ")[1]);
            if (isNaN(menit)) return;
            delayLoop = menit * 60000;
            await event.message.reply({
                message: `Delay diubah menjadi ${menit} menit`
            });
            return;
        }

        if (msg === "/stop") {
            console.log("STOP DARI:", userId);
            delete runningUsers[userId];
            console.log("RUNNING USERS:", runningUsers);
            return;
        }

        const jakartaHour = getJakartaHour()  
        
        if (jakartaHour >= 0 && jakartaHour < 7) {
            await event.message.reply({
                message: "Bot sedang offline otomatis (00:00 - 07:00 WIB). Silakan kirim link lagi setelah jam 07:00."
            });
            return;
        }

        if (runningUsers[userId]) {
            console.log("Loop sudah berjalan untuk:", userId);
            return;
        }

        if (!msg.includes("t.me")) return;
        const currentToken = Date.now().toString();
        runningUsers[userId] = currentToken;

        console.log("START:", userId);
        console.log("RUNNING USERS:", runningUsers);

        try {
            const match = msg.match(/t\.me\/([\w\d_]+)\/(\d+)/);
            if (!match) {
                delete runningUsers[userId];
                return;
            }
    
            const channel = match[1];
            const messageId = parseInt(match[2]);

            console.log("channel:", channel);
            console.log("id:", messageId);

            userStatus[userId] = {
                source: msg,
                channel,
                messageId,
                startedAt: new Date()
            };

            const channelEntity = await client.getEntity(channel);

            while (runningUsers[userId] === currentToken) {
                const jakartaHour = getJakartaHour()
                
                if (jakartaHour >= 0 && jakartaHour < 7) {
                    delete runningUsers[userId];
                    await event.message.reply({
                        message: "Bot berhenti otomatis karena sudah masuk jam offline (00:00 - 07:00 WIB)."
                    });
                    break;
                }
                for (const grp of groups) {
                    if (runningUsers[userId] !== currentToken) {
                        console.log("STOP saat proses forward");
                        break;
                    }
                    const groupEntity = await client.getEntity(grp);
                    if (runningUsers[userId] !== currentToken) break;
                    
                    console.log("MAU FORWARD KE:", grp);
                    await client.forwardMessages(groupEntity, {
                        messages: [messageId],
                        fromPeer: channelEntity
                    });
                    console.log("BERHASIL FORWARD KE:", grp);

                    if (runningUsers[userId] !== currentToken) break;
                    await delay(25000);
                }
                if (runningUsers[userId] !== currentToken) break;

                for (let i = 0; i < delayLoop / 60000; i++) {
                    if (runningUsers[userId] !== currentToken) break;

                    await delay(60000);

                    if (runningUsers[userId] !== currentToken) break;

                    const jakartaHour = getJakartaHour()

                    if (jakartaHour >= 0 && jakartaHour < 7) {
                        delete runningUsers[userId];
                        console.log("STOP OTOMATIS JAM 00");
                        await event.message.reply({
                            message: "Bot berhenti otomatis karena sudah jam 12 malam dan akan kembali share di jam 7 pagi!"
                        });
                        break;
                    }
                    }
            }
            } catch (err) {
                console.log("ERROR USER:", userId);
                console.log(err);
                delete runningUsers[userId];
            }

    }, new NewMessage({ incoming: true, outgoing: true }));

    console.log("Bot siap 🔥 kirim link ke akun ini sendiri");
}
main();