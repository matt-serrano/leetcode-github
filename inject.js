// LeetCode -> GitHub Sync Inject Script (MAIN World)
console.log("LC-GH-Sync: Injecting network interceptors (MAIN world)...");

function saveCode(lang, code) {
  if (lang) window.sessionStorage.setItem('lc_gh_last_lang', lang);
  if (code) window.sessionStorage.setItem('lc_gh_last_code', code);
}

function triggerAccepted() {
  window.dispatchEvent(new CustomEvent('lc_gh_accepted', {
    detail: {
      lang: window.sessionStorage.getItem('lc_gh_last_lang'),
      code: window.sessionStorage.getItem('lc_gh_last_code')
    }
  }));
}

// --- FETCH INTERCEPTOR ---
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  const url = args[0] instanceof Request ? args[0].url : args[0];
  
  if (typeof url === 'string') {
    // REST Submit
    if (url.includes('/submit/')) {
      try {
        window.dispatchEvent(new CustomEvent('lc_gh_submit_start'));
        const options = args[1];
        if (options && options.body) {
          const body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
          saveCode(body.lang, body.typed_code);
        }
      } catch(e) {}
    }
    
    // GraphQL Submit
    if (url.includes('/graphql')) {
      try {
        const options = args[1];
        if (options && options.body) {
          const body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
          if (body.operationName === 'submitCode' || body.operationName === 'submit') {
            window.dispatchEvent(new CustomEvent('lc_gh_submit_start'));
            const vars = body.variables || {};
            saveCode(vars.langSlug || 'unknown', vars.typedCode);
          }
        }
      } catch(e) {}
    }
  }
  
  const response = await originalFetch.apply(this, args);
  
  // REST Check
  if (typeof url === 'string' && url.includes('/check/')) {
    const clone = response.clone();
    clone.json().then(data => {
      if (data.state === 'SUCCESS' && data.status_msg === 'Accepted') {
        triggerAccepted();
      }
    }).catch(e => {});
  }
  return response;
};

// --- XHR INTERCEPTOR ---
const originalXHRSend = XMLHttpRequest.prototype.send;
const originalXHROpen = XMLHttpRequest.prototype.open;

XMLHttpRequest.prototype.open = function(method, url) {
  this._url = url;
  return originalXHROpen.apply(this, arguments);
};

XMLHttpRequest.prototype.send = function(body) {
  if (this._url && this._url.includes('/submit/')) {
    try {
      window.dispatchEvent(new CustomEvent('lc_gh_submit_start'));
      if (typeof body === 'string') {
        const parsed = JSON.parse(body);
        saveCode(parsed.lang, parsed.typed_code);
      }
    } catch(e) {}
  }

  this.addEventListener('load', function() {
    if (this._url && this._url.includes('/check/')) {
      try {
        const data = JSON.parse(this.responseText);
        if (data.state === 'SUCCESS' && data.status_msg === 'Accepted') {
          triggerAccepted();
        }
      } catch(e) {}
    }
  });
  
  return originalXHRSend.apply(this, arguments);
};
