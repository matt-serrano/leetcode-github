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
  
  const codeContainer = document.getElementById('codeContainer');
  const codeLanguage = document.getElementById('codeLanguage');
  const codeScroller = document.getElementById('codeScroller');
  const codeBlock = document.getElementById('codeBlock');
  
  const ghTokenInput = document.getElementById('ghToken');
  const ghRepoInput = document.getElementById('ghRepo');
  const ghBranchInput = document.getElementById('ghBranch');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
  const settingsStatus = document.getElementById('settingsStatus');

  let problems = [];

  function getProblemFolder(problem) {
    const repoUrlFolder = (problem.github_repo_url || '').match(/\/(problems\/[^/?#]+)/);
    if (repoUrlFolder) {
      try {
        return decodeURIComponent(repoUrlFolder[1]);
      } catch (err) {
        return repoUrlFolder[1];
      }
    }

    if (problem.slug) {
      return `problems/${problem.number}-${problem.slug}`;
    }

    const titleSlug = (problem.title || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return `problems/${problem.number}-${titleSlug}`;
  }

  function getProblemSlug(problem) {
    if (problem.slug) return problem.slug;

    const folder = getProblemFolder(problem);
    const prefix = `${problem.number}-`;
    const folderName = folder.split('/').pop() || '';
    if (folderName.startsWith(prefix)) {
      return folderName.slice(prefix.length);
    }

    return folderName.replace(/^[^-]+-/, '');
  }

  const LANGUAGE_KEYWORDS = {
    py: new Set([
      'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def',
      'del', 'elif', 'else', 'except', 'False', 'finally', 'for', 'from', 'global',
      'if', 'import', 'in', 'is', 'lambda', 'None', 'nonlocal', 'not', 'or', 'pass',
      'raise', 'return', 'True', 'try', 'while', 'with', 'yield', 'self'
    ]),
    js: new Set([
      'async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue',
      'debugger', 'default', 'delete', 'do', 'else', 'export', 'extends', 'false',
      'finally', 'for', 'from', 'function', 'if', 'import', 'in', 'instanceof',
      'let', 'new', 'null', 'of', 'return', 'static', 'super', 'switch', 'this',
      'throw', 'true', 'try', 'typeof', 'undefined', 'var', 'void', 'while', 'yield'
    ]),
    ts: new Set([
      'abstract', 'any', 'as', 'async', 'await', 'boolean', 'break', 'case', 'catch',
      'class', 'const', 'continue', 'default', 'delete', 'do', 'else', 'enum',
      'export', 'extends', 'false', 'finally', 'for', 'from', 'function', 'if',
      'implements', 'import', 'in', 'instanceof', 'interface', 'let', 'new', 'null',
      'number', 'of', 'private', 'protected', 'public', 'readonly', 'return',
      'static', 'string', 'super', 'switch', 'this', 'throw', 'true', 'try', 'type',
      'typeof', 'undefined', 'var', 'void', 'while', 'yield'
    ]),
    java: new Set([
      'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char',
      'class', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum',
      'extends', 'false', 'final', 'finally', 'float', 'for', 'if', 'implements',
      'import', 'instanceof', 'int', 'interface', 'long', 'new', 'null', 'package',
      'private', 'protected', 'public', 'return', 'short', 'static', 'strictfp',
      'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient',
      'true', 'try', 'void', 'volatile', 'while'
    ]),
    cpp: new Set([
      'auto', 'bool', 'break', 'case', 'catch', 'char', 'class', 'const', 'continue',
      'default', 'delete', 'do', 'double', 'else', 'enum', 'false', 'float', 'for',
      'if', 'include', 'int', 'long', 'namespace', 'new', 'nullptr', 'private',
      'protected', 'public', 'return', 'short', 'signed', 'sizeof', 'static',
      'struct', 'switch', 'template', 'this', 'throw', 'true', 'try', 'typedef',
      'typename', 'unsigned', 'using', 'vector', 'void', 'while'
    ]),
    c: new Set([
      'auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do',
      'double', 'else', 'enum', 'extern', 'float', 'for', 'if', 'include', 'int',
      'long', 'register', 'return', 'short', 'signed', 'sizeof', 'static', 'struct',
      'switch', 'typedef', 'union', 'unsigned', 'void', 'volatile', 'while'
    ]),
    cs: new Set([
      'abstract', 'as', 'async', 'await', 'bool', 'break', 'case', 'catch', 'class',
      'const', 'continue', 'decimal', 'default', 'delegate', 'do', 'double', 'else',
      'enum', 'event', 'false', 'finally', 'float', 'for', 'foreach', 'if', 'in',
      'int', 'interface', 'is', 'long', 'namespace', 'new', 'null', 'object',
      'override', 'private', 'protected', 'public', 'readonly', 'return', 'sealed',
      'static', 'string', 'struct', 'switch', 'this', 'throw', 'true', 'try',
      'using', 'var', 'virtual', 'void', 'while'
    ]),
    go: new Set([
      'break', 'case', 'chan', 'const', 'continue', 'default', 'defer', 'else',
      'fallthrough', 'for', 'func', 'go', 'goto', 'if', 'import', 'interface',
      'map', 'nil', 'package', 'range', 'return', 'select', 'struct', 'switch',
      'type', 'var'
    ]),
    rb: new Set([
      'BEGIN', 'END', 'alias', 'and', 'begin', 'break', 'case', 'class', 'def',
      'defined?', 'do', 'else', 'elsif', 'end', 'ensure', 'false', 'for', 'if',
      'in', 'module', 'next', 'nil', 'not', 'or', 'redo', 'rescue', 'retry',
      'return', 'self', 'super', 'then', 'true', 'undef', 'unless', 'until',
      'when', 'while', 'yield'
    ]),
    rs: new Set([
      'as', 'async', 'await', 'break', 'const', 'continue', 'crate', 'dyn', 'else',
      'enum', 'extern', 'false', 'fn', 'for', 'if', 'impl', 'in', 'let', 'loop',
      'match', 'mod', 'move', 'mut', 'pub', 'ref', 'return', 'self', 'Self',
      'static', 'struct', 'super', 'trait', 'true', 'type', 'unsafe', 'use',
      'where', 'while'
    ])
  };

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/"/g, '&quot;');
  }

  function normalizeRepo(input) {
    let value = String(input || '').trim();
    if (/^https?:\/\//i.test(value)) {
      const url = new URL(value);
      if (url.hostname !== 'github.com') throw new Error('Repository must be on github.com.');
      value = url.pathname.replace(/^\/+/, '');
    }
    value = value.replace(/\.git$/i, '').replace(/\/+$/, '');
    if (!/^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/.test(value)) {
      throw new Error('Repository must use owner/repo.');
    }
    return value;
  }

  function normalizeBranch(input) {
    const value = String(input || 'main').trim();
    if (
      !/^[A-Za-z0-9._/-]{1,255}$/.test(value) ||
      value.startsWith('/') ||
      value.endsWith('/') ||
      value.includes('..') ||
      value.includes('//') ||
      value.includes('@{') ||
      value.endsWith('.lock')
    ) {
      throw new Error('Branch name contains unsupported characters.');
    }
    return value;
  }

  function normalizeDifficulty(value) {
    return ['Easy', 'Medium', 'Hard'].includes(value) ? value : 'Unknown';
  }

  function createProblemLink(url) {
    const link = document.createElement('a');
    link.textContent = 'View in Repo';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';

    try {
      const parsed = new URL(String(url || ''));
      if (parsed.protocol === 'https:' && parsed.hostname === 'github.com') {
        link.href = parsed.href;
        return link;
      }
    } catch (err) {}

    const fallback = document.createElement('span');
    fallback.textContent = 'Repo link unavailable';
    return fallback;
  }

  function getKeywordSet(ext) {
    if (ext === 'jsx') return LANGUAGE_KEYWORDS.js;
    if (ext === 'tsx') return LANGUAGE_KEYWORDS.ts;
    if (ext === 'cc' || ext === 'cxx' || ext === 'h' || ext === 'hpp') return LANGUAGE_KEYWORDS.cpp;
    return LANGUAGE_KEYWORDS[ext] || LANGUAGE_KEYWORDS.js;
  }

  function getTokenPattern(ext) {
    if (ext === 'py' || ext === 'rb') {
      return /("""[\s\S]*?"""|'''[\s\S]*?'''|#[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*\b|[{}()[\].,;:+\-*/%=&|!<>^~?]+)/g;
    }

    return /(\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*\b|[{}()[\].,;:+\-*/%=&|!<>^~?]+)/g;
  }

  function highlightCode(code, ext) {
    const keywords = getKeywordSet(ext);
    const pattern = getTokenPattern(ext);
    let highlighted = '';
    let lastIndex = 0;

    code.replace(pattern, (token, _capture, offset) => {
      highlighted += escapeHtml(code.slice(lastIndex, offset));
      const escaped = escapeHtml(token);

      if (/^(\/\/|\/\*|#)/.test(token)) {
        highlighted += `<span class="tok-comment">${escaped}</span>`;
      } else if (/^(["'`])/.test(token) || token.startsWith('"""') || token.startsWith("'''")) {
        highlighted += `<span class="tok-string">${escaped}</span>`;
      } else if (/^\d/.test(token)) {
        highlighted += `<span class="tok-number">${escaped}</span>`;
      } else if (keywords.has(token)) {
        highlighted += `<span class="tok-keyword">${escaped}</span>`;
      } else if (/^[{}()[\]]+$/.test(token)) {
        highlighted += `<span class="tok-bracket">${escaped}</span>`;
      } else if (/^[.,;:+\-*/%=&|!<>^~?]+$/.test(token)) {
        highlighted += `<span class="tok-operator">${escaped}</span>`;
      } else {
        highlighted += escaped;
      }

      lastIndex = offset + token.length;
      return token;
    });

    return highlighted + escapeHtml(code.slice(lastIndex));
  }

  function showCodeMessage(message) {
    codeBlock.className = 'code-message';
    codeBlock.textContent = message;
  }

  function showHighlightedCode(code, ext) {
    codeBlock.className = '';
    codeBlock.innerHTML = highlightCode(code, ext);
    resetCodeScroll();
  }

  function resetCodeScroll() {
    notesView.scrollTop = 0;
    notesView.scrollLeft = 0;

    if (codeScroller) {
      codeScroller.scrollTop = 0;
      codeScroller.scrollLeft = 0;
    }
  }

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
    let repo;
    let branch;

    if (!token || !ghRepoInput.value.trim()) {
      settingsStatus.textContent = 'Token and Repo are required.';
      settingsStatus.className = 'status-error';
      return;
    }

    if (!/^(gh[pousr]_|github_pat_)[A-Za-z0-9_]+/.test(token)) {
      settingsStatus.textContent = 'GitHub token format is not recognized.';
      settingsStatus.className = 'status-error';
      return;
    }

    try {
      repo = normalizeRepo(ghRepoInput.value);
      branch = normalizeBranch(ghBranchInput.value);
    } catch (err) {
      settingsStatus.textContent = err.message;
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
        slug: getProblemSlug(currentProblemToDelete),
        folderName: getProblemFolder(currentProblemToDelete),
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
    let filtered = problems.map(p => {
      const title = (p.title || '').toLowerCase();
      const num = (p.number || '').toString();
      
      let score = -1;
      if (searchTerm) {
        if (num === searchTerm) score = 100;
        else if (title === searchTerm) score = 50;
        else if (title.startsWith(searchTerm)) score = 30;
        else if (num.startsWith(searchTerm)) score = 10;
        else if (title.includes(searchTerm)) score = 0;
      } else {
        score = 0; // Everything passes if no search term
      }
      
      return { problem: p, score: score };
    }).filter(item => item.score >= 0);

    // Sort
    filtered.sort((a, b) => {
      // If searching, relevance overrides other sorts
      if (searchTerm && a.score !== b.score) {
        return b.score - a.score;
      }
      
      // Fallback to dropdown sort
      const pA = a.problem;
      const pB = b.problem;
      if (sortBy === 'dateDesc') {
        return new Date(pB.solved_at) - new Date(pA.solved_at);
      } else if (sortBy === 'dateAsc') {
        return new Date(pA.solved_at) - new Date(pB.solved_at);
      } else if (sortBy === 'difficulty') {
        const order = { 'Easy': 1, 'Medium': 2, 'Hard': 3 };
        return (order[pA.difficulty] || 0) - (order[pB.difficulty] || 0);
      } else if (sortBy === 'number') {
        return parseInt(pA.number) - parseInt(pB.number);
      }
      return 0;
    });

    // Render
    problemList.innerHTML = '';
    
    if (filtered.length === 0) {
      problemList.innerHTML = '<div class="empty-state">No matching problems found.</div>';
      return;
    }

    filtered.forEach(item => {
      const p = item.problem;
      const div = document.createElement('div');
      div.className = 'problem-item';
      
      const date = new Date(p.solved_at).toLocaleDateString();
      
      const difficulty = normalizeDifficulty(p.difficulty);
      const header = document.createElement('div');
      header.className = 'problem-header';
      const titleWrap = document.createElement('div');
      titleWrap.className = 'problem-title';

      const dot = document.createElement('span');
      dot.className = `difficulty-dot dot-${difficulty}`;
      dot.setAttribute('aria-hidden', 'true');

      const title = document.createElement('span');
      title.textContent = `${p.number}. ${p.title || 'Untitled Problem'}`;
      titleWrap.append(dot, title);

      const difficultyEl = document.createElement('div');
      difficultyEl.className = `difficulty diff-${difficulty}`;
      difficultyEl.textContent = difficulty;
      header.append(titleWrap, difficultyEl);

      const actions = document.createElement('div');
      actions.className = 'problem-actions';

      const dateEl = document.createElement('span');
      dateEl.textContent = date;

      const actionsRight = document.createElement('div');
      actionsRight.className = 'actions-right';
      actionsRight.appendChild(createProblemLink(p.github_repo_url));

      const trashButton = document.createElement('button');
      trashButton.className = 'trash-btn';
      trashButton.title = 'Delete Problem';
      trashButton.dataset.number = String(p.number || '');
      trashButton.textContent = 'Delete';
      actionsRight.appendChild(trashButton);
      actions.append(dateEl, actionsRight);

      const inlineDelete = document.createElement('div');
      inlineDelete.className = 'inline-delete';
      inlineDelete.setAttribute('aria-live', 'polite');

      const inlineCopy = document.createElement('div');
      inlineCopy.className = 'inline-delete-copy';
      const inlineTitle = document.createElement('strong');
      inlineTitle.textContent = 'Delete this solution?';
      const inlineText = document.createElement('span');
      inlineText.textContent = 'This removes the saved problem folder from GitHub and your log.';
      inlineCopy.append(inlineTitle, inlineText);

      const inlineActions = document.createElement('div');
      inlineActions.className = 'inline-delete-actions';
      const inlineCancelButton = document.createElement('button');
      inlineCancelButton.className = 'secondary-btn inline-cancel-btn';
      inlineCancelButton.type = 'button';
      inlineCancelButton.textContent = 'Cancel';
      const inlineDeleteButton = document.createElement('button');
      inlineDeleteButton.className = 'danger-btn inline-delete-btn';
      inlineDeleteButton.type = 'button';
      inlineDeleteButton.textContent = 'Delete';
      inlineActions.append(inlineCancelButton, inlineDeleteButton);

      const inlineDeleteStatusEl = document.createElement('div');
      inlineDeleteStatusEl.className = 'inline-delete-status';
      inlineDelete.append(inlineCopy, inlineActions, inlineDeleteStatusEl);

      div.append(header, actions, inlineDelete);
      
      // View Notes & Code logic
      div.addEventListener('click', async (e) => {
        // Prevent opening notes if user clicks a button/link inside
        if (e.target.closest('a') || e.target.closest('.trash-btn') || e.target.closest('.inline-delete')) {
          return;
        }
        
        notesProblemTitle.textContent = `${p.number}. ${p.title}`;
        notesContent.textContent = p.notes ? p.notes : 'No notes added for this problem.';
        
        codeContainer.style.display = 'flex';
        codeLanguage.textContent = 'FETCHING...';
        showCodeMessage('Loading code from GitHub...');
        resetCodeScroll();
        
        homepageView.classList.remove('active');
        notesView.classList.add('active');
        resetCodeScroll();

        // Fetch settings
        const data = await chrome.storage.local.get(['settings']);
        if (!data.settings || !data.settings.token || !data.settings.repo) {
          showCodeMessage('GitHub settings not configured. Cannot fetch code.');
          codeLanguage.textContent = 'ERROR';
          return;
        }

        const { token } = data.settings;
        const repo = normalizeRepo(data.settings.repo);
        const branch = normalizeBranch(data.settings.branch);
        const folderName = getProblemFolder(p);

        try {
          const res = await fetch(`https://api.github.com/repos/${repo}/contents/${folderName}?ref=${encodeURIComponent(branch)}`, {
            headers: {
              'Authorization': `Bearer ${String(token).trim()}`,
              'Accept': 'application/vnd.github.v3+json',
              'X-GitHub-Api-Version': '2022-11-28'
            }
          });
          
          if (!res.ok) {
            if (res.status === 404) {
              showCodeMessage('Code not found on GitHub. The repository folder may have been deleted or the branch is incorrect.');
              codeLanguage.textContent = '404';
              return;
            }
            throw new Error(`HTTP ${res.status}`);
          }

          const files = await res.json();
          const solutionFiles = files.filter(f => f.name.startsWith('solution') && f.name.match(/\.[a-zA-Z0-9]+$/));

          if (solutionFiles.length === 0) {
            showCodeMessage('No solution files found in this directory.');
            codeLanguage.textContent = 'ERROR';
            return;
          }

          // Sort to find the latest
          solutionFiles.sort((a, b) => {
            if (a.name.length !== b.name.length) return b.name.length - a.name.length;
            return b.name.localeCompare(a.name);
          });
          const latestFile = solutionFiles[0];
          
          const ext = latestFile.name.split('.').pop();
          codeLanguage.textContent = ext;

          // Fetch file content
          const fileRes = await fetch(latestFile.url, {
            headers: {
              'Authorization': `Bearer ${String(token).trim()}`,
              'Accept': 'application/vnd.github.v3+json',
              'X-GitHub-Api-Version': '2022-11-28'
            }
          });
          
          if (!fileRes.ok) throw new Error(`HTTP ${fileRes.status}`);
          
          const fileData = await fileRes.json();
          const cleanB64 = fileData.content.replace(/\n/g, '');
          const decodedCode = decodeURIComponent(escape(atob(cleanB64)));
          
          showHighlightedCode(decodedCode, ext);

        } catch (err) {
          showCodeMessage(`Error fetching GitHub data: ${err.message}`);
          codeLanguage.textContent = 'ERROR';
        }
      });
      
      // Bind delete button
      const trashBtn = trashButton;
      const inlineCancelBtn = inlineCancelButton;
      const inlineDeleteBtn = inlineDeleteButton;
      const inlineDeleteStatus = inlineDeleteStatusEl;

      trashBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.inline-delete.active').forEach(panel => {
          if (panel !== inlineDelete) panel.classList.remove('active');
        });
        inlineDelete.classList.add('active');
        inlineDeleteStatus.textContent = '';
        inlineDeleteStatus.className = 'inline-delete-status';
      });

      inlineCancelBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        inlineDelete.classList.remove('active');
        inlineDeleteStatus.textContent = '';
      });

      inlineDeleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        inlineDeleteBtn.disabled = true;
        inlineDeleteBtn.textContent = 'Deleting...';
        inlineDeleteStatus.className = 'inline-delete-status';
        inlineDeleteStatus.textContent = '';

        chrome.runtime.sendMessage({
          type: 'DELETE_SOLUTION',
          payload: {
            number: p.number,
            slug: getProblemSlug(p),
            folderName: getProblemFolder(p),
            file: null
          }
        }, (response) => {
          inlineDeleteBtn.disabled = false;
          inlineDeleteBtn.textContent = 'Delete';

          if (chrome.runtime.lastError || !response || !response.success) {
            inlineDeleteStatus.className = 'inline-delete-status status-error';
            inlineDeleteStatus.textContent = (response && response.error) || 'Failed to delete. Check settings.';
            return;
          }

          problems = problems.filter(problem => problem.number !== p.number);
          chrome.storage.local.set({ syncedProblems: problems }, renderProblems);
        });
      });

      problemList.appendChild(div);
    });
  }
});
