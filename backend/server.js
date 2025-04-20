import express from 'express';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { extractResumeExperience, generateCustomQuestions } from './gemini/test.js';
import pkg from 'pdfjs-dist';  // ✅ EXACT like your working runParse.js

import { analyzeBehaviorResponses } from './gemini/behaviorAnalysis.js';

const { getDocument } = pkg;

const app = express(); // ✅ Moved up to be defined before any use

const port = 3000;

app.use(cors());
app.use(express.static('frontend'));
app.use('/uploads', express.static('uploads'));
app.use('/outputs', express.static('outputs'));


app.post('/save-customized-json', (req, res) => {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    try {
      const parsed = JSON.parse(body);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `backend/BehaviourJSON/finalCustomizedAnswers_${timestamp}.json`;

      fs.writeFileSync(fileName, JSON.stringify(parsed, null, 2)); 
      res.json({ success: true, file: fileName });
    } catch (err) {
      console.error('❌ Customized JSON Save Error:', err.message);
      res.status(500).json({ success: false, error: 'Invalid JSON format' });
    }
  });
});


app.post('/analyze-behavior', async (req, res) => {
  try {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      const responses = JSON.parse(body);
// Write raw answers directly without Gemini
const reportPath = 'backend/outputs/finalReport.json';
const existing = JSON.parse(fs.readFileSync(reportPath));
existing.behavioralAnswers = responses; // ⬅️ saved as-is, no tags or scores
fs.writeFileSync(reportPath, JSON.stringify(existing, null, 2));

      res.json({ success: true });
    });
  } catch (err) {
    console.error('Behavior Analysis Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/save-behavior-json', (req, res) => {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    try {
      const parsed = JSON.parse(body);  // ✅ ensure valid JSON first
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `backend/BehaviourJSON/finalBehaviorAnswers_${timestamp}.json`;

      fs.writeFileSync(fileName, JSON.stringify(parsed, null, 2));  // ✅ clean JSON
      res.json({ success: true, file: fileName });
    } catch (err) {
      console.error('❌ JSON Save Error:', err.message);
      res.status(500).json({ success: false, error: 'Invalid JSON format' });
    }
  });
});

const upload = multer({ dest: 'backend/BehaviourJSON/' });

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
      console.log('\n🧠 Full custom questions (raw):\n', customQuestions);
  
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
