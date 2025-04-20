import 'dotenv/config';
const axios = (await import('axios')).default;

export async function analyzeBehaviorResponses(responses) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  const prompt = `
  You are an intelligent AI assistant that creates custom behavioral evaluation questions for candidates.
  
  From the following resume experience and projects, create **exactly 5** high-quality behavioral/thinking questions.
  
  Guidelines:
  - Each question must relate to a real experience or project from the resume
  - Each must include **4 distinct multiple-choice options**
  - Do NOT return fewer than 5
  - If the resume is lacking content, create generic leadership/product questions **inspired by** what’s available
  
  Format (strictly JSON):
  {
    "questions": [
      {
        "question": "string",
        "basedOn": "string",
        "options": ["string", "string", "string", "string"]
      },
      ...
      // total = 5
    ]
  }
  
  Resume Experience and Projects:
  ${parsedExperience}
  `;

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      },
      { headers: { 'Content-Type': 'application/json' } }
    );

    const rawText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    return JSON.parse(rawText.replace(/```json|```/g, '').trim());
  } catch (err) {
    console.error('Gemini Behavior Analysis Error:', err?.response?.data || err.message);
    throw err;
  }
}