const GIST_ID = "80c9ab55fa8b6d5f2f5945e1cd39f299";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || Buffer.from("Z2hvX3RrWFg5NXQxUUhLSmZUTmJZa3U3RmBCRDB1SFFOdjFLSkwwdg==", "base64").toString("utf-8");

module.exports = async function handler(req, res) {
  // Set CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  const sendJson = (statusCode, data) => {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(data));
  };

  // GET: Baca data dari Gist
  if (req.method === 'GET') {
    try {
      const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'User-Agent': 'Elearning-Informatika-App',
          'Accept': 'application/vnd.github+json'
        }
      });

      if (!response.ok) {
        // Fallback: baca raw gist jika API rate-limited
        const rawRes = await fetch(`https://gist.githubusercontent.com/wahyuaji31-crypto/${GIST_ID}/raw/elearning_db.json?t=${Date.now()}`);
        if (rawRes.ok) {
          const rawData = await rawRes.json();
          return sendJson(200, rawData);
        }
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const gist = await response.json();
      const content = gist.files['elearning_db.json']?.content;

      if (!content) {
        return sendJson(200, { materi: [], jawaban: [], presensi: [], siswa: [] });
      }

      const data = JSON.parse(content);
      if (!data.siswa) data.siswa = [];
      return sendJson(200, data);
    } catch (err) {
      console.error('Error reading data:', err);
      // Fallback response
      return sendJson(200, { 
        materi: [
          {
            id: 1,
            judul: "Pengantar Informatika & Berpikir Komputasional",
            deskripsi: "Pelajari 4 pilar berpikir komputasional: Dekomposisi, Pengenalan Pola, Abstraksi, dan Algoritma.",
            targetKelas: "Semua Kelas",
            fileData: null
          }
        ],
        jawaban: [],
        presensi: [],
        siswa: []
      });
    }
  }

  // POST: Simpan atau update data ke Gist
  if (req.method === 'POST') {
    try {
      let bodyData = req.body;

      // Jika body berupa stream atau belum di-parse
      if (!bodyData || typeof bodyData === 'string') {
        if (typeof bodyData === 'string') {
          bodyData = JSON.parse(bodyData);
        } else {
          // Baca chunk body jika ada
          const buffers = [];
          for await (const chunk of req) {
            buffers.push(chunk);
          }
          const rawBody = Buffer.concat(buffers).toString('utf-8');
          bodyData = rawBody ? JSON.parse(rawBody) : {};
        }
      }

      const dataToSave = {
        materi: Array.isArray(bodyData.materi) ? bodyData.materi : [],
        jawaban: Array.isArray(bodyData.jawaban) ? bodyData.jawaban : [],
        presensi: Array.isArray(bodyData.presensi) ? bodyData.presensi : [],
        siswa: Array.isArray(bodyData.siswa) ? bodyData.siswa : []
      };

      const payload = {
        files: {
          'elearning_db.json': {
            content: JSON.stringify(dataToSave, null, 2)
          }
        }
      };

      const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'User-Agent': 'Elearning-Informatika-App',
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GitHub API PATCH error: ${response.status} - ${errorText}`);
      }

      return sendJson(200, { success: true, message: 'Data berhasil disimpan', data: dataToSave });
    } catch (err) {
      console.error('Error saving data:', err);
      return sendJson(500, { error: 'Gagal menyimpan data', details: err.message });
    }
  }

  return sendJson(405, { error: 'Method not allowed' });
};
