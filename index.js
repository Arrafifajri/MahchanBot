// Import library dan modul yang diperlukan
const { makeWASocket, useMultiFileAuthState, Browsers,makeInMemoryStore } = require("@whiskeysockets/baileys");
const pino = require("pino");
const colors = require("colors");
const { handleCommand } = require("./perintah");
const readline = require('readline');



// Daftar prefix perintah
const commandPrefixes = [".", "!", "#", "/", "&"];
const usePairingCode = process.argv.includes('--useCode');
const useMobile = process.argv.includes('--mobile') 

const rl = readline.createInterface({ input: process.stdin, output: process.stdout }) // Buat interface untuk membaca dari stdin dan menulis ke stdout
const question = (text) => new Promise((resolve) => rl.question(text, resolve));
 

async function WhatsappConnect() {
  console.log("MENCOBA MENGKONEKAN KE WHATSAPP BRO SABAR")
  // Menggunakan autentikasi yang telah disimpan sebelumnya
  const auth = await useMultiFileAuthState("session");
  const soct = makeWASocket({
    printQRInTerminal: !usePairingCode,
    browser: Browsers.macOS("Desktop"),
    auth: auth.state,
    logger: pino({ level: "silent" }),
    generateHighQualityLinkPreview: true,
    markOnlineOnConnect: true,
    syncFullHistory: true,
  });

   // Jika pengguna memilih menggunakan kode pasangan dan belum terdaftar
   if(usePairingCode) {
    // Tanyakan nomor telepon pengguna
    if(useMobile) {
        throw new Error('Cannot use pairing code with mobile api')
    }
    const phoneNumber = await question('Please enter your mobile phone number:\n')
    const code = await soct.requestPairingCode(phoneNumber)
    console.log(`Pairing code: ${code}`)
}


  // Update status WhatsApp aktif


  // Event listener untuk pembaruan koneksi
  soct.ev.on("creds.update", auth.saveCreds);
  soct.ev.on("connection.update", async ({ connection }) => {
    if (connection === "open") {
      console.clear();
      console.log(
        colors.green(
          `BOT WHATSAPP UDAH SIAP DI HP${
            soct.user.id.split(":")[0]
          } Bot buatan Fajri RemBot'✅`
        )
      );
    } else if (connection === "close") {
      await WhatsappConnect();
    }
  });

  // Event listener untuk pesan baru
  soct.ev.on("messages.upsert", async ({ messages }) => {
    const m = messages[0];
    const msgType = m.message ? Object.keys(m.message)[0] : null; 
    const id = m.key.remoteJid;
    const msgText =
      msgType === "conversation"
        ? m.message.conversation
        : msgType === "imageMessage"
        ? m.message.imageMessage.caption
        : msgType === "videoMessage"
        ? m.message.videoMessage.caption
        : msgType === "extendedTextMessage"
        ? m.message.extendedTextMessage.text
        : msgType === "buttonsResponseMessage"
        ? m.message.buttonsResponseMessage.selectedButtonId
        : msgType === "listResponseMessage"
        ? m.message.listResponseMessage.singleSelectReply.selectedRowId
        : msgType === "templateButtonReplyMessage"
        ? m.message.templateButtonReplyMessage.selectedId
        : msgType === "messageContextInfo"
        ? m.message.buttonsResponseMessage?.selectedButtonId ||
          m.message.listResponseMessage?.singleSelectReply.selectedRowId ||
          m.text
        : msgType === "viewOnceMessageV2" && m.message.viewOnceMessageV2
        ? m.message.viewOnceMessageV2.message.imageMessage?.caption ||
          m.message.viewOnceMessageV2.message.videoMessage?.caption
        : "";

        const key = {
          remoteJid: m.key.remoteJid,
          id: m.key.id,
          participant: m.key.participant,
        };
        await soct.readMessages([key]);
        

    // Memeriksa apakah pesan mengandung prefix yang valid
    const prefix = commandPrefixes.find((prefix) => msgText && msgText.startsWith(prefix)) || "";
    if (!prefix) return;
    soct.sendPresenceUpdate("composing", id);

    // Menghapus prefix dari pesan untuk mendapatkan perintah
    const commandBody = msgText.slice(prefix.length).trim().toLowerCase();
    const commandIndex = commandBody.indexOf(" ");
    const command = commandIndex !== -1 ? commandBody.substring(0, commandIndex) : commandBody;
    const args = commandIndex !== -1 ? commandBody.substring(commandIndex + 1) : "";

    let remoteJidNumber;
    let groupName = ""; // Variabel untuk menyimpan nama grup

    if (m.key.participant) {
      remoteJidNumber = m.key.participant.split("@")[0]; // Ambil nomor telepon dari participant jika pesan dikirim melalui grup
      const groupMetadata = await soct.groupMetadata(m.key.remoteJid); // Dapatkan metadata grup
      groupName = groupMetadata.subject; // Ambil nama grup dari metadata

      // Memeriksa apakah pesan adalah notifikasi bergabung ke grup
      if (
        msgType === "groupNotificationMessage" &&
        m.message.groupInviteMessage.caption === "add"
      ) {
        // Menyambut anggota baru
        const newMember = m.message.groupInviteMessage.participants[0];
        const welcomeMessage = `Selamat datang, ${newMember}! Selamat bergabung di grup ${groupName}.`;
        soct.sendMessage(m.key.remoteJid, { text: welcomeMessage });
      }
    } else {
      remoteJidNumber = m.key.remoteJid.split("@")[0]; // Ambil nomor telepon dari remoteJid jika pesan dikirim secara pribadi
    }

    // Log pesan dan tipe pesan
    console.log(
      colors.black(colors.bgWhite("[ LOGS ]")),
      colors.brightMagenta(msgText),
      colors.magenta("From"),
      colors.green(m.pushName),
      colors.yellow(`[ ${remoteJidNumber} ]`),
      colors.blue("IN"),
      colors.red(groupName)
    );

    // Memeriksa apakah pesan merupakan balasan dari pesan lain
    const isReply = m.message.contextInfo && m.message.contextInfo.quotedMessage;
    const quotedMsgText = isReply ? m.message.contextInfo.quotedMessage.conversation : null;

    // Fungsi untuk mengirim pesan balasan
    function reply(text) {
      soct.sendMessage(m.key.remoteJid, { text: text }, { quoted: m });
    }

    // Fungsi untuk mengirim pesan
    function send(text) {
      soct.sendMessage(m.key.remoteJid, { text: text });
    }

    const groupID = id.endsWith("@g.us")


    handleCommand(command, m, soct, id, prefix, reply, send, groupID, isReply, quotedMsgText);
  });

  soct.ev.on("group-participants.update", async ({ id, participants, action }) => {
    const m = { id, participants, action };
    console.log(m);
  
    // Mendapatkan metadata grup
    const groupMetadata = await soct.groupMetadata(id).catch(() => null);
  
    if (!groupMetadata) {
      console.log("Gagal mengambil metadata grup.");
      return;
    }
  
    // Mengumpulkan mention menggunakan username jika tersedia, jika tidak menggunakan nama pertama
    const mentions = [];
    for (const participant of groupMetadata.participants) {
      // Menghindari menyebutkan anggota yang baru saja bergabung atau keluar
      if (participants.includes(participant.id)) {
        let mention = participant.username || participant.name || participant.id.split("@")[0];
        mentions.push(mention);
      }
    }
  
    // Menentukan pesan berdasarkan tindakan (action)
    let message = "";
    if (action === "add") {
      message = `*✦; W E L C O M E  N E W M E M B E R!!''* 
      ${mentions.join(", ")}!
 *SILAHKAN INTRO(≡^∇^≡)*
               
🦊. NAMA : 
               
🦊. GENDER : 
               
🦊. UMUR : 
               
🦊. ASAL/TEMPAT TINGGAL :  
               
🦊. COS/NPC : 
               
🦊. LINK INSTAGRAM :
      `;
    } else if (action === "remove") {
      message = "yah keluar aku jadi sedih 😭😭😭 \nyang keluar grub sama aku sumpahin jadi anak introvert";
    }
  
    // Mengirim pesan ke grup
    if (message) {
      soct.sendMessage(id, { text: message });
    }
  });
  
  
  
  
}
// Memanggil fungsi untuk menghubungkan bot ke WhatsApp
WhatsappConnect();
