require("dotenv").config(); // Load environment variables
const express = require('express');
const app = express();

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

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
const { getJakartaHour } = require("./utils/jakartaHour")

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
    {
        connectionRetries: 5,
        useWSS: true
    }
);

const DEFAULT_GROUPS = [
    "lpmjualaccroblox",
    "lpmrobloxpalace"
];
let groups = [...DEFAULT_GROUPS];

const delay = (ms) => new Promise(res => setTimeout(res, ms));
const runningUsers = {};
const userStatus = {};
let delayLoop = 480000;

async function main() {
    // await client.start({
    //     phoneNumber: async () => await input.text("Nomor: "),
    //     password: async () => await input.text("Password: "),
    //     phoneCode: async () => await input.text("OTP: "),
    //     onError: (err) => console.log(err),
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

        if (msg.trim().toLowerCase() === "/stop") {
            console.log("STOP DARI:", userId);
            
            const runningList = Object.keys(runningUsers);
            
            if (runningList.length === 0) {
                await event.message.reply({ message: "⚠️ Bot tidak sedang berjalan." });
                return;
            }

            for (const rUser of runningList) {
                delete runningUsers[rUser];
                
                // Beri tahu user yang sedang menjalankan bot (jika berbeda dengan yang ngetik /stop)
                if (rUser !== userId) {
                    try {
                        await client.sendMessage(rUser, { message: `🛑 Proses bot-mu telah dihentikan oleh admin/user lain.` });
                    } catch (err) {
                        console.log("Gagal mengirim notif stop ke:", rUser);
                    }
                }
            }

            // Balas ke user yang ngetik /stop
            await event.message.reply({ message: "✅ Semua proses bot berhasil dihentikan." });
            
            console.log("RUNNING USERS:", runningUsers);
            return;
        }

        if (msg === "/groups") {
            const groupList = groups.length > 0 ? groups.map(g => `• @${g}`).join("\n") : "Tidak ada grup target.";
            await event.message.reply({
                message: `Daftar Grup Target Saat Ini:\n${groupList}`
            });
            return;
        }

        if (msg.startsWith("/group ")) {
            const args = msg.split(" ");
            const command = args[1];

            if (command === "add" && args[2]) {
                const newGroup = args[2].replace("@", "");
                if (!groups.includes(newGroup)) {
                    groups.push(newGroup);
                    await event.message.reply({ message: `✅ Grup @${newGroup} berhasil ditambahkan.` });
                } else {
                    await event.message.reply({ message: `⚠️ Grup @${newGroup} sudah ada di daftar.` });
                }
            } else if (command === "remove" && args[2]) {
                const targetGroup = args[2].replace("@", "");
                const index = groups.indexOf(targetGroup);
                if (index !== -1) {
                    groups.splice(index, 1);
                    await event.message.reply({ message: `✅ Grup @${targetGroup} berhasil dihapus.` });
                } else {
                    await event.message.reply({ message: `⚠️ Grup @${targetGroup} tidak ditemukan.` });
                }
            } else if (command === "set" && args.length > 2) {
                const newGroups = args.slice(2).map(g => g.replace("@", ""));
                groups = newGroups;
                await event.message.reply({ message: `✅ Daftar grup berhasil diperbarui:\n${groups.map(g => `• @${g}`).join("\n")}` });
            } else if (command === "reset") {
                groups = [...DEFAULT_GROUPS];
                await event.message.reply({ message: `✅ Daftar grup dikembalikan ke default:\n${groups.map(g => `• @${g}`).join("\n")}` });
            } else {
                await event.message.reply({ message: "❌ Perintah tidak valid.\n\nGunakan:\n- /group add @nama\n- /group remove @nama\n- /group set @grup1 @grup2\n- /group reset" });
            }
            return;
        }

        const match = msg.match(/t\.me\/([\w\d_]+)\/(\d+)/);
        if (!match) return;

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
        const currentToken = Date.now().toString();
        runningUsers[userId] = currentToken;

        console.log("START:", userId);
        console.log("RUNNING USERS:", runningUsers);

        try {
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

            const notifiedErrors = new Set(); // Track error agar tidak spam notif ke user setiap loop

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

                    try {
                        const groupEntity = await client.getEntity(grp);
                        if (runningUsers[userId] !== currentToken) break;

                        console.log("MAU FORWARD KE:", grp);
                        await client.forwardMessages(groupEntity, {
                            messages: [messageId],
                            fromPeer: channelEntity
                        });
                        console.log("BERHASIL FORWARD KE:", grp);
                        notifiedErrors.delete(grp); // Hapus dari daftar error jika sudah berhasil
                    } catch (forwardErr) {
                        console.log(`GAGAL FORWARD KE: ${grp} | Error: ${forwardErr.message}`);

                        if (!notifiedErrors.has(grp)) {
                            let errMsg = forwardErr.message || "";
                            let userFriendlyMessage = `⚠️ Gagal forward ke grup @${grp}.\n`;

                            if (errMsg.includes("CHAT_WRITE_FORBIDDEN") || errMsg.includes("write in this chat")) {
                                userFriendlyMessage += "❌ Akun ini tidak memiliki akses untuk mengirim pesan di grup tersebut (mungkin kena mute atau ban).";
                            } else if (errMsg.includes("CHAT_GUEST_SEND_FORBIDDEN")) {
                                userFriendlyMessage += "🔒 Grup ini mengharuskan anggota untuk bergabung (JOIN) terlebih dahulu sebelum bisa mengirim pesan.";
                            } else if (errMsg.includes("Could not find the input entity") || errMsg.includes("USERNAME_NOT_OCCUPIED") || errMsg.includes("Nobody is using this username") || errMsg.includes("USERNAME_INVALID")) {
                                userFriendlyMessage += "🔍 Grup tidak ditemukan atau username tidak valid. Pastikan username grup benar dan akun ini sudah bergabung di grup tersebut.";
                            } else if (errMsg.includes("CHANNEL_PRIVATE") || errMsg.includes("ChannelPrivateError") || errMsg.includes("banned from")) {
                                userFriendlyMessage += "🚫 Grup bersifat privat atau akun ini telah dikeluarkan/diban dari grup.";
                            } else if (errMsg.includes("SLOWMODE_WAIT")) {
                                userFriendlyMessage += `⏳ Grup mengaktifkan slow mode.`;
                            } else {
                                userFriendlyMessage += `❗️ Error: ${errMsg}`;
                            }

                            // Kirim notifikasi ke user
                            try {
                                await event.message.reply({ message: userFriendlyMessage });
                                notifiedErrors.add(grp); // Tandai agar tidak dikirim berulang-ulang setiap loop
                            } catch (notifyErr) {
                                console.log("Gagal mengirim notif error ke user:", notifyErr.message);
                            }
                        }
                        // Skip ke grup berikutnya tanpa menghentikan bot
                    }

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

            try {
                await event.message.reply({ message: `❗️ Terjadi kesalahan sistem saat memproses perintah:\n${err.message}\n\nProses share dihentikan.` });
            } catch (notifyErr) {
                console.log("Gagal kirim pesan error outer:", notifyErr.message);
            }

            delete runningUsers[userId];
        }

    }, new NewMessage({ incoming: true, outgoing: true }));

    console.log("Bot siap 🔥 kirim link ke akun ini sendiri");
}
main();
