const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let events = [];

function addEvent() {
    rl.question('Masukkan nama event: ', (name) => {
        rl.question('Masukkan tanggal event: ', (date) => {
            rl.question('Masukkan lokasi event: ', (location) => {
                events.push({ name, date, location });
                rl.question('Tambah event lain? (y/n): ', (answer) => {
                    if (answer.toLowerCase() === 'y') {
                        addEvent();
                    } else {
                        saveEvents();
                        rl.close();
                    }
                });
            });
        });
    });
}

function saveEvents() {
    fs.writeFileSync('event.json', JSON.stringify(events, null, 4));
    console.log('Data berhasil disimpan dalam event.json');
}

function loadData() {
    try {
        const data = fs.readFileSync('event.json', 'utf8');
        events = JSON.parse(data);
        console.log('Data event saat ini:');
        console.log(events);
        rl.question('Apakah Anda ingin menghapus semua data? (y/n): ', (answer) => {
            if (answer.toLowerCase() === 'y') {
                events = [];
            }
            addEvent();
        });
    } catch (err) {
        console.error('Error membaca file event.json:', err);
        addEvent();
    }
}

loadData();
