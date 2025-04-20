// import 'dotenv/config';
// import axios from 'axios';

// const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// async function testGemini() {
//   const prompt = 'Write a fun fact about computers.';

//   try {
//     const response = await axios.post(
//       `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`,
//       {
//         contents: [
//           {
//             role: 'user',
//             parts: [{ text: prompt }]
//           }
//         ]
//       },
//       {
//         headers: {
//           'Content-Type': 'application/json'
//         }
//       }
//     );

//     const output = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
//     console.log('✅ Gemini response:', output);
//   } catch (error) {
//     console.error('❌ Gemini API error:', error.response?.data || error.message);
//   }
// }

// testGemini();