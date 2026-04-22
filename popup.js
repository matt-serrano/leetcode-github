document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const homepageView = document.getElementById('homepageView');
  const settingsView = document.getElementById('settingsView');
  const settingsBtn = document.getElementById('settingsBtn');
  
  const toggleDetection = document.getElementById('toggleDetection');
  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');
  const problemList = document.getElementById('problemList');
  
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
      const notesSnippet = p.notes ? p.notes : 'No notes added.';
      
      div.innerHTML = `
        <div class="problem-header">
          <div class="problem-title">${p.number}. ${p.title}</div>
          <div class="difficulty diff-${p.difficulty}">${p.difficulty}</div>
        </div>
        <div class="problem-notes">${notesSnippet}</div>
        <div class="problem-actions">
          <span>${date}</span>
          <a href="${p.github_repo_url}" target="_blank">View in Repo</a>
        </div>
      `;
      problemList.appendChild(div);
    });
  }
});
