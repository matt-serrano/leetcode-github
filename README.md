# CodeNebula

CodeNebula is a Chrome extension that detects accepted LeetCode submissions, saves them to a GitHub repository, and keeps a searchable local log of your solved problems.

## Features

- Detects successful LeetCode submissions
- Commits solution code, metadata, and optional notes to GitHub
- Stores a local solved-problem log in the extension popup
- Lets you search, sort, view, and delete saved problems
- Displays saved code with syntax highlighting
- Supports multiple submissions for the same problem

## Setup

1. Create or choose a GitHub repository for your solutions.
2. Create a GitHub fine-grained personal access token with repository contents read/write access.
3. Open Chrome and go to `chrome://extensions`.
4. Enable `Developer mode`.
5. Click `Load unpacked`.
6. Select this project folder.
7. Open the CodeNebula extension popup.
8. Click the settings icon.
9. Enter:
   - GitHub token
   - Repository as `owner/repo`
   - Branch, usually `main`
10. Save.

## Usage

1. Go to LeetCode and submit a solution.
2. When the submission is accepted, CodeNebula opens a commit prompt.
3. Add optional notes, or commit without notes.
4. Open the extension popup to see your synced problems.
5. Click a problem log to view notes and the saved solution code.
6. Use search and sorting to filter your log.
7. Click the trash icon on a log to delete it from GitHub and your local log.

## GitHub Output

Solutions are saved under:

```text
problems/{problem-number}-{problem-slug}/
```

Each folder can include:

```text
solution.ext
solution_2.ext
meta.json
notes.md
```

## Permissions

CodeNebula uses:

- `storage` to save settings and local problem logs
- `leetcode.com` access to detect accepted submissions
- `api.github.com` access to commit, fetch, and delete saved solutions

## Troubleshooting

If code does not appear in the popup, check that your GitHub repo and branch are correct.

If commits fail, confirm your token has contents read/write access to the selected repository.

If the extension does not detect submissions, reload the extension from `chrome://extensions` and refresh the LeetCode page.

If the toolbar icon or popup design does not update, reload the unpacked extension.

## Development

Main files:

- `manifest.json`: extension configuration
- `content.js`: LeetCode page integration
- `inject.js`: network interception in the page context
- `background.js`: GitHub commit/delete logic
- `popup.html`, `popup.css`, `popup.js`: popup UI
- `assets/`: CodeNebula icons
