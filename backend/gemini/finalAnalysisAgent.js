import 'dotenv/config';
const axios = (await import('axios')).default;

export async function analyzeFullReport(reportData) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  const prompt = `
You are an expert recruiter AI.

Based on this candidate's customized answers and behavioral answers, analyze and give a JSON output like:
{
  "loyaltyPercent": ...,
  "emotionalIQPercent": ...,
  "companyGrowthPercent": ...,
  "resultsFocusPercent": ...,
  "averageResponseTime": ...,
  "instinctivenessScore": "Instinctive" or "Hesitant",
  "overallAnalysis": "One line summary",
  "desirabilityScore": ... (0-100)
}

Customized Answers:
${JSON.stringify(reportData.customizedAnswers, null, 2)}

Behavioral Answers:
${JSON.stringify(reportData.behavioralAnswers, null, 2)}
`;

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      },
      { headers: { 'Content-Type': 'application/json' } }
    );

    const raw = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const cleaned = raw.replace(/```json|```/g, '').trim();
    
    try {
        const jsonStart = cleaned.indexOf('{');
        const jsonEnd = cleaned.lastIndexOf('}');
        const pureJson = cleaned.slice(jsonStart, jsonEnd + 1);
        return JSON.parse(pureJson);
      } catch (err) {
        console.error('Failed parsing AI output JSON:', err.message);
        throw err;
      }
      
  } catch (err) {
    console.error('Gemini Final Analysis Error:', err?.response?.data || err.message);
    throw err;
  }
}
