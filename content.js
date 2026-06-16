(function () {
  function isVisible(element) {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0" && rect.width > 0 && rect.height > 0;
  }

  function cleanText(value) {
    return (value || "").replace(/\s+/g, " ").trim();
  }

  function absoluteUrl(value) {
    try {
      return new URL(value, window.location.href).href;
    } catch (error) {
      return "";
    }
  }

  function getVisibleText() {
    const blockedTags = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "SVG", "CANVAS"]);
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || blockedTags.has(parent.tagName) || !isVisible(parent)) {
          return NodeFilter.FILTER_REJECT;
        }
        return cleanText(node.textContent).length > 1 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });

    const parts = [];
    let node;
    while ((node = walker.nextNode())) {
      const text = cleanText(node.textContent);
      if (text) parts.push(text);
      if (parts.join(" ").length > 20000) break;
    }

    return cleanText(parts.join(" "));
  }

  function getHeadingText() {
    const selectors = ["h1", "h2", "[data-testid*='title' i]", "[class*='title' i]", "[class*='puesto' i]", "[class*='job' i]"];
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && isVisible(element)) {
        const text = cleanText(element.textContent);
        if (text.length >= 3 && text.length <= 160) return text;
      }
    }
    return cleanText(document.title) || "No detectado";
  }

  function looksLikeJobLink(anchor) {
    const href = anchor.href || "";
    const text = cleanText(anchor.textContent);
    const haystack = `${href} ${text}`.toLowerCase();
    const hrefLooksValid = /(job|jobs|empleo|empleos|trabajo|trabajos|oferta|ofertas|vacante|puesto|developer|programador|desarrollador|backend|frontend|python|trainee|junior|jr)/i.test(haystack);
    const notNavigation = !/(login|signin|registro|empresa|salario|blog|contacto|politica|privacy|ayuda|help)/i.test(haystack);
    return text.length >= 5 && hrefLooksValid && notNavigation;
  }

  function getCardContainer(anchor) {
    return anchor.closest([
      ".job-card-container",
      ".jobs-search-results__list-item",
      ".job_seen_beacon",
      "article",
      "li",
      "section",
      "[data-testid*='job' i]",
      "[class*='card' i]",
      "[class*='job' i]",
      "[class*='result' i]",
      "[class*='oferta' i]",
      "[class*='puesto' i]",
      "div"
    ].join(",")) || anchor;
  }

  function getNearbyText(anchor) {
    return cleanText(getCardContainer(anchor).textContent).slice(0, 2200);
  }

  function getBestTitleFromCard(card, anchor) {
    const titleSelectors = [
      ".job-card-list__title",
      ".job-card-container__link",
      "[data-testid*='job-title' i]",
      "[class*='title' i]",
      "h2",
      "h3",
      "a"
    ];

    for (const selector of titleSelectors) {
      const element = card.querySelector?.(selector);
      const text = cleanText(element?.textContent);
      if (text.length >= 5 && text.length <= 160) return text;
    }

    return cleanText(anchor.textContent).slice(0, 160);
  }

  function cardLooksLikeJob(card) {
    const text = cleanText(card.textContent);
    const link = card.querySelector?.("a[href]");
    const haystack = `${text} ${link?.href || ""}`.toLowerCase();
    return text.length >= 20 && /(programador|desarrollador|developer|backend|frontend|full stack|python|java|javascript|trainee|junior|jr|empleo|trabajo|oferta|vacante|postular|solicitar|apply)/i.test(haystack);
  }

  function getJobCards() {
    const selectors = [
      ".job-card-container",
      ".jobs-search-results__list-item",
      ".job_seen_beacon",
      "[data-testid*='job' i]",
      "[class*='job-card' i]",
      "[class*='offer' i]",
      "[class*='oferta' i]",
      "article",
      "li"
    ];

    const cards = [];
    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((card) => {
        if (isVisible(card) && cardLooksLikeJob(card)) cards.push(card);
      });
    });

    return [...new Set(cards)].slice(0, 80);
  }

  function getVisibleJobLinks() {
    const seen = new Set();
    const pageText = getVisibleText().slice(0, 800);
    const fromCards = getJobCards()
      .map((card) => {
        const anchors = [...card.querySelectorAll("a[href]")].filter(looksLikeJobLink);
        const anchor = anchors[0] || card.querySelector("a[href]");
        if (!anchor) return null;

        return {
          titleHint: getBestTitleFromCard(card, anchor),
          pageTitle: cleanText(document.title),
          url: absoluteUrl(anchor.href),
          text: `${cleanText(card.textContent).slice(0, 2200)} ${pageText}`
        };
      })
      .filter(Boolean);

    const fromAnchors = [...document.querySelectorAll("a[href]")]
      .filter((anchor) => isVisible(anchor) && looksLikeJobLink(anchor))
      .map((anchor) => ({
        titleHint: cleanText(anchor.textContent).slice(0, 160),
        pageTitle: cleanText(document.title),
        url: absoluteUrl(anchor.href),
        text: `${getNearbyText(anchor)} ${pageText}`
      }));

    return [...fromCards, ...fromAnchors]
      .filter((item) => {
        if (!item.url || seen.has(item.url)) return false;
        seen.add(item.url);
        return true;
      })
      .slice(0, 60);
  }

  function isLikelyListingPage() {
    const url = window.location.href.toLowerCase();
    const title = cleanText(document.title).toLowerCase();
    if (/\/jobs\/search|\/trabajo-de|\/trabajos|\/empleos|\/ofertas|\/empleos-busqueda|[?&]q=|[?&]keywords=|buscar|busqueda|search/.test(url)) return true;
    if (/empleos|trabajos|ofertas|jobs|busqueda|search/.test(title) && getVisibleJobLinks().length >= 3) return true;
    return false;
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === "PREPARE_APPLICATION_FIELDS") {
      prepareApplicationFields(message.payload || {});
      sendResponse({ ok: true });
      return;
    }

    if (message?.type === "GET_JOB_LINKS") {
      sendResponse({ links: getVisibleJobLinks(), isListingPage: isLikelyListingPage() });
      return;
    }

    if (message?.type !== "GET_JOB_CONTENT") return;

    sendResponse({
      titleHint: getHeadingText(),
      pageTitle: cleanText(document.title),
      url: window.location.href,
      text: getVisibleText()
    });
  });

  function prepareApplicationFields(payload) {
    const messageText = payload.message || "";
    const subjectText = payload.subject || "";

    showReviewBanner();
    clickStartApplicationButton();
    [700, 1600, 3000].forEach((delay) => {
      setTimeout(() => fillApplicationFields(messageText, subjectText), delay);
    });
  }

  function fillApplicationFields(messageText, subjectText) {
    const writableFields = [...document.querySelectorAll("textarea, [contenteditable='true'], input[type='text'], input[type='email'], input[type='tel'], input:not([type])")]
      .filter((field) => isVisible(field) && !field.disabled && !field.readOnly);

    writableFields.forEach((field) => {
      const label = getFieldLabel(field).toLowerCase();
      if (/mensaje|carta|presentaci[oó]n|cover|motiva|comentario|respuesta|por qu[eé]|descripcion|description|message/i.test(label)) {
        setFieldValue(field, messageText);
      } else if (/asunto|subject/i.test(label)) {
        setFieldValue(field, subjectText);
      } else if (/nombre|name/i.test(label)) {
        setFieldValue(field, "Augusto Stephani");
      } else if (/email|correo|mail/i.test(label)) {
        highlightField(field, "Completar email");
      } else if (/telefono|tel[eé]fono|phone|celular|mobile/i.test(label)) {
        highlightField(field, "Completar telefono");
      } else if (/ubicaci[oó]n|location|pais|country/i.test(label)) {
        setFieldValue(field, "Argentina");
      } else if (/experiencia|experience/i.test(label)) {
        setFieldValue(field, "Estoy buscando mi primera experiencia profesional como Developer Jr. Tengo practica con proyectos CRUD, APIs REST, Python, Flask, SQLite, HTML, CSS, JavaScript, Git y GitHub.");
      } else if (/tecnolog|skill|herramienta|stack/i.test(label)) {
        setFieldValue(field, "Python, Flask, SQLite, HTML, CSS, JavaScript, APIs REST, Postman, Git, GitHub, requests, BeautifulSoup, pandas, CSV, JSON y proyectos CRUD.");
      } else if (/ingles|english/i.test(label)) {
        setFieldValue(field, "Intermedio");
      } else if (/pretensi[oó]n|salario|sueldo|remuneraci[oó]n/i.test(label)) {
        highlightField(field, "Revisar pretension salarial");
      }
    });

    fillSelects();

    document.querySelectorAll("input[type='file']").forEach((input) => {
      if (isVisible(input)) highlightField(input, "Adjuntar CV manualmente");
    });

    [...document.querySelectorAll("button, input[type='submit'], a")]
      .filter((element) => isVisible(element) && /postular|enviar|solicitar|apply|submit/i.test(cleanText(element.textContent || element.value)))
      .forEach((element) => {
        element.style.outline = "3px solid #1769aa";
        element.title = "Revisar antes de enviar";
      });
  }

  function fillSelects() {
    [...document.querySelectorAll("select")]
      .filter((select) => isVisible(select) && !select.disabled)
      .forEach((select) => {
        const label = getFieldLabel(select).toLowerCase();
        const options = [...select.options];
        const pick = findOption(options, label);
        if (!pick) return;
        select.value = pick.value;
        select.dispatchEvent(new Event("input", { bubbles: true }));
        select.dispatchEvent(new Event("change", { bubbles: true }));
        highlightField(select, "Seleccion revisada automaticamente");
      });
  }

  function findOption(options, label) {
    if (/pais|country|ubicaci[oó]n|location/i.test(label)) return optionMatching(options, /argentina/i);
    if (/ingles|english/i.test(label)) return optionMatching(options, /intermedio|intermediate|b1|b2/i);
    if (/experiencia|experience/i.test(label)) return optionMatching(options, /sin|0|menos|junior|trainee|entry/i);
    if (/remoto|modalidad|modal/i.test(label)) return optionMatching(options, /remoto|remote|hibrido|hybrid/i);
    return null;
  }

  function optionMatching(options, pattern) {
    return options.find((option) => pattern.test(cleanText(option.textContent || option.label || option.value)));
  }

  function clickStartApplicationButton() {
    const buttons = [...document.querySelectorAll("button, a, input[type='button']")]
      .filter((element) => isVisible(element))
      .filter((element) => {
        const text = cleanText(element.textContent || element.value).toLowerCase();
        if (!/(postular|solicitar|aplicar|apply|easy apply)/i.test(text)) return false;
        return !/(enviar|submit|finalizar|confirmar|send)/i.test(text);
      });

    const first = buttons[0];
    if (!first) return;
    first.style.outline = "3px solid #1769aa";
    first.click();
  }

  function showReviewBanner() {
    document.querySelector("#job-assistant-review-banner")?.remove();
    const banner = document.createElement("div");
    banner.id = "job-assistant-review-banner";
    banner.textContent = "Job Assistant preparo la postulacion. Revisa campos resaltados, adjunta CV si corresponde y confirma el envio.";
    banner.style.cssText = [
      "position:fixed",
      "z-index:2147483647",
      "left:16px",
      "right:16px",
      "bottom:16px",
      "padding:12px 14px",
      "background:#1769aa",
      "color:white",
      "font:14px Arial, sans-serif",
      "border-radius:8px",
      "box-shadow:0 8px 24px rgba(0,0,0,.22)"
    ].join(";");
    document.documentElement.appendChild(banner);
  }

  function getFieldLabel(field) {
    const id = field.id ? document.querySelector(`label[for='${CSS.escape(field.id)}']`)?.textContent : "";
    const aria = field.getAttribute("aria-label") || "";
    const placeholder = field.getAttribute("placeholder") || "";
    const parent = field.closest("label, div, section")?.textContent || "";
    return cleanText(`${id} ${aria} ${placeholder} ${parent}`);
  }

  function setFieldValue(field, value) {
    if (!value) return;
    if (field.isContentEditable) {
      field.textContent = value;
    } else {
      field.value = value;
    }
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
    highlightField(field, "Autocompletado por Job Assistant");
  }

  function highlightField(field, title) {
    field.style.outline = "3px solid #1769aa";
    field.title = title;
  }
})();
