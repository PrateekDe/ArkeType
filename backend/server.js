import express from 'express';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { extractResumeExperience, generateCustomQuestions } from './gemini/test.js';
import pkg from 'pdfjs-dist';  // ✅ EXACT like your working runParse.js
const { getDocument } = pkg;

const app = express();
const port = 3000;

app.use(cors());
app.use(express.static('frontend'));
app.use('/uploads', express.static('uploads'));
app.use('/outputs', express.static('outputs'));

const upload = multer({ dest: 'backend/uploads/' });

app.post('/upload', upload.single('resume'), async (req, res) => {
    try {
      const filePath = req.file.path;
      const data = new Uint8Array(fs.readFileSync(filePath));
      const loadingTask = getDocument({ data });
      const pdf = await loadingTask.promise;
  
      let resumeText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map(item => item.str).join(' ');
        resumeText += strings + '\n';
      }
  
      let parsedOutput = await extractResumeExperience(resumeText);
      let customQuestions = await generateCustomQuestions(parsedOutput);
  
      console.log('Raw parsed output:', parsedOutput);
      console.log('Raw custom questions:', customQuestions);
  
      // 🧹 Clean Markdown artifacts
      parsedOutput = parsedOutput.replace(/```json|```/g, '').trim();
      customQuestions = customQuestions.replace(/```json|```/g, '').trim();
  
      const output = {
        parsedExperience: JSON.parse(parsedOutput),
        customizedQuestions: JSON.parse(customQuestions),
      };
  
      fs.writeFileSync('backend/outputs/finalReport.json', JSON.stringify(output, null, 2));
  
      res.json({ success: true });
    } catch (err) {
      console.error('❌ Error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });
  

app.get('/report', (req, res) => {
  const reportPath = path.join('backend', 'outputs', 'finalReport.json');
  if (fs.existsSync(reportPath)) {
    res.sendFile(path.resolve(reportPath));
  } else {
    res.status(404).json({ success: false, message: 'Report not found' });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
