import 'dotenv/config';
const axios = (await import('axios')).default;

export async function analyzeBehaviorResponses(responses) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  const prompt = `
You are an expert behavioral psychologist and AI assistant.

You will be given 5 behavioral questions, user answers, and how long they took to respond.

One of the four answer options in each question is intentionally incorrect or nonsensical (e.g., completely unrelated to the question). Use this to detect inattentive users.

Label each answer with:
- Tags (e.g., 'Loyal', 'EQ-Driven', 'Growth-Oriented', 'Results-Focused', etc.)
- Authenticity score (0-1, based on instinctiveness vs. fabricated)
- Category (which of the 5 it maps to)

Return valid JSON:
{
  "analysis": [
    {
      "category": "Loyalty",
      "tags": [...],
      "authenticityScore": 0.82
    },
    ...
  ]
}

Do not explain anything.

Input:
${JSON.stringify(responses, null, 2)}
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