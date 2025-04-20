import 'dotenv/config';

export async function extractResumeExperience(resumeText) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const axios = (await import('axios')).default;

  const prompt = `
    Extract only the real professional experience, roles, and technical projects from this resume.
    Ignore adjectives or vague claims like 'hardworking'.
    Format your answer as JSON: { Experience: [...], Projects: [...], Roles: [...] }.

    Resume:
    ${resumeText}
  `;

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
  } catch (err) {
    console.error('Gemini API Error:', err?.response?.data || err.message);
    throw err;
  }
}



export async function generateCustomQuestions(parsedExperience) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const axios = (await import('axios')).default;

  const prompt = `
    Based on this parsed resume experience and projects, create 3 customized behavioral or thinking-process questions.
    - Each question should be related to a specific experience or project mentioned.
    - Do NOT ask direct technical questions (no "how do you code X?").
    - Focus on decision making, priorities, and approach to problems.
    - Output format: 
    {
      "questions": [
        { "question": "...", "basedOn": "Experience or Project Name" },
        { "question": "...", "basedOn": "Experience or Project Name" },
        { "question": "...", "basedOn": "Experience or Project Name" }
      ]
    }

    Parsed Resume Experience and Projects:
    ${parsedExperience}
  `;

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
  } catch (err) {
    console.error('Gemini API Error (custom questions):', err?.response?.data || err.message);
    throw err;
  }
}
