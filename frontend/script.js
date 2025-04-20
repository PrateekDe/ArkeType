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

// Result2 Page (result2.html)
if (document.getElementById('resultContainer2')) {
  fetch('/report')
    .then(res => res.json())
    .then(data => {
      if (!data.customizedQuestions) {
        document.getElementById('resultContainer2').innerHTML = '<p>No customized questions available.</p>';
        return;
      }

      const questionsDiv = document.getElementById('questions');
      questionsDiv.innerHTML = '<h2>Customized Behavioral Questions</h2>';

      if (data.customizedQuestions.questions) {
        data.customizedQuestions.questions.forEach(q => {
          questionsDiv.innerHTML += `
            <div class="card">
              <h2>Question based on: ${q.basedOn}</h2>
              <p>${q.question}</p>
              ${q.options ? `
                <ul>
                  ${q.options.map(opt => `<li>${opt}</li>`).join('')}
                </ul>
              ` : ''}
            </div>
          `;
        });
      }
    })
    .catch(err => {
      console.error('Error fetching report:', err);
    });
}
