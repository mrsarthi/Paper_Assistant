import { useState } from 'react';
import Tesseract from 'tesseract.js';
import { pdfToImages } from '../utils/pdfHelpers';

function OCRUploader() {
  const [files, setFiles] = useState([]);
  const [output, setOutput] = useState('');
  const [log, setLog] = useState('');

  const handleFiles = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const runOCR = async () => {
    setOutput('');
    setLog('Starting OCR...\n');

    for (const file of files) {
      setLog((prev) => prev + `Processing: ${file.name}\n`);

      if (file.type === 'application/pdf') {
        const images = await pdfToImages(file);
        for (let i = 0; i < images.length; i++) {
          setLog((prev) => prev + `Running OCR on page ${i + 1}\n`);
          const result = await Tesseract.recognize(images[i], 'eng', {
            logger: (m) => setLog((prev) => prev + `${m.status}\n`)
          });
          setOutput((prev) => prev + result.data.text + '\n\n---\n\n');
        }
      } else {
        const buffer = await file.arrayBuffer();
        const blob = new Blob([buffer]);
        const url = URL.createObjectURL(blob);
        const result = await Tesseract.recognize(url, 'eng', {
          logger: (m) => setLog((prev) => prev + `${m.status}\n`)
        });
        setOutput((prev) => prev + result.data.text + '\n\n---\n\n');
        URL.revokeObjectURL(url);
      }
    }

    setLog((prev) => prev + 'Done.\n');
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h2>OCR Upload</h2>
      <input type="file" multiple accept=".png,.jpg,.jpeg,.pdf" onChange={handleFiles} />
      <button onClick={runOCR} disabled={!files.length}>Run OCR</button>
      <pre style={{ whiteSpace: 'pre-wrap', background: '#111', color: '#0f0', padding: '1rem', marginTop: '1rem' }}>{log}</pre>
      <textarea value={output} rows={20} style={{ width: '100%', marginTop: '1rem' }} />
    </div>
  );
}

export default OCRUploader;
