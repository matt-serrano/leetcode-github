// LeetCode -> GitHub Sync Content Script

// 1. Inject fetch interceptor to capture submission code and "Accepted" status
const script = document.createElement('script');
script.textContent = `
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const url = args[0] instanceof Request ? args[0].url : args[0];
    
    // Intercept submission POST to grab code and language
    if (url.includes('/submit/')) {
      try {
        const options = args[1];
        if (options && options.body) {
          const body = JSON.parse(options.body);
          if (body.lang && body.typed_code) {
            window.sessionStorage.setItem('lc_gh_last_lang', body.lang);
            window.sessionStorage.setItem('lc_gh_last_code', body.typed_code);
          }
        }
      } catch(e) { console.error("LC-GH-Sync: Error parsing submit body", e); }
    }
    
    const response = await originalFetch.apply(this, args);
    
    // Intercept submission check GET to detect "Accepted"
    if (url.includes('/check/')) {
      const clone = response.clone();
      clone.json().then(data => {
        if (data.state === 'SUCCESS' && data.status_msg === 'Accepted') {
          window.dispatchEvent(new CustomEvent('lc_gh_accepted', {
            detail: {
              lang: window.sessionStorage.getItem('lc_gh_last_lang'),
              code: window.sessionStorage.getItem('lc_gh_last_code')
            }
          }));
        }
      }).catch(e => {});
    }
    return response;
  };
`;
document.documentElement.appendChild(script);
script.remove();

// 2. Fetch Problem Details via GraphQL
async function fetchProblemDetails(slug) {
  const query = `
    query questionTitle($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        questionFrontendId
        title
        difficulty
      }
    }
  `;
  try {
    const res = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { titleSlug: slug } })
    });
    const data = await res.json();
    return data.data.question; // { questionFrontendId, title, difficulty }
  } catch (e) {
    console.error("LC-GH-Sync: Error fetching problem details", e);
    return null;
  }
}

// 3. Inject Modal UI into page
let modalContainer = null;

function createModal() {
  if (modalContainer) return;
  modalContainer = document.createElement('div');
  modalContainer.id = 'lc-gh-sync-overlay';
  modalContainer.innerHTML = `
    <div id="lc-gh-sync-modal">
      <div class="lc-gh-header">
        <h2>Successful Submission!</h2>
        <button class="lc-gh-close" id="lc-gh-close-btn">&times;</button>
      </div>
      <div class="lc-gh-body">
        <div class="lc-gh-meta">
          <div class="lc-gh-title" id="lc-gh-title">1. Two Sum</div>
          <div class="lc-gh-tags">
            <span class="lc-gh-tag" id="lc-gh-difficulty">Easy</span>
            <span class="lc-gh-tag" id="lc-gh-date"></span>
          </div>
        </div>
        <div class="lc-gh-notes-container">
          <textarea id="lc-gh-notes" placeholder="Add notes (Optional)"></textarea>
        </div>
        <div class="lc-gh-status" id="lc-gh-status"></div>
      </div>
      <div class="lc-gh-footer">
        <button class="lc-gh-btn lc-gh-btn-cancel" id="lc-gh-cancel-btn">Cancel</button>
        <button class="lc-gh-btn lc-gh-btn-commit" id="lc-gh-commit-btn">Commit to Github Without Notes</button>
      </div>
    </div>
  `;
  document.body.appendChild(modalContainer);

  const closeBtn = document.getElementById('lc-gh-close-btn');
  const cancelBtn = document.getElementById('lc-gh-cancel-btn');
  const commitBtn = document.getElementById('lc-gh-commit-btn');
  const notesArea = document.getElementById('lc-gh-notes');

  const close = () => {
    modalContainer.classList.remove('visible');
    setTimeout(() => {
      document.getElementById('lc-gh-status').style.display = 'none';
      notesArea.value = '';
      commitBtn.textContent = 'Commit to Github Without Notes';
      commitBtn.disabled = false;
    }, 300);
  };

  closeBtn.addEventListener('click', close);
  cancelBtn.addEventListener('click', close);

  notesArea.addEventListener('input', (e) => {
    if (e.target.value.trim().length > 0) {
      commitBtn.textContent = 'Commit to Github';
    } else {
      commitBtn.textContent = 'Commit to Github Without Notes';
    }
  });

  commitBtn.addEventListener('click', async () => {
    commitBtn.disabled = true;
    commitBtn.textContent = 'Committing...';
    const statusEl = document.getElementById('lc-gh-status');
    statusEl.className = 'lc-gh-status';
    statusEl.textContent = 'Sending to GitHub...';
    statusEl.style.display = 'block';

    const notes = notesArea.value.trim();
    
    // Send message to background script
    chrome.runtime.sendMessage({
      type: 'COMMIT_SOLUTION',
      payload: { ...currentSubmissionData, notes }
    }, (response) => {
      if (chrome.runtime.lastError || !response || !response.success) {
        statusEl.className = 'lc-gh-status error';
        statusEl.textContent = (response && response.error) || 'Failed to commit. Check settings.';
        commitBtn.disabled = false;
        commitBtn.textContent = notes ? 'Commit to Github' : 'Commit to Github Without Notes';
      } else {
        statusEl.className = 'lc-gh-status success';
        statusEl.textContent = 'Committed successfully!';
        setTimeout(close, 2000);
      }
    });
  });
}

let currentSubmissionData = null;

// 4. Handle "Accepted" event
window.addEventListener('lc_gh_accepted', async (e) => {
  // Check if detection is enabled
  const data = await chrome.storage.local.get(['detectionEnabled']);
  if (data.detectionEnabled === false) return; // Enabled by default if undefined

  const { lang, code } = e.detail;
  if (!lang || !code) return;

  const match = window.location.pathname.match(/\\/problems\\/([^\\/]+)/);
  if (!match) return;
  const slug = match[1];

  const problemDetails = await fetchProblemDetails(slug);
  if (!problemDetails) return;

  currentSubmissionData = {
    lang,
    code,
    slug,
    title: problemDetails.title,
    number: problemDetails.questionFrontendId,
    difficulty: problemDetails.difficulty,
    date: new Date().toISOString()
  };

  showModal(currentSubmissionData);
});

function showModal(data) {
  createModal();
  document.getElementById('lc-gh-title').textContent = \`\${data.number}. \${data.title}\`;
  
  const diffEl = document.getElementById('lc-gh-difficulty');
  diffEl.textContent = data.difficulty;
  diffEl.className = \`lc-gh-tag lc-gh-tag-\${data.difficulty}\`;
  
  document.getElementById('lc-gh-date').textContent = new Date(data.date).toLocaleDateString();
  
  modalContainer.classList.add('visible');
}
