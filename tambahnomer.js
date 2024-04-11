const fs = require('fs');
const readline = require('readline');

function addOwnerNumber() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question('Masukkan nomor telepon owner baru: ', (newOwnerNumber) => {
        // Baca file config.json
        fs.readFile('config.json', 'utf8', (err, data) => {
            if (err) {
                console.error(err);
                rl.close();
                return;
            }

            let config;
            try {
                config = JSON.parse(data);
            } catch (parseErr) {
                console.error(parseErr);
                rl.close();
                return;
            }

            // Tambahkan nomor telepon baru ke dalam array ownerNumber
            config.ownerNumber.push(newOwnerNumber);

            // Simpan perubahan ke file config.json
            fs.writeFile('config.json', JSON.stringify(config, null, 2), 'utf8', (writeErr) => {
                if (writeErr) {
                    console.error(writeErr);
                } else {
                    console.log('Nomor telepon owner berhasil ditambahkan.');
                }
                rl.close();
            });
        });
    });
}

// Panggil fungsi untuk menambahkan nomor telepon owner
addOwnerNumber();
