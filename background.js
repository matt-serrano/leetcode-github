// LeetCode -> GitHub Sync Service Worker

const LANG_TO_EXT = {
  'python': 'py',
  'python3': 'py',
  'cpp': 'cpp',
  'java': 'java',
  'c': 'c',
  'csharp': 'cs',
  'javascript': 'js',
  'typescript': 'ts',
  'php': 'php',
  'swift': 'swift',
  'kotlin': 'kt',
  'dart': 'dart',
  'golang': 'go',
  'ruby': 'rb',
  'scala': 'scala',
  'rust': 'rs',
  'racket': 'rkt',
  'erlang': 'erl',
  'elixir': 'ex',
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'COMMIT_SOLUTION') {
    handleCommit(message.payload).then(sendResponse);
    return true; // Keep message channel open for async response
  }
});

async function handleCommit(data) {
  try {
    const { settings } = await chrome.storage.local.get(['settings']);
    if (!settings || !settings.token || !settings.repo) {
      return { success: false, error: 'GitHub Token or Repo not configured.' };
    }

    let { token, repo, branch = 'main' } = settings;
    // Sanitize repo string in case user pasted the full URL or .git
    repo = repo.replace('https://github.com/', '')
               .replace('http://github.com/', '')
               .replace(/\.git$/, '')
               .replace(/\/$/, '')
               .trim();
    
    const { lang, code, slug, title, number, difficulty, date, notes } = data;
    
    const ext = LANG_TO_EXT[lang] || 'txt';
    const folderName = `problems/${number}-${slug}`;
    
    // 1. Check existing files in the directory to handle multiple solutions
    let solutionFileName = `solution.${ext}`;
    const existingFiles = await fetchGitHubAPI(`/repos/${repo}/contents/${folderName}?ref=${branch}`, token);
    
    if (Array.isArray(existingFiles)) {
      // Directory exists, check for existing solution files
      const solutionFiles = existingFiles.filter(f => f.name.startsWith('solution') && f.name.endsWith(`.${ext}`));
      if (solutionFiles.length > 0) {
        solutionFileName = `solution_${solutionFiles.length + 1}.${ext}`;
      }
    }

    // 2. Prepare files for the Tree API
    const metaJson = {
      id: number,
      title,
      slug,
      difficulty,
      language: lang,
      solved_at: date,
      source: 'leetcode',
      url: `https://leetcode.com/problems/${slug}/`,
      github_repo_url: `https://github.com/${repo}/tree/${branch}/${folderName}`
    };

    const filesToCommit = [
      { path: `${folderName}/${solutionFileName}`, content: code },
      { path: `${folderName}/meta.json`, content: JSON.stringify(metaJson, null, 2) }
    ];

    if (notes) {
      filesToCommit.push({ path: `${folderName}/notes.md`, content: notes });
    }

    // 3. GitHub Git Database API (Tree/Commits) to commit all files at once
    
    // a. Get Ref (to get current commit SHA)
    let refData;
    try {
      refData = await fetchGitHubAPI(`/repos/${repo}/git/ref/heads/${branch}`, token);
    } catch (err) {
      if (err.message.includes('404')) {
        throw new Error(`Branch '${branch}' not found in '${repo}'. Ensure the repo is not completely empty (add a README) and branch is correct.`);
      }
      throw err;
    }
    
    if (!refData || !refData.object) {
      throw new Error(`Branch ${branch} not found.`);
    }
    const currentCommitSha = refData.object.sha;

    // b. Get Commit (to get tree SHA)
    const commitData = await fetchGitHubAPI(`/repos/${repo}/git/commits/${currentCommitSha}`, token);
    const baseTreeSha = commitData.tree.sha;

    // c. Create Tree
    const treePayload = {
      base_tree: baseTreeSha,
      tree: filesToCommit.map(f => ({
        path: f.path,
        mode: '100644',
        type: 'blob',
        content: f.content
      }))
    };
    const newTreeData = await fetchGitHubAPI(`/repos/${repo}/git/trees`, token, 'POST', treePayload);
    
    // d. Create Commit
    const commitPayload = {
      message: `Sync LeetCode: ${number}. ${title} (${lang})`,
      tree: newTreeData.sha,
      parents: [currentCommitSha]
    };
    const newCommitData = await fetchGitHubAPI(`/repos/${repo}/git/commits`, token, 'POST', commitPayload);

    // e. Update Ref
    await fetchGitHubAPI(`/repos/${repo}/git/refs/heads/${branch}`, token, 'PATCH', { sha: newCommitData.sha });

    // 4. Update local storage with the new synced problem
    await saveProblemLocally({
      number, title, difficulty, solved_at: date, notes, github_repo_url: metaJson.github_repo_url
    });

    return { success: true };
  } catch (error) {
    console.error("LC-GH-Sync Commit Error:", error);
    return { success: false, error: error.message };
  }
}

async function fetchGitHubAPI(endpoint, token, method = 'GET', body = null) {
  const headers = {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json'
  };
  
  const options = { method, headers };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`https://api.github.com${endpoint}`, options);
  
  // If 404 on getting contents, it just means directory doesn't exist yet, which is fine
  if (res.status === 404 && method === 'GET' && endpoint.includes('/contents/')) {
    return null; 
  }
  
  if (!res.ok) {
    let errorMsg = res.statusText;
    try {
      const err = await res.json();
      if (err.message) errorMsg = err.message;
    } catch(e){}
    throw new Error(`GitHub API Error: ${res.status} ${errorMsg}`);
  }
  
  return await res.json();
}

async function saveProblemLocally(problemData) {
  const data = await chrome.storage.local.get(['syncedProblems']);
  let problems = data.syncedProblems || [];
  
  // Check if it already exists, update it or add new
  const index = problems.findIndex(p => p.number === problemData.number);
  if (index >= 0) {
    // If solved again, maybe append notes or just update date
    problems[index].solved_at = problemData.solved_at;
    if (problemData.notes) {
      problems[index].notes = problems[index].notes 
        ? problems[index].notes + "\n---\n" + problemData.notes 
        : problemData.notes;
    }
  } else {
    problems.unshift(problemData); // Add to beginning
  }
  
  await chrome.storage.local.set({ syncedProblems: problems });
}
