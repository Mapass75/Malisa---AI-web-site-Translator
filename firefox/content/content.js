if (globalThis.__MALISA_CONTENT_INIT__) {
  /* already loaded */
} else {
  globalThis.__MALISA_CONTENT_INIT__ = true;

  const UI_LANG_CODES = new Set(['en', 'hr', 'sr', 'de', 'it', 'fr', 'es']);

  const CONTENT_I18N = {
    en: {
      collectingText: 'Collecting text...',
      noTextToTranslate: 'No text to translate',
      translatingOverlay: 'Translating...',
      translatingProgress: 'Translating... {done}/{total} ({pct}%)',
      translationDone: 'Translation complete ✓',
      pageNotReady: 'Page is not ready yet',
      translationNotStarted: 'Translation did not start',
      errorPrefix: 'Error: ',
    },
    hr: {
      collectingText: 'Prikupljam tekst...',
      noTextToTranslate: 'Nema teksta za prijevod',
      translatingOverlay: 'Prevodim...',
      translatingProgress: 'Prevodim... {done}/{total} ({pct}%)',
      translationDone: 'Prijevod završen ✓',
      pageNotReady: 'Stranica još nije spremna',
      translationNotStarted: 'Prijevod nije pokrenut',
      errorPrefix: 'Greška: ',
    },
    sr: {
      collectingText: 'Prikupljam tekst...',
      noTextToTranslate: 'Nema teksta za prevod',
      translatingOverlay: 'Prevođenje...',
      translatingProgress: 'Prevođenje... {done}/{total} ({pct}%)',
      translationDone: 'Prevod završen ✓',
      pageNotReady: 'Stranica još nije spremna',
      translationNotStarted: 'Prevod nije pokrenut',
      errorPrefix: 'Greška: ',
    },
    de: {
      collectingText: 'Text wird gesammelt...',
      noTextToTranslate: 'Kein Text zum Übersetzen',
      translatingOverlay: 'Übersetze...',
      translatingProgress: 'Übersetze... {done}/{total} ({pct}%)',
      translationDone: 'Übersetzung abgeschlossen ✓',
      pageNotReady: 'Seite ist noch nicht bereit',
      translationNotStarted: 'Übersetzung wurde nicht gestartet',
      errorPrefix: 'Fehler: ',
    },
    it: {
      collectingText: 'Raccolta testo...',
      noTextToTranslate: 'Nessun testo da tradurre',
      translatingOverlay: 'Traduzione...',
      translatingProgress: 'Traduzione... {done}/{total} ({pct}%)',
      translationDone: 'Traduzione completata ✓',
      pageNotReady: 'La pagina non è ancora pronta',
      translationNotStarted: 'Traduzione non avviata',
      errorPrefix: 'Errore: ',
    },
    fr: {
      collectingText: 'Collecte du texte...',
      noTextToTranslate: 'Aucun texte à traduire',
      translatingOverlay: 'Traduction...',
      translatingProgress: 'Traduction... {done}/{total} ({pct}%)',
      translationDone: 'Traduction terminée ✓',
      pageNotReady: 'La page n\'est pas encore prête',
      translationNotStarted: 'La traduction n\'a pas démarré',
      errorPrefix: 'Erreur : ',
    },
    es: {
      collectingText: 'Recopilando texto...',
      noTextToTranslate: 'No hay texto para traducir',
      translatingOverlay: 'Traduciendo...',
      translatingProgress: 'Traduciendo... {done}/{total} ({pct}%)',
      translationDone: 'Traducción completada ✓',
      pageNotReady: 'La página aún no está lista',
      translationNotStarted: 'La traducción no se inició',
      errorPrefix: 'Error: ',
    },
  };

  function t(key, lang, vars = {}) {
    let text = CONTENT_I18N[lang]?.[key] ?? CONTENT_I18N.en[key] ?? key;
    for (const [k, v] of Object.entries(vars)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
    return text;
  }

  async function getUiLanguage() {
    const result = await chrome.storage.local.get('settings');
    const lang = result.settings?.uiLanguage;
    return UI_LANG_CODES.has(lang) ? lang : 'en';
  }

  const OVERLAY_THEMES = {
    dark: {
      background: '#1a1a2e',
      color: '#eeeeee',
      boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)',
      border: '1px solid rgba(108, 99, 255, 0.25)',
    },
    light: {
      background: '#ffffff',
      color: '#1a1a2e',
      boxShadow: '0 4px 24px rgba(0, 0, 0, 0.12)',
      border: '1px solid #e0e0ea',
    },
  };

  let translatorThemePref = 'system';
  let systemThemeMq = null;

  function resolveTranslatorTheme(setting) {
    if (setting === 'light' || setting === 'dark') return setting;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  async function loadTranslatorTheme() {
    const result = await chrome.storage.local.get('settings');
    translatorThemePref = result.settings?.translatorTheme ?? 'system';
  }

  function applyOverlayTheme(overlay) {
    const resolved = resolveTranslatorTheme(translatorThemePref);
    const theme = OVERLAY_THEMES[resolved];
    overlay.style.background = theme.background;
    overlay.style.color = theme.color;
    overlay.style.boxShadow = theme.boxShadow;
    overlay.style.border = theme.border;
  }

  function watchSystemOverlayTheme() {
    if (systemThemeMq) {
      systemThemeMq.removeEventListener('change', systemThemeMq._handler);
      systemThemeMq = null;
    }
    if (translatorThemePref !== 'system') return;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const overlay = document.getElementById('ai-translator-overlay');
      if (overlay) applyOverlayTheme(overlay);
    };
    mq.addEventListener('change', handler);
    mq._handler = handler;
    systemThemeMq = mq;
  }

  const SKIP_TAGS = new Set([
    'SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'SVG', 'MATH',
    'TEXTAREA', 'INPUT', 'SELECT', 'OPTION',
  ]);

  const SKIP_SELECTORS = '[contenteditable="true"], [data-ai-translator-skip], .ai-translator-overlay';
  const CANDIDATE_SELECTOR =
    'p, h1, h2, h3, h4, h5, h6, li, td, th, dt, dd, blockquote, figcaption, label, article, button, a, span, strong, b, em, i, small, caption, div';

  let uiLang = 'en';
  let blocks = [];
  let translated = false;
  let activeTargetLanguage = null;
  const blockById = new Map();
  const translationByText = new Map();
  const processedElements = new WeakSet();
  let domObserver = null;
  let rescanTimer = null;

  function isHiddenElement(el) {
    if (!el.isConnected) return true;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return true;
    const rect = el.getBoundingClientRect();
    return rect.width === 0 && rect.height === 0;
  }

  function isSkippableText(text) {
    if (!text || text.length < 1) return true;
    return !/\p{L}/u.test(text);
  }

  function collectCandidateElements() {
    const candidates = [];

    for (const el of document.body.querySelectorAll(CANDIDATE_SELECTOR)) {
      if (SKIP_TAGS.has(el.tagName)) continue;
      if (el.closest(SKIP_SELECTORS)) continue;
      if (isHiddenElement(el)) continue;

      const text = el.innerText?.trim() ?? '';
      if (isSkippableText(text)) continue;

      candidates.push(el);
    }

    return candidates.filter(
      (el) => !candidates.some((other) => other !== el && el.contains(other))
    );
  }

  function collectTextNodes(el) {
    const nodes = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let n = walker.nextNode();
    while (n) {
      if (n.textContent?.trim()) nodes.push(n);
      n = walker.nextNode();
    }
    return nodes;
  }

  function rememberTranslation(original, translated) {
    if (original && translated && original !== translated) {
      translationByText.set(original, translated);
    }
  }

  function extractBlocks() {
    blocks = [];
    blockById.clear();
    let index = 0;

    for (const el of collectCandidateElements()) {
      const text = el.innerText?.trim() ?? '';
      if (isSkippableText(text)) continue;

      const nodes = collectTextNodes(el);
      if (!nodes.length) continue;

      const id = String(index++);
      const block = { id, el, nodes, originalText: text };
      blocks.push(block);
      blockById.set(id, block);
      processedElements.add(el);

      for (const attr of ['aria-label', 'title']) {
        const attrText = el.getAttribute(attr)?.trim() ?? '';
        if (isSkippableText(attrText) || attrText === text) continue;
        const attrId = String(index++);
        const attrBlock = { id: attrId, el, nodes: [], originalText: attrText, attr };
        blocks.push(attrBlock);
        blockById.set(attrId, attrBlock);
      }
    }

    return blocks.map(({ id, originalText }) => ({ id, text: originalText }));
  }

  function applyToBlock(block, translatedText) {
    if (block.attr) {
      block.el.setAttribute(block.attr, translatedText);
      rememberTranslation(block.originalText, translatedText);
      return;
    }
    if (!block.nodes.length) return;
    block.nodes[0].textContent = translatedText;
    for (let i = 1; i < block.nodes.length; i++) {
      block.nodes[i].textContent = '';
    }
    rememberTranslation(block.originalText, translatedText);
  }

  function applyCachedTranslationsToDom() {
    if (!translationByText.size) return;

    for (const el of collectCandidateElements()) {
      const text = el.innerText?.trim() ?? '';
      const translatedText = translationByText.get(text);
      if (!translatedText || text === translatedText) continue;

      const nodes = collectTextNodes(el);
      if (!nodes.length || nodes[0].textContent?.trim() === translatedText) continue;

      nodes[0].textContent = translatedText;
      for (let i = 1; i < nodes.length; i++) {
        nodes[i].textContent = '';
      }
      processedElements.add(el);

      for (const attr of ['aria-label', 'title']) {
        const attrText = el.getAttribute(attr)?.trim() ?? '';
        const attrTranslated = translationByText.get(attrText);
        if (attrTranslated && attrText !== attrTranslated) {
          el.setAttribute(attr, attrTranslated);
        }
      }
    }
  }

  function scheduleDomRescan() {
    clearTimeout(rescanTimer);
    rescanTimer = setTimeout(() => {
      if (!translated) return;
      applyCachedTranslationsToDom();
    }, 250);
  }

  function startDomObserver() {
    if (domObserver || !document.body) return;
    domObserver = new MutationObserver(() => scheduleDomRescan());
    domObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    window.addEventListener('scroll', scheduleDomRescan, { passive: true });
  }

  function stopDomObserver() {
    domObserver?.disconnect();
    domObserver = null;
    window.removeEventListener('scroll', scheduleDomRescan);
    clearTimeout(rescanTimer);
  }

  function applyPartialResults(results) {
    for (const r of results) {
      const block = blockById.get(String(r.id));
      if (block && r.translated) {
        applyToBlock(block, r.translated);
      }
    }
    translated = true;
  }

  function restoreOriginal() {
    for (const block of blocks) {
      if (block.attr) {
        block.el.setAttribute(block.attr, block.originalText);
      } else {
        applyToBlock(block, block.originalText);
      }
    }
    translated = false;
    activeTargetLanguage = null;
    translationByText.clear();
    stopDomObserver();
  }

  function showOverlay(message) {
    let overlay = document.getElementById('ai-translator-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'ai-translator-overlay';
      document.body.appendChild(overlay);
    }
    overlay.textContent = message;
    applyOverlayTheme(overlay);
  }

  function removeOverlay() {
    document.getElementById('ai-translator-overlay')?.remove();
  }

  function injectStyles() {
    if (document.getElementById('ai-translator-styles')) return;
    const style = document.createElement('style');
    style.id = 'ai-translator-styles';
    style.textContent = `
      #ai-translator-overlay {
        position: fixed; bottom: 24px; right: 24px; z-index: 2147483647;
        padding: 12px 20px; border-radius: 10px;
        font-family: system-ui, sans-serif; font-size: 14px;
        pointer-events: none;
      }`;
    document.head.appendChild(style);
  }

  async function refreshUiLang() {
    uiLang = await getUiLanguage();
  }

  async function startTranslation(targetLanguage) {
    await refreshUiLang();
    await loadTranslatorTheme();
    watchSystemOverlayTheme();
    if (!document.body) {
      showOverlay(t('pageNotReady', uiLang));
      setTimeout(removeOverlay, 2000);
      return;
    }

    injectStyles();
    showOverlay(t('collectingText', uiLang));

    activeTargetLanguage = targetLanguage;
    translationByText.clear();
    stopDomObserver();

    const textBlocks = extractBlocks();
    if (!textBlocks.length) {
      showOverlay(t('noTextToTranslate', uiLang));
      setTimeout(removeOverlay, 2000);
      return;
    }

    showOverlay(t('translatingOverlay', uiLang));

    chrome.runtime.sendMessage(
      { type: 'TRANSLATE_PAGE', blocks: textBlocks, targetLanguage },
      (response) => {
        if (chrome.runtime.lastError) {
          showOverlay(t('errorPrefix', uiLang) + chrome.runtime.lastError.message);
          setTimeout(removeOverlay, 4000);
          return;
        }
        if (!response?.ok) {
          showOverlay(t('errorPrefix', uiLang) + (response?.error ?? t('translationNotStarted', uiLang)));
          setTimeout(removeOverlay, 4000);
        }
      }
    );
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    switch (message.type) {
      case 'TRANSLATE_PAGE':
        startTranslation(message.targetLanguage);
        sendResponse({ ok: true });
        return false;
      case 'RESTORE_PAGE':
        restoreOriginal();
        removeOverlay();
        sendResponse({ ok: true });
        return false;
      case 'GET_STATUS':
        sendResponse({ isTranslated: translated, blockCount: blocks.length });
        return false;
      case 'APPLY_TRANSLATIONS':
        applyPartialResults(message.results);
        return false;
      case 'TRANSLATION_PROGRESS':
        refreshUiLang().then(() => {
          showOverlay(
            t('translatingProgress', uiLang, {
              done: message.done,
              total: message.total,
              pct: Math.round((message.done / message.total) * 100),
            })
          );
        });
        return false;
      case 'TRANSLATION_DONE':
        refreshUiLang().then(() => {
          applyCachedTranslationsToDom();
          startDomObserver();
          showOverlay(t('translationDone', uiLang));
          setTimeout(removeOverlay, 1200);
        });
        return false;
      case 'TRANSLATION_ERROR':
        refreshUiLang().then(() => {
          showOverlay(t('errorPrefix', uiLang) + message.error);
          setTimeout(removeOverlay, 4000);
        });
        return false;
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.settings?.newValue) return;
    const next = changes.settings.newValue.translatorTheme;
    if (next) {
      translatorThemePref = next;
      watchSystemOverlayTheme();
      const overlay = document.getElementById('ai-translator-overlay');
      if (overlay) applyOverlayTheme(overlay);
    }
  });

  refreshUiLang();
}
