chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["profile", "jobs"], (data) => {
    if (!data.profile) {
      chrome.storage.local.set({
        profile: {
          name: "Augusto Stephani",
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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "OPEN_DASHBOARD") {
    chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
  }

  if (message?.type === "OPEN_AND_PREPARE_APPLICATION") {
    chrome.tabs.create({ url: message.url, active: true }, (tab) => {
      pendingApplications.set(tab.id, {
        url: message.url || "",
        subject: message.subject || "",
        message: message.message || "",
        cvFileName: message.cvFileName || ""
      });
      sendResponse({ ok: true });
    });
    return true;
  }

  if (message?.type === "APPLICATION_SUBMITTED") {
    chrome.storage.local.get(["jobs"], (data) => {
      const jobs = Array.isArray(data.jobs) ? data.jobs : [];
      const updated = jobs.map((job) => job.url === message.url ? { ...job, status: "postulada", updatedAt: new Date().toISOString() } : job);
      chrome.storage.local.set({ jobs: updated }, () => sendResponse({ ok: true }));
    });
    return true;
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status !== "complete" || !pendingApplications.has(tabId)) return;

  const payload = pendingApplications.get(tabId);
  setTimeout(() => {
    chrome.tabs.sendMessage(tabId, { type: "PREPARE_APPLICATION_FIELDS", payload }, () => {
      pendingApplications.delete(tabId);
    });
  }, 1200);
});
