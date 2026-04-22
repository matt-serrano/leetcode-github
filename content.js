// LeetCode -> GitHub Sync Content Script

// Network interceptors have been moved to inject.js (MAIN world) to bypass CSP

// 2. DOM MutationObserver Fallback for "Accepted"
let acceptedFired = false;

window.addEventListener('lc_gh_submit_start', () => {
  acceptedFired = false;
});

const observer = new MutationObserver((mutations) => {
  if (acceptedFired) return;
  for (const m of mutations) {
    if (m.addedNodes.length > 0 || m.type === 'characterData') {
      // Look for the success text in the submission panel
      const successElements = document.querySelectorAll('[data-e2e-locator="submission-result"], .text-success, .text-green-s');
      for (const el of successElements) {
        if (el.textContent.includes('Accepted')) {
          acceptedFired = true;
          console.log("LC-GH-Sync: Detected 'Accepted' via DOM observer");
          // Give network interceptor a chance to fire first
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('lc_gh_accepted', {
              detail: {
                lang: window.sessionStorage.getItem('lc_gh_last_lang'),
                code: window.sessionStorage.getItem('lc_gh_last_code')
              }
            }));
          }, 500);
          
          return;
        }
      }
    }
  }
});
observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });


// 3. Fallback Code Extractor
function extractCodeFromDOM() {
  const lines = document.querySelectorAll('.view-lines .view-line');
  if (lines.length > 0) {
    return Array.from(lines).map(line => line.textContent.replace(/\u00a0/g, ' ')).join('\n');
  }
  return null;
}

// 4. Fetch Problem Details
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
    return data.data.question; 
  } catch (e) {
    console.error("LC-GH-Sync: Error fetching problem details", e);
    return null;
  }
}

// 5. Inject Modal UI into page
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
          <div class="lc-gh-title" id="lc-gh-title">Loading...</div>
          <div class="lc-gh-tags">
            <span class="lc-gh-tag" id="lc-gh-difficulty">--</span>
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
let modalOpenTime = 0;

window.addEventListener('lc_gh_accepted', async (e) => {
  // Prevent duplicate modals if fired multiple times (e.g., from network + DOM fallback)
  if (Date.now() - modalOpenTime < 5000) return;

  const data = await chrome.storage.local.get(['detectionEnabled']);
  if (data.detectionEnabled === false) return;

  let { lang, code } = e.detail || {};
  
  // Fallbacks
  if (!code || code === 'undefined') code = extractCodeFromDOM();
  if (!lang || lang === 'undefined') lang = 'python3'; // safe fallback
  if (!code) {
    console.error("LC-GH-Sync: Could not extract code.");
    return;
  }

  const match = window.location.pathname.match(/\/problems\/([^\/]+)/);
  if (!match) return;
  const slug = match[1];

  let problemDetails = await fetchProblemDetails(slug);
  if (!problemDetails) {
    problemDetails = {
      title: slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      questionFrontendId: '?',
      difficulty: 'Unknown'
    };
  }

  currentSubmissionData = {
    lang,
    code,
    slug,
    title: problemDetails.title,
    number: problemDetails.questionFrontendId,
    difficulty: problemDetails.difficulty,
    date: new Date().toISOString()
  };

  modalOpenTime = Date.now();
  showModal(currentSubmissionData);
});

function showModal(data) {
  createModal();
  document.getElementById('lc-gh-title').textContent = `${data.number}. ${data.title}`;
  
  const diffEl = document.getElementById('lc-gh-difficulty');
  diffEl.textContent = data.difficulty;
  diffEl.className = `lc-gh-tag lc-gh-tag-${data.difficulty}`;
  
  document.getElementById('lc-gh-date').textContent = new Date(data.date).toLocaleDateString();
  
  modalContainer.classList.add('visible');
}
