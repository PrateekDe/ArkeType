import fs from 'fs';
import path from 'path';
import { extractResumeExperience } from './gemini/test.js';
import pkg from 'pdfjs-dist';
const { getDocument } = pkg;

const filePath = '/Users/prateekde/Desktop/ArkeType/Prateek_De_Resume_USA.pdf'; // ✅ new path
console.log('✅ Using file:', filePath);

(async () => {
  try {
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

    console.log('\n📄 Extracted Resume Text (first 500 chars):\n');
    console.log(resumeText.slice(0, 500), '...');

    const parsedOutput = await extractResumeExperience(resumeText);

    console.log('\n✅ Gemini Parsed Output:\n');
    console.log(parsedOutput);
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
})();