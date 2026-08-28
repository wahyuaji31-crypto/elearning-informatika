const GIST_ID = "80c9ab55fa8b6d5f2f5945e1cd39f299";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || Buffer.from("Z2hvX3RrWFg5NXQxUUhLSmZUTmJZa3U3RmBCRDB1SFFOdjFLSkwwdg==", "base64").toString("utf-8");

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

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
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const gist = await response.json();
      const content = gist.files['elearning_db.json']?.content;

      if (!content) {
        return res.status(200).json({ materi: [], jawaban: [], presensi: [] });
      }

      const data = JSON.parse(content);
      return res.status(200).json(data);
    } catch (err) {
      console.error('Error reading data:', err);
      return res.status(500).json({ error: 'Gagal membaca data', details: err.message });
    }
  }

  // POST: Simpan atau update data ke Gist
  if (req.method === 'POST') {
    try {
      let bodyData = req.body;
      if (typeof bodyData === 'string') {
        bodyData = JSON.parse(bodyData);
      }

      if (!bodyData) {
        return res.status(400).json({ error: 'Data tidak boleh kosong' });
      }

      // Pastikan format data valid
      const dataToSave = {
        materi: Array.isArray(bodyData.materi) ? bodyData.materi : [],
        jawaban: Array.isArray(bodyData.jawaban) ? bodyData.jawaban : [],
        presensi: Array.isArray(bodyData.presensi) ? bodyData.presensi : []
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

      return res.status(200).json({ success: true, message: 'Data berhasil disimpan', data: dataToSave });
    } catch (err) {
      console.error('Error saving data:', err);
      return res.status(500).json({ error: 'Gagal menyimpan data', details: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
