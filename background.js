chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["profile", "jobs"], (data) => {
    if (!data.profile) {
      chrome.storage.local.set({
        profile: {
          name: "Augusto Stephani",
          lastName: "Stephani",
          email: "",
          phone: "",
          address: "Argentina",
          location: "Argentina",
          objective: "Conseguir trabajo como Developer Jr, Backend Jr, Python Jr, Flask Jr, Trainee Developer o puesto similar.",
          skills: ["Python", "Flask", "Flask-CORS", "SQLite", "HTML", "CSS", "JavaScript basico", "APIs REST", "Postman", "Git", "GitHub", "requests", "BeautifulSoup", "lxml", "pandas", "PyYAML", "openpyxl", "CSV", "JSON", "React basico", "TypeScript basico", "Vite", "logica de programacion", "proyectos CRUD", "scraping"],
          experience: "Proyectos CRUD, APIs REST, autenticacion/login, sistemas de clientes, scraping de precios, manejo de CSV/JSON/XLSX y practica con Python, Flask, SQLite, HTML, CSS y JavaScript basico.",
          english: "Intermedio",
          preferences: ["remoto", "hibrido", "Argentina", "exterior", "USD", "Jr", "Trainee", "Entry Level"],
          avoid: ["Senior", "SSR muy exigente", "muchos anos de experiencia", "tecnologias fuera de perfil"],
          basePitch: "Estoy buscando mi primera experiencia profesional como Developer Jr. Tengo conocimientos en Python, Flask, SQLite, HTML, CSS, JavaScript, APIs REST, Git/GitHub, requests, BeautifulSoup, pandas, manejo de CSV/JSON/XLSX y proyectos CRUD."
        }
      });
    }

    if (!data.jobs) {
      chrome.storage.local.set({ jobs: [] });
    }
  });
});

const pendingApplications = new Map();

function normalizeJobUrl(value) {
  if (!value || value === "No detectado") return "No detectado";
  try {
    let url = new URL(value);
    const redirect = url.searchParams.get("destRedirectURL") || url.searchParams.get("redirect") || url.searchParams.get("url");
    if (/linkedin\.com\/premium\/survey/i.test(url.href) && redirect) {
      url = new URL(decodeURIComponent(redirect));
    }
    const currentJobId = url.searchParams.get("currentJobId");
    if (/linkedin\.com$/i.test(url.hostname.replace(/^www\./, "")) && currentJobId) {
      return `https://www.linkedin.com/jobs/view/${currentJobId}/`;
    }
    const linkedInMatch = url.href.match(/linkedin\.com\/jobs\/view\/(\d+)/i);
    if (linkedInMatch) return `https://www.linkedin.com/jobs/view/${linkedInMatch[1]}/`;
    ["trk", "refId", "trackingId", "lipi", "position", "pageNum", "utm_source", "utm_medium", "utm_campaign"].forEach((key) => url.searchParams.delete(key));
    url.hash = "";
    return url.href.replace(/\/$/, "");
  } catch (error) {
    return String(value);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "OPEN_DASHBOARD") {
    chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
  }

  if (message?.type === "OPEN_AND_PREPARE_APPLICATION") {
    const normalizedUrl = normalizeJobUrl(message.url);
    chrome.tabs.create({ url: normalizedUrl, active: true }, (tab) => {
      pendingApplications.set(tab.id, {
        originalUrl: normalizedUrl,
        url: normalizedUrl,
        subject: message.subject || "",
        message: message.message || "",
        cvFileName: message.cvFileName || "",
        cvFileDataUrl: message.cvFileDataUrl || "",
        cvFileType: message.cvFileType || "",
        profile: message.profile || {}
      });
      sendResponse({ ok: true });
    });
    return true;
  }

  if (message?.type === "APPLICATION_SUBMITTED") {
    chrome.storage.local.get(["jobs"], (data) => {
      const jobs = Array.isArray(data.jobs) ? data.jobs : [];
      const normalizedUrl = normalizeJobUrl(message.originalUrl || message.url);
      const now = new Date().toISOString();
      const updated = jobs.map((job) => normalizeJobUrl(job.url) === normalizedUrl ? {
        ...job,
        url: normalizeJobUrl(job.url),
        status: "postulada",
        appliedAt: job.appliedAt || now,
        appliedUrl: message.currentUrl || message.url || normalizedUrl,
        updatedAt: now
      } : job);
      chrome.storage.local.set({ jobs: updated }, () => sendResponse({ ok: true }));
    });
    return true;
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status !== "complete" || !pendingApplications.has(tabId)) return;

  const payload = pendingApplications.get(tabId);
  const nextPayload = { ...payload, currentUrl: changeInfo.url || payload.currentUrl };
  pendingApplications.set(tabId, nextPayload);
  setTimeout(() => {
    chrome.tabs.sendMessage(tabId, { type: "PREPARE_APPLICATION_FIELDS", payload: nextPayload });
  }, 1200);
});
