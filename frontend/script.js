// Check user type on load
const userType = sessionStorage.getItem('userType');

if (!userType) {
  window.location.href = 'login.html';
} else {
  console.log('User logged in as:', userType);
}

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
      uploadBtn.disabled = true;
      uploadBtn.innerHTML = `<div class="spinner"></div>`;

      await fetch('/upload', {
        method: 'POST',
        body: formData
      });

      window.location.href = 'loading.html';
    } catch (err) {
      console.error('Upload failed:', err);
      uploadBtn.textContent = 'Upload ➔';
    }
  });
}

// Result1 Page (Experience and Projects)
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
              <ul>${exp.Responsibilities.map(r => `<li>${r}</li>`).join('')}</ul>
            </div>`;
        });
      }

      if (data.parsedExperience.Projects) {
        data.parsedExperience.Projects.forEach(proj => {
          experienceDiv.innerHTML += `
            <div class="card">
              <h2>Project: ${proj.Name || proj.Role || 'Project'}</h2>
              <p><strong>Description:</strong> ${proj.Description || 'No description'}</p>
              <p><strong>Date:</strong> ${proj.Date || 'N/A'}</p>
              <ul>${(proj.Details || []).map(d => `<li>${d}</li>`).join('')}</ul>
            </div>`;
        });
      }

      const nextBtn = document.getElementById('toQuestionsBtn');
      nextBtn.addEventListener('click', () => {
        window.location.href = 'result2.html';
      });
    })
    .catch(err => {
      console.error('Error fetching experience:', err);
    });
}

// Result2 Page (Customized Questions)
if (document.getElementById('resultContainer2')) {
  fetch('/report')
    .then(res => res.json())
    .then(data => {
      if (!data.customizedQuestions) {
        document.getElementById('resultContainer2').innerHTML = '<p>No customized questions found.</p>';
        return;
      }

      const questionsDiv = document.getElementById('questions');
      questionsDiv.innerHTML = '';

      if (data.customizedQuestions.questions) {
        data.customizedQuestions.questions.forEach((q, qIndex) => {
          questionsDiv.innerHTML += `
            <div class="space-y-4">
              <h2 class="text-2xl font-bold text-white">${q.question}</h2>
              ${q.options ? `
                <div class="flex flex-col gap-4">
                  ${q.options.map((opt, optIndex) => `
                    <label class="flex items-center gap-2 text-white">
                      <input type="radio" name="question-${qIndex}" value="${opt}" class="accent-purple-500 scale-125">
                      ${opt}
                    </label>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          `;
        });
      }

      const questionsForm = document.getElementById('questionsForm');
      const submitBtn = document.getElementById('submitAnswersBtn');

      if (questionsForm) {
        questionsForm.addEventListener('submit', (e) => {
          e.preventDefault();

          submitBtn.disabled = true;
          submitBtn.innerHTML = `<div class="animate-spin h-6 w-6 border-4 border-white border-t-transparent rounded-full mx-auto"></div>`;

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

          console.log('✅ Customized Responses:', responses);

          fetch('/save-customized-json', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(responses)
          })
          .then(() => {
            window.location.href = 'behavior.html';
          })
          .catch(err => {
            console.error('❌ Error saving customized answers:', err);
            alert('Failed to submit answers.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Next ➔ Behavioral Assessment';
          });
        });
      }
    })
    .catch(err => {
      console.error('Error fetching customized questions:', err);
    });
}


// Final Result Page (result.html)
if (document.getElementById('finalResultContainer')) {
  const loader = document.getElementById('loader');
  const finalContainer = document.getElementById('finalResultContainer');

  fetch('/report')
    .then(res => res.json())
    .then(data => {
      if (!data.parsedExperience) {
        loader.innerHTML = '<p>Report not available.</p>';
        return;
      }

      // ✅ After initial /report load, call /final-report (executive summary)
      generateFinalSummaryFromAI();
    })
    .catch(err => {
      console.error('Error loading report:', err);
      loader.innerHTML = '<p>Failed to load report. Try again later.</p>';
    });
}

// ✅ Proper function to fetch AI Analyzed Summary
function generateFinalSummaryFromAI() {
  const summaryLoader = document.getElementById('summaryLoader');

  fetch('/final-report')
    .then(res => res.json())
    .then(analysis => {
      if (!analysis) {
        console.error('No AI analysis found.');
        return;
      }

      // Fill the Final Report Data
      document.getElementById('candidateName').textContent = analysis.name || 'Candidate Name';
      document.getElementById('experienceValue').textContent = analysis.experience || 'N/A';
      document.getElementById('projectsValue').textContent = analysis.projects || 'N/A';
      document.getElementById('loyaltyValue').textContent = `${analysis.loyaltyPercent}%`;
      document.getElementById('growthValue').textContent = `${analysis.companyGrowthPercent}%`;
      document.getElementById('emotionalIQValue').textContent = `${analysis.emotionalIQPercent}%`;
      document.getElementById('resultsValue').textContent = `${analysis.resultsFocusPercent}%`;
      document.getElementById('avgTime').textContent = `${analysis.averageResponseTime} Seconds`;
      document.getElementById('analysisValue').textContent = analysis.overallAnalysis || '-';
      document.getElementById('recruiterLooking').textContent = analysis.recruiterLooking || 'N/A';
      document.getElementById('desirabilityScore').textContent = analysis.desirabilityScore || '--';

      // Hide Loader and Show Content
      loader.style.display = 'none';
      document.querySelector('.z-10').style.display = 'flex';
    })
    .catch(err => {
      console.error('Error loading final AI report:', err);
      loader.innerHTML = '<p>Failed to load analysis. Try again later.</p>';
    });
}



// Function to fetch AI Analyzed Executive Summary
function generateFinalSummaryFromAI() {
  const summaryLoader = document.getElementById('loader');

  fetch('/final-report')
    .then(res => res.json())
    .then(analysis => {
      console.log("hiiii");
      if (summaryLoader) summaryLoader.remove();

      // ✅ Update individual IDs with analysis data
      document.getElementById('candidateName').textContent = analysis.name || 'Candidate Name';
      document.getElementById('experienceValue').textContent = analysis.experience || 'N/A';
      document.getElementById('projectsValue').textContent = analysis.projects || 'N/A';
      document.getElementById('loyaltyValue').textContent = `${analysis.loyaltyPercent}%`;
      document.getElementById('growthValue').textContent = `${analysis.companyGrowthPercent}%`;
      document.getElementById('emotionalIQValue').textContent = `${analysis.emotionalIQPercent}%`;
      document.getElementById('resultsValue').textContent = `${analysis.resultsFocusPercent}%`;
      document.getElementById('avgTime').textContent = `${analysis.averageResponseTime} Seconds`;
      document.getElementById('analysisValue').textContent = analysis.overallAnalysis || '-';
      document.getElementById('recruiterLooking').textContent = analysis.recruiterLooking || 'Emotional';
      document.getElementById('desirabilityScore').textContent = analysis.desirabilityScore || '--';

      // ✅ Make report visible
      document.querySelector('.z-10').style.display = 'flex';
    })
    .catch(err => {
      console.error('Error loading final AI report:', err);
      summaryLoader.innerHTML = '<p>Failed to load AI analysis.</p>';
    });
}

