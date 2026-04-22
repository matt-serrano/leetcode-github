document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const homepageView = document.getElementById('homepageView');
  const settingsView = document.getElementById('settingsView');
  const settingsBtn = document.getElementById('settingsBtn');
  
  const toggleDetection = document.getElementById('toggleDetection');
  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');
  const problemList = document.getElementById('problemList');
  
  // Notes View Elements
  const notesView = document.getElementById('notesView');
  const notesProblemTitle = document.getElementById('notesProblemTitle');
  const notesContent = document.getElementById('notesContent');
  const backFromNotesBtn = document.getElementById('backFromNotesBtn');
  
  const ghTokenInput = document.getElementById('ghToken');
  const ghRepoInput = document.getElementById('ghRepo');
  const ghBranchInput = document.getElementById('ghBranch');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
  const settingsStatus = document.getElementById('settingsStatus');

  let problems = [];

  // Load Initial State
  chrome.storage.local.get(['settings', 'detectionEnabled', 'syncedProblems'], (data) => {
    // Toggle
    if (data.detectionEnabled !== undefined) {
      toggleDetection.checked = data.detectionEnabled;
    }

    // Settings
    if (data.settings) {
      ghTokenInput.value = data.settings.token || '';
      ghRepoInput.value = data.settings.repo || '';
      ghBranchInput.value = data.settings.branch || 'main';
    }

    // Problems
    if (data.syncedProblems && data.syncedProblems.length > 0) {
      problems = data.syncedProblems;
      renderProblems();
    }
  });

  // Navigation
  settingsBtn.addEventListener('click', () => {
    homepageView.classList.remove('active');
    settingsView.classList.add('active');
  });

  cancelSettingsBtn.addEventListener('click', () => {
    settingsView.classList.remove('active');
    homepageView.classList.add('active');
    settingsStatus.textContent = '';
  });

  backFromNotesBtn.addEventListener('click', () => {
    notesView.classList.remove('active');
    homepageView.classList.add('active');
  });

  // Settings logic
  saveSettingsBtn.addEventListener('click', () => {
    const token = ghTokenInput.value.trim();
    const repo = ghRepoInput.value.trim();
    const branch = ghBranchInput.value.trim();

    if (!token || !repo) {
      settingsStatus.textContent = 'Token and Repo are required.';
      settingsStatus.className = 'status-error';
      return;
    }

    chrome.storage.local.set({
      settings: { token, repo, branch }
    }, () => {
      settingsStatus.textContent = 'Settings saved successfully!';
      settingsStatus.className = 'status-success';
      setTimeout(() => {
        settingsView.classList.remove('active');
        homepageView.classList.add('active');
        settingsStatus.textContent = '';
      }, 1000);
    });
  });

  // Toggle Detection
  toggleDetection.addEventListener('change', (e) => {
    chrome.storage.local.set({ detectionEnabled: e.target.checked });
  });

  // Problem Search and Sort
  searchInput.addEventListener('input', renderProblems);
  sortSelect.addEventListener('change', renderProblems);

  // Delete Modal Elements
  const deleteModalView = document.getElementById('deleteModalView');
  const deleteModalContent = document.getElementById('deleteModalContent');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
  const deleteStatus = document.getElementById('deleteStatus');

  let currentProblemToDelete = null;

  cancelDeleteBtn.addEventListener('click', () => {
    deleteModalView.classList.remove('active');
    homepageView.classList.add('active');
    currentProblemToDelete = null;
    deleteStatus.textContent = '';
  });

  confirmDeleteBtn.addEventListener('click', () => {
    if (!currentProblemToDelete) return;

    confirmDeleteBtn.disabled = true;
    confirmDeleteBtn.textContent = 'Deleting...';
    deleteStatus.className = 'settingsStatus';
    deleteStatus.textContent = '';

    // Find which radio is checked
    let selectedFile = null;
    const radios = document.querySelectorAll('input[name="solution-to-delete"]');
    if (radios.length > 0) {
      const checked = Array.from(radios).find(r => r.checked);
      if (checked && checked.value !== 'ALL') {
        selectedFile = checked.value;
      }
    }

    chrome.runtime.sendMessage({
      type: 'DELETE_SOLUTION',
      payload: {
        number: currentProblemToDelete.number,
        slug: currentProblemToDelete.slug,
        file: selectedFile
      }
    }, (response) => {
      confirmDeleteBtn.disabled = false;
      confirmDeleteBtn.textContent = 'Delete';

      if (chrome.runtime.lastError || !response || !response.success) {
        deleteStatus.className = 'settingsStatus status-error';
        deleteStatus.textContent = (response && response.error) || 'Failed to delete. Check settings.';
      } else {
        deleteStatus.className = 'settingsStatus status-success';
        deleteStatus.textContent = 'Successfully deleted!';
        
        // Remove from UI if the entire folder was deleted
        if (!selectedFile) {
          problems = problems.filter(p => p.number !== currentProblemToDelete.number);
          chrome.storage.local.set({ syncedProblems: problems }, renderProblems);
        }
        
        setTimeout(() => {
          deleteModalView.classList.remove('active');
          homepageView.classList.add('active');
          currentProblemToDelete = null;
          deleteStatus.textContent = '';
        }, 1500);
      }
    });
  });

  function renderProblems() {
    if (problems.length === 0) {
      problemList.innerHTML = '<div class="empty-state">No problems synced yet. Go solve some on LeetCode!</div>';
      return;
    }

    const searchTerm = searchInput.value.toLowerCase();
    const sortBy = sortSelect.value;

    // Filter
    let filtered = problems.filter(p => {
      const title = (p.title || '').toLowerCase();
      const num = (p.number || '').toString();
      return title.includes(searchTerm) || num.includes(searchTerm);
    });

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'dateDesc') {
        return new Date(b.solved_at) - new Date(a.solved_at);
      } else if (sortBy === 'dateAsc') {
        return new Date(a.solved_at) - new Date(b.solved_at);
      } else if (sortBy === 'difficulty') {
        const order = { 'Easy': 1, 'Medium': 2, 'Hard': 3 };
        return (order[a.difficulty] || 0) - (order[b.difficulty] || 0);
      } else if (sortBy === 'number') {
        return parseInt(a.number) - parseInt(b.number);
      }
      return 0;
    });

    // Render
    problemList.innerHTML = '';
    
    if (filtered.length === 0) {
      problemList.innerHTML = '<div class="empty-state">No matching problems found.</div>';
      return;
    }

    filtered.forEach(p => {
      const div = document.createElement('div');
      div.className = 'problem-item';
      
      const date = new Date(p.solved_at).toLocaleDateString();
      
      div.innerHTML = `
        <div class="problem-header">
          <div class="problem-title">${p.number}. ${p.title}</div>
          <div class="difficulty diff-${p.difficulty}">${p.difficulty}</div>
        </div>
        <div class="problem-actions">
          <span>${date}</span>
          <div class="actions-right">
            <a href="${p.github_repo_url}" target="_blank">View in Repo</a>
            <button class="trash-btn" title="Delete Problem" data-number="${p.number}">🗑️</button>
          </div>
        </div>
      `;
      
      // View Notes logic
      div.addEventListener('click', (e) => {
        // Prevent opening notes if user clicks a button/link inside
        if (e.target.closest('a') || e.target.closest('.trash-btn')) {
          return;
        }
        
        notesProblemTitle.textContent = `${p.number}. ${p.title}`;
        notesContent.textContent = p.notes ? p.notes : 'No notes added for this problem.';
        
        homepageView.classList.remove('active');
        notesView.classList.add('active');
      });
      
      // Bind delete button
      const trashBtn = div.querySelector('.trash-btn');
      trashBtn.addEventListener('click', async () => {
        currentProblemToDelete = p;
        
        // Show loading modal
        homepageView.classList.remove('active');
        deleteModalView.classList.add('active');
        deleteModalContent.innerHTML = '<div class="empty-state">Loading solutions from GitHub...</div>';
        confirmDeleteBtn.disabled = true;
        deleteStatus.textContent = '';

        // Fetch settings
        const data = await chrome.storage.local.get(['settings']);
        if (!data.settings || !data.settings.token || !data.settings.repo) {
          deleteModalContent.innerHTML = '<div class="empty-state">GitHub settings not configured.</div>';
          return;
        }

        let { token, repo, branch = 'main' } = data.settings;
        repo = repo.replace('https://github.com/', '').replace('http://github.com/', '').replace(/\.git$/, '').replace(/\/$/, '').trim();
        
        const folderName = `problems/${p.number}-${p.slug}`;

        try {
          const res = await fetch(`https://api.github.com/repos/${repo}/contents/${folderName}?ref=${branch}`, {
            headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }
          });
          
          if (!res.ok) {
            // Might be 404 if it's already deleted
            if (res.status === 404) {
              deleteModalContent.innerHTML = '<p>Problem folder not found on GitHub. It may have already been deleted. You can delete it from local storage.</p>';
              confirmDeleteBtn.disabled = false;
              return;
            }
            throw new Error(`HTTP ${res.status}`);
          }

          const files = await res.json();
          const solutionFiles = files.filter(f => f.name.startsWith('solution') && f.name.match(/\.[a-zA-Z0-9]+$/));

          if (solutionFiles.length <= 1) {
            deleteModalContent.innerHTML = '<p>Are you sure you want to completely delete this problem and all its files from GitHub?</p>';
            confirmDeleteBtn.disabled = false;
          } else {
            // Sort to show highest first
            solutionFiles.sort((a, b) => b.name.localeCompare(a.name));
            
            let html = '<p>Select which solution you want to delete:</p><div class="solution-radio-group">';
            solutionFiles.forEach((file, index) => {
              html += `
                <label class="solution-radio-label">
                  <input type="radio" name="solution-to-delete" value="${file.name}" ${index === 0 ? 'checked' : ''}>
                  ${file.name}
                </label>
              `;
            });
            html += '</div>';
            deleteModalContent.innerHTML = html;
            confirmDeleteBtn.disabled = false;
          }
        } catch (err) {
          deleteModalContent.innerHTML = `<div class="empty-state">Error fetching GitHub data: ${err.message}</div>`;
        }
      });

      problemList.appendChild(div);
    });
  }
});
