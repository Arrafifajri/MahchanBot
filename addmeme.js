const fs = require('fs');
const axios = require('axios');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

(async () => {
    console.log('Bot dimulai...');

    const apiKey = 'AIzaSyAox88XqoEYCm2tYtnnDIWPjgcyZ7zZnFE'; // Ganti dengan API key Anda
    const cx = '458dc809ef87e4563'; // Ganti dengan Engine ID Anda
    let keyword = ''; // Keyword pencarian
    const maxResults = 100; // Jumlah maksimal hasil pencarian
    const resultsPerPage = 10; // Jumlah hasil per halaman
    const totalPages = Math.ceil(maxResults / resultsPerPage); // Jumlah total halaman pencarian

    try {
        // Baca file kreativ.json
        const rawData = fs.readFileSync('kreativ.json');
        let kreativData = JSON.parse(rawData);

        // Inisialisasi Set untuk menyimpan URL yang sudah didapatkan
        let urlSet = new Set(kreativData.meme);

        // Tanya keyword pencarian
        rl.question('Masukkan keyword untuk mencari gambar: ', async (answer) => {
            keyword = answer.trim();
            console.log(`Bot siap mencari gambar untuk keyword: '${keyword}'`);

            // Tanya apakah ingin menghapus seluruh isi file kreativ.json
            rl.question('Apakah Anda ingin menghapus seluruh isi file kreativ.json sebelum menambahkan URL gambar? (y/n): ', async (answer) => {
                if (answer.toLowerCase() === 'y') {
                    kreativData = { meme: [] };
                    urlSet.clear(); // Hapus semua URL yang sudah disimpan di Set
                    fs.writeFileSync('kreativ.json', JSON.stringify(kreativData, null, 4));
                    console.log('Seluruh isi file kreativ.json berhasil dihapus.');
                }

                for (let i = 0; i < totalPages; i++) {
                    const startIndex = i * resultsPerPage + 1;
                    console.log(`Mencari gambar untuk keyword '${keyword}', halaman ${i + 1}, mulai dari hasil ke-${startIndex}`);

                    const response = await axios.get(`https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(keyword)}&cx=${cx}&searchType=image&key=${apiKey}&start=${startIndex}`);
                    const imageUrls = response.data.items
                        .filter(item => item.link.endsWith('.jpg') || item.link.endsWith('.png')) // Filter hanya format JPG dan PNG
                        .map(item => item.link)
                        .filter(url => !urlSet.has(url)); // Filter URL yang sudah ada

                    console.log('URL gambar berhasil ditemukan:', imageUrls);

                    // Tambahkan URL gambar ke dalam array 'meme' pada objek kreativData
                    kreativData.meme = [...kreativData.meme, ...imageUrls];

                    // Simpan kembali ke dalam file kreativ.json
                    fs.writeFileSync('kreativ.json', JSON.stringify(kreativData, null, 4));

                    // Tambahkan URL baru ke dalam Set
                    imageUrls.forEach(url => urlSet.add(url));

                    console.log('URL gambar berhasil ditambahkan ke dalam file kreativ.json');
                }

                rl.close(); // Menutup readline interface setelah selesai
            });
        });
    } catch (error) {
        console.error('Error:', error.response.data);
    } finally {
        console.clear()
        console.log('Bot selesai.');
    }
})();
