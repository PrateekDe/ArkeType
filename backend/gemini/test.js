import 'dotenv/config';

export async function extractResumeExperience(resumeText) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const axios = (await import('axios')).default;

  const prompt = `
    Extract only the real professional experience, roles, and technical projects from this resume.
    Ignore adjectives like 'hardworking'.
    Format: { "Experience": [...], "Projects": [...], "Roles": [...] }

    Resume:
    ${resumeText}
  `;

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      },
      { headers: { 'Content-Type': 'application/json' } }
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
  Based on the following parsed resume experience and projects, create 5 customized behavioral/thinking questions.
  
  - Do not ask technical coding questions.
  - For each question, provide exactly 4 plausible multiple-choice options.
  - Do NOT mention the correct answer (we will judge the thinking style based on the choice later).
  
  Format (strict JSON structure, no explanations):
  {
    "questions": [
      {
        "question": "....",
        "basedOn": "Experience/Project Name",
        "options": [
          "Option 1",
          "Option 2",
          "Option 3",
          "Option 4",
          "Option 5"
        ]
      },
      { "question": "...", "basedOn": "Experience/Project Name", "options": [...] },
      { "question": "...", "basedOn": "Experience/Project Name", "options": [...] }
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

    return response.data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
  } catch (err) {
    console.error('Gemini API Error (custom questions):', err?.response?.data || err.message);
    throw err;
  }
}
