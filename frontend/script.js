// Upload Page (index.html)
if (document.getElementById('resumeInput')) {
  const fileInput = document.getElementById('resumeInput');
  const uploadBtn = document.getElementById('uploadBtn');
  const uploadStatus = document.getElementById('uploadStatus');

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      uploadBtn.disabled = false;
      const fileName = fileInput.files[0].name;
      uploadStatus.textContent = `✅ Uploaded: ${fileName}`;
    }
  });

  uploadBtn.addEventListener('click', async () => {
    const file = fileInput.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('resume', file);

    try {
      uploadBtn.textContent = 'Uploading...';

      await fetch('/upload', {
        method: 'POST',
        body: formData
      });

      window.location.href = 'loading.html';
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Upload failed. Try again.');
      uploadBtn.textContent = 'Upload ➔';
    }
  });
}

// Result1 Page (result1.html)
if (document.getElementById('resultContainer1')) {
  fetch('/report')
    .then(res => res.json())
    .then(data => {
      if (!data.parsedExperience) {
        document.getElementById('resultContainer1').innerHTML = '<p>Report not available.</p>';
        return;
      }

      const experienceDiv = document.getElementById('experience');
      experienceDiv.innerHTML = '<h2>Experience & Projects</h2>';

      if (data.parsedExperience.Experience) {
        data.parsedExperience.Experience.forEach(exp => {
          experienceDiv.innerHTML += `
            <div class="card">
              <h2>${exp.Role} at ${exp.Company}</h2>
              <p><strong>Location:</strong> ${exp.Location}</p>
              <p><strong>Dates:</strong> ${exp.Dates}</p>
              <p><strong>Responsibilities:</strong></p>
              <ul>
                ${exp.Responsibilities.map(r => `<li>${r}</li>`).join('')}
              </ul>
            </div>
          `;
        });
      }

      if (data.parsedExperience.Projects) {
        data.parsedExperience.Projects.forEach(proj => {
          experienceDiv.innerHTML += `
            <div class="card">
              <h2>Project: ${proj.Name || proj.Role || 'Project'}</h2>
              <p><strong>Description:</strong> ${proj.Description || 'No description'}</p>
              <p><strong>Date:</strong> ${proj.Date || 'N/A'}</p>
              <p><strong>Details:</strong></p>
              <ul>
                ${(proj.Details || []).map(d => `<li>${d}</li>`).join('')}
              </ul>
            </div>
          `;
        });
      }

      // Handle Next Button
      const nextBtn = document.getElementById('toQuestionsBtn');
      nextBtn.addEventListener('click', () => {
        window.location.href = 'result2.html';
      });
    })
    .catch(err => {
      console.error('Error fetching report:', err);
    });
}

if (document.getElementById('resultContainer2')) {
  fetch('/report')
    .then(res => res.json())
    .then(data => {
      if (!data.customizedQuestions) {
        document.getElementById('resultContainer2').innerHTML = '<p>No customized questions available.</p>';
        return;
      }

      const questionsDiv = document.getElementById('questions');
      questionsDiv.innerHTML = '';

      if (data.customizedQuestions.questions) {
        data.customizedQuestions.questions.forEach((q, qIndex) => {
          questionsDiv.innerHTML += `
            <div class="card">
              <h2>Question based on: ${q.basedOn}</h2>
              <p>${q.question}</p>
              ${q.options ? `
                <ul>
                  ${q.options.map((opt, optIndex) => `
                 
                      <label>
                        <input type="radio" name="question-${qIndex}" value="${opt}">
                        ${opt}
                      </label><br>
                    
                  `).join('')}
                </ul>
              ` : ''}
            </div>
          `;
        });
      }

      // Handle Submit Answers button
      const questionsForm = document.getElementById('questionsForm');

      if (questionsForm) {   // ✅ Check if form exists
        questionsForm.addEventListener('submit', (e) => {
          e.preventDefault();
      
          const formData = new FormData(questionsForm);
          const responses = [];
      
          data.customizedQuestions.questions.forEach((q, qIndex) => {
            const selected = formData.get(`question-${qIndex}`);
            responses.push({
              question: q.question,
              basedOn: q.basedOn,
              selectedAnswer: selected || 'No answer'
            });
          });
      
          console.log('✅ Collected Customized Answers:', responses);
      
          fetch('/save-customized-json', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(responses)
          })
          .then(() => {
            alert('Customized answers submitted successfully!');
            window.location.href = 'behavior.html';
          })
          .catch(err => {
            console.error('❌ Failed to save customized answers:', err);
            alert('Failed to submit answers. Try again.');
          });
        });
      } else {
        console.error('❌ Form not found, cannot attach submit event.');
      }
      
    })
    .catch(err => {
      console.error('Error fetching report:', err);
    });
}



