// perintah.js

const { makeWASocket, useMultiFileAuthState, downloadMediaMessage } = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");
const event = require("./aset/event.json")
const ffmpeg = require("fluent-ffmpeg");
const config = require("./aset/config.json")
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(config.API_KEY);
const kreativ = require("./aset/kreativ.json")
const axios = require('axios');
const path = require('path');


async function handleCommand(command, m, soct, id, prefix, reply, send, groupID) {
    try {
        const ownerNumbers = config.ownerNumber;

        let remoteJidNumber;
        let groupName; // Menyimpan nama grup
        if (m.key.participant) {
            remoteJidNumber = m.key.participant.split('@')[0]; // Ambil nomor telepon dari participant jika pesan dikirim melalui grup
            const groupMetadata = await soct.groupMetadata(id).catch(() => { });
            if (groupMetadata) {
                groupName = groupMetadata.subject; // Ambil nama grup dari metadata
            }
        } else {
            remoteJidNumber = m.key.remoteJid.split('@')[0]; // Ambil nomor telepon dari remoteJid jika pesan dikirim secara pribadi
        }

        switch (command) {
            case 'ai':
                const query = m.message.conversation || m.message.extendedTextMessage.text;
                if (!query) {
                    reply("Maaf, perintah 'ai' memerlukan argumen teks.");
                    return;
                }
                const model = genAI.getGenerativeModel({ model: "gemini-pro" });
                const result = await model.generateContent(query);
                const response = await result.response;
                const textResponse = await response.text();
                reply(textResponse);
                break;
            case "tagall":
                if (ownerNumbers.includes(remoteJidNumber)) {
                    if (groupID) {
                        const groupMembers = await soct.groupMetadata(id).catch(() => { });
                        if (groupMembers) {
                            let mentions = [];
                            for (let participant of groupMembers.participants) {
                                mentions.push(participant.id);
                            }
                            await soct.sendMessage(id, { text: 'Halo semua', mentions });
                        } else {
                            reply("Gagal mengambil data anggota grup.");
                        }
                    } else {
                        reply("Perintah ini hanya bisa digunakan di dalam grup.");
                    }
                } else {
                    reply("KHUSUS ADMIN BOT GOBLOG MAU TAG ORANG SEMBARANGAN LU");
                }
                break;
            case "owner":
                if (ownerNumbers.includes(remoteJidNumber)) {
                    reply("Ini adalah perintah khusus untuk owner!");
                } else {
                    reply("Maaf, perintah ini hanya bisa dilakukan oleh owner.");
                }
                break;
            case "info":
            case "help":
                reply(`*WELCOME TO MAHCHANBOT YANG AKAN MEMBUNUH ANDA*
                
*LIST MENU COMMAND UTAMA* :
- (${prefix}info)        : Melihat daftar command yang tersedia
- (${prefix}sticker)     : Membuat stiker dari gambar yang Anda kirimkan
- (${prefix}jepanginfo)  : Menampilkan event-event Jepang di Jabodetabek
- (${prefix}welcome)     : Menampilkan kata sambutan
- (${prefix}intro)       : Menampilkan daftar intro member
- (${prefix}ai)          : Menghasilkan teks menggunakan teknologi AI dari Gemini AI
- (${prefix}owner)       : Melihat daftar list apa yang bisa owner dan admin lakukan (KUHSUS ADMIN)
- (${prefix}img)         : menambahkan w

*KETERANGAN*
Gunakan bot sesuai kebutuhan dan hindari spam. Jika ada keluhan atau pertanyaan, hubungi 085782299563 atau Fajri selaku pemilik bot.`);
                break;
            case "jepanginfo":
                let eventList = "*Daftar Event Jepang di Jabodetabek:*\n\n";
                event.forEach(event => {
                    eventList += `- ${event.name}\n`;
                    eventList += `  Tanggal: ${event.date}\n`;
                    eventList += `  Lokasi: ${event.location}\n\n`;
                });
                send(eventList);
                break;
            case "welcome":
                send(`*WELCOME TO MATSUKO COMUNITY!!*
                
Grup untuk sharing info event cosplay atau jejepangan, buat janjian cosdate atau sharing cosplay.
        
kmu join kesini udah pasti ada aturannya↓
ㅅ Saling kenal satu sama lain
ㅅ Dilarang Rasis
ㅅ Dilarang keras mengirim hal yg berbau pornografi
ㅅ Dilarang Toxic berlebihan
ㅅ Sharing sosmed kalian
ㅅ Punya attitude? di jaga yaa! 
ㅅ Saling support  
ㅅJangan bikin drama
ㅅjangan kirim sticker jomok atau berbau18+ dan LGBT
!!!jika yang melanggar akan kena warn!!!
Warn1:peringatan
Warn2:keluarkan dari group
 ❗Nama yang sudah kena warn
Warn1:
Warn2:
•catatan:berperilaku baik selama 1minggu akan mengurangi 1 warn
▼△▼△▼△▼△▼△▼△▼△
Siapa tau bisa jadi komunitas cosplay 😁🙌🏻
Join↓
discord: https://discord.com/invite/aDeNPszh
wa: https://chat.whatsapp.com/Jk6O7qvsvGOKUhnZ7HawJ4`);
                break;
            case "s":
            case "stiker":
            case "sticker":
                let mediaType;
                if (m.message.imageMessage) {
                    mediaType = 1; // Gambar
                } else if (m.message.videoMessage) {
                    mediaType = 2; // Video
                }
                if (mediaType === 9) { // Cek jika pesan berisi video
                    const buffer = await downloadMediaMessage(m, "buffer", {}, { logger: pino });
                    fs.writeFileSync("./temp/video.mp4", buffer);
                    reply("*💢💥Membuat sticker Bro sabar ya!!!!*")
                
                    const buatStiker = () => {
                        return new Promise((resolve, rejects) => {
                            ffmpeg("./temp/video.mp4")
                                .inputFormat("mp4")
                                .outputFormat("webp")
                                .addOutputOptions([
                                    "-vcodec",
                                    "libwebp",
                                    "-vf",
                                    "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse"
                                ])
                                .on("error", (err) => rejects(err))
                                .on("end", () => resolve("./temp/sticker.webp"))
                                .save("./temp/sticker.webp");
                        });
                    };
                    const stiker = await buatStiker();
                    await soct.sendMessage(id, { sticker: { url: stiker } });
                    send("Udah beres Broo nih sticker lu")
                    // Hapus file setelah stiker dibuat
                    fs.rmSync("./temp/video.mp4");
                    fs.rmSync("./temp/sticker.webp");
                } else { // Jika bukan video, buat stiker dari gambar
                    const buffer = await downloadMediaMessage(m, "buffer", {}, { logger: pino });
                    fs.writeFileSync("./temp/sticker.png", buffer);
                    reply("*💢💥Membuat sticker Bro sabar ya!!!!*")
                    const buatStiker = () => {
                        return new Promise((resolve, rejects) => {
                            ffmpeg("./temp/sticker.png")
                                .format("webp")
                                .addOutputOptions([
                                    "-vcodec",
                                    "libwebp",
                                    "-vf",
                                    "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse"
                                ])
                                .on("error", (err) => rejects(err))
                                .on("end", () => resolve("./temp/sticker.webp"))
                                .save("./temp/sticker.webp");
                        });
                    };
                    const stiker = await buatStiker();
                    await soct.sendMessage(id, { sticker: { url: stiker } });
                    send("Udah beres Broo nih sticker lu")
                    // Hapus file setelah stiker dibuat
                    fs.rmSync("./temp/sticker.png");
                    fs.rmSync("./temp/sticker.webp");
                }
                break;
            case "bot":
                send(`Halo Warga *${groupName}* saya adalah MAHCHANBOT Buatan wibu anak bangsa, di lahirkan dan di buat secara otodidak dan mandiri tanpa ada templat atau ngikutin orang lain, bot ini dibuat untuk mengayomi para wibu wibu, MAHCHAN SIAP MEMBANTU ANDA SEMUA MAAF JIKA BOT MASIH BANYAK KESALAHAN DAN FITUR NYA MASIH SEDIKIT DI KARENA KAN YANG NGEMBANGIN 1 ORANG`);
                break;
            case "intro":
                send(`*✦; W E L C O M E  N E W M E M B E R!!''*
               
 *SILAHKAN INTRO(≡^∇^≡)*
               
🦊. NAMA : 
               
🦊. GENDER : 
               
🦊. UMUR : 
               
🦊. ASAL/TEMPAT TINGGAL :  
               
🦊. COS/NPC : 
               
🦊. LINK INSTAGRAM :`);
                break;
            case "listmember":
                if (groupID) {
                    const groupMembers = await soct.groupMetadata(id).catch(() => {});
                    if (groupMembers) {
                        let memberList = "Daftar Anggota Grup:\n";
                        groupMembers.participants.forEach((participant, index) => {
                            memberList += `${index + 1}. ${participant.id.replace('@c.us', '')}\n`;
                        });
                        console.log(memberList); // Tampilkan daftar anggota grup di console.log
                        reply(memberList); // Kirim daftar anggota grup ke pengirim pesan
                    } else {
                        reply("Gagal mengambil data anggota grup.");
                    }
                } else {
                    reply("Perintah ini hanya bisa digunakan di dalam grup.");
                }
                break;
            case "kick":
                if (ownerNumbers.includes(remoteJidNumber)) {
                    if (groupID) {
                        // Periksa apakah pesan memiliki konteks informasi tambahan
                        if (m.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
                            // Ekstrak ID yang disebutkan dari konteks pesan
                            const mentions = m.message.extendedTextMessage.contextInfo.mentionedJid;
                            if (mentions.length > 0) {
                                // Lakukan pembaruan anggota grup untuk mengeluarkan mereka
                                const response = await soct.groupParticipantsUpdate(
                                    id,
                                    mentions, // Gunakan langsung ID yang disebutkan tanpa perlu mengubah format
                                    "remove"
                                );
                                if (response.status === 200) {
                                    reply("Berhasil mengeluarkan anggota dengan mention.");
                                } else {
                                    reply("BerhasilS.");
                                }
                            } else {
                                reply("Tidak ada anggota yang di-mention.");
                            }
                        } else {
                            reply("Tidak ada anggota yang di-mention.");
                        }
                    } else {
                        reply("Perintah ini hanya bisa digunakan di dalam grup.");
                    }
                } else {
                    reply("Maaf, perintah ini hanya bisa dilakukan oleh owner.");
                }
                break;
            case "img":
                const randomIndex = Math.floor(Math.random() * kreativ.meme.length);
                const randomImageUrl = kreativ.meme[randomIndex];
                const ext = path.extname(randomImageUrl);
                const filename = `temp${ext}`;
                const imagePath = path.join(__dirname, 'temp', filename);

                const writer = fs.createWriteStream(imagePath);

                const responses = await axios({
                    url: randomImageUrl,
                    method: 'GET',
                    responseType: 'stream',
                });

                responses.data.pipe(writer);

                await new Promise((resolve, reject) => {
                    writer.on('finish', resolve);
                    writer.on('error', reject);
                });

                await soct.sendMessage(id, { image: { url: imagePath, caption: 'Ini gambar acak dari koleksi kami!' } });

                fs.unlinkSync(imagePath);
                break;
            default:
                send(`Maaf, perintah '${prefix}${command}' tidak dikenali. Ketik '${prefix}help' untuk melihat daftar perintah yang tersedia.`);
                console.log(`perintah ${command} tidak dikenali`)
                break;
        }
    } catch (error) {
        console.error("Terjadi kesalahan:", error);
        reply("Maaf, terjadi kesalahan. Silakan coba lagi nanti.");
    }
}




module.exports = { handleCommand };