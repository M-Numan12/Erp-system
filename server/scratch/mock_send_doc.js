const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.post('/api/sales/send-document', (req, res) => {
  console.log("Received send-document request!");
  const { to, document: docBase64, filename } = req.body;
  if (!docBase64) {
    console.error("No document data received!");
    return res.status(400).json({ error: 'No document data' });
  }

  let rawBase64 = docBase64;
  if (rawBase64.startsWith('data:')) {
    rawBase64 = rawBase64.split(',')[1];
  }

  const outputFilePath = path.join(__dirname, 'generated_ledger.pdf');
  fs.writeFileSync(outputFilePath, Buffer.from(rawBase64, 'base64'));
  console.log(`Saved generated PDF to: ${outputFilePath}`);

  return res.json({ success: true, message: 'Saved successfully' });
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Mock send-document server running on port ${PORT}`);
});