// Result (final report) Page
if (document.getElementById('finalResultContainer')) {
  fetch('/report')
    .then(res => res.json())
    .then(data => {
      if (!data.parsedExperience) {
        document.getElementById('finalResultContainer').innerHTML = '<p>Report not available.</p>';
        return;
      }

      // 🧠 Experience + Projects
      const experienceDiv = document.getElementById('experienceList');
      if (data.parsedExperience.Experience) {
        data.parsedExperience.Experience.forEach(exp => {
          experienceDiv.innerHTML += `
            <div class="card">
              <h3>${exp.Role} @ ${exp.Company}</h3>
              <p><strong>Location:</strong> ${exp.Location}</p>
              <p><strong>Dates:</strong> ${exp.Dates}</p>
              <ul>${exp.Responsibilities.map(r => `<li>${r}</li>`).join('')}</ul>
            </div>
          `;
        });
      }
      if (data.parsedExperience.Projects) {
        data.parsedExperience.Projects.forEach(proj => {
          experienceDiv.innerHTML += `
            <div class="card">
              <h3>Project: ${proj.Name || proj.Role}</h3>
              <p><strong>Description:</strong> ${proj.Description || 'No description'}</p>
              <p><strong>Date:</strong> ${proj.Date || 'N/A'}</p>
              <ul>${(proj.Details || []).map(d => `<li>${d}</li>`).join('')}</ul>
            </div>
          `;
        });
      }

      // 🛠 Customized Questions Answers (directly from report)
      const customizedDiv = document.getElementById('customizedList');
      if (data.customizedAnswers) {
        data.customizedAnswers.forEach(ans => {
          customizedDiv.innerHTML += `
            <div class="card">
              <p><strong>Question:</strong> ${ans.question}</p>
              <p><strong>Selected Answer:</strong> ${ans.selectedAnswer}</p>
            </div>
          `;
        });
      } else {
        customizedDiv.innerHTML = '<p>No customized answers found.</p>';
      }

      // 💬 Behavioral Answers
      const behaviorDiv = document.getElementById('behaviorList');
      if (data.behavioralAnswers) {
        data.behavioralAnswers.forEach(behavior => {
          behaviorDiv.innerHTML += `
            <div class="card">
              <p><strong>Question:</strong> ${behavior.question}</p>
              <p><strong>Selected Answer:</strong> ${behavior.answer}</p>
              <p><em>Time taken:</em> ${behavior.responseTime} seconds</p>
            </div>
          `;
        });
      }
    })
    .catch(err => {
      console.error('Error loading final report:', err);
    });
}

// 🆕 Helper: Fetch latest customized answers
async function fetchLatestCustomized() {
  try {
    const files = await fetch('/outputs').then(res => res.json());
    const customizedFile = files.find(f => f.includes('finalCustomizedAnswers'));
    if (customizedFile) {
      const customizedData = await fetch(`/outputs/${customizedFile}`).then(res => res.json());
      return customizedData;
    }
  } catch (err) {
    console.error('Failed fetching customized answers:', err);
    return [];
  }
}
