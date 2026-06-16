export const JOB_STATUSES = ["nueva", "interesante", "descartada", "postulada", "entrevista", "rechazada"];

export const DEFAULT_PROFILE = {
  name: "Augusto Stephani",
  location: "Argentina",
  objective: "Conseguir trabajo como Developer Jr, Backend Jr, Python Jr, Flask Jr, Trainee Developer o puesto similar.",
  skills: ["Python", "Flask", "Flask-CORS", "SQLite", "HTML", "CSS", "JavaScript basico", "APIs REST", "Postman", "Git", "GitHub", "requests", "BeautifulSoup", "lxml", "pandas", "PyYAML", "openpyxl", "CSV", "JSON", "React basico", "TypeScript basico", "Vite", "Three.js", "logica de programacion", "proyectos CRUD", "scraping"],
  experience: "Proyectos CRUD, APIs REST, autenticacion/login, sistemas de clientes, scraping de precios, manejo de CSV/JSON/XLSX y practica con Python, Flask, SQLite, HTML, CSS y JavaScript basico.",
  english: "Intermedio",
  preferences: ["remoto", "hibrido", "Argentina", "exterior", "USD", "Jr", "Trainee", "Entry Level"],
  avoid: ["Senior", "SSR muy exigente", "muchos anos de experiencia", "tecnologias fuera de perfil"],
  basePitch: "Estoy buscando mi primera experiencia profesional como Developer Jr. Tengo conocimientos en Python, Flask, SQLite, HTML, CSS, JavaScript, APIs REST, Git/GitHub, requests, BeautifulSoup, pandas, manejo de CSV/JSON/XLSX y proyectos CRUD."
};

export const DEFAULT_SETTINGS = {
  autoSaveScore: 80
};

function chromeGet(keys) {
  return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
}

function chromeSet(data) {
  return new Promise((resolve) => chrome.storage.local.set(data, resolve));
}

export async function getProfile() {
  const data = await chromeGet(["profile"]);
  return { ...DEFAULT_PROFILE, ...(data.profile || {}) };
}

export async function getSettings() {
  const data = await chromeGet(["settings"]);
  return { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
}

export async function saveSettings(settings) {
  const normalized = { ...DEFAULT_SETTINGS, ...settings };
  await chromeSet({ settings: normalized });
  return normalized;
}

export async function getCv() {
  const data = await chromeGet(["cv"]);
  return data.cv || null;
}

export async function saveCv(cv) {
  await chromeSet({ cv });
  return cv;
}

export async function saveProfile(profile) {
  const normalized = {
    ...profile,
    skills: normalizeList(profile.skills),
    preferences: normalizeList(profile.preferences),
    avoid: normalizeList(profile.avoid)
  };
  await chromeSet({ profile: normalized });
  return normalized;
}

export async function getJobs() {
  const data = await chromeGet(["jobs"]);
  return Array.isArray(data.jobs) ? data.jobs : [];
}

export async function saveJob(job) {
  const jobs = await getJobs();
  const existingIndex = jobs.findIndex((item) => item.url === job.url);
  const now = new Date().toISOString();
  const finalJob = {
    ...job,
    status: job.status || "nueva",
    savedAt: job.savedAt || now,
    updatedAt: now
  };

  if (existingIndex >= 0) {
    jobs[existingIndex] = { ...jobs[existingIndex], ...finalJob };
  } else {
    jobs.unshift(finalJob);
  }

  await chromeSet({ jobs });
  return finalJob;
}

export async function updateJobStatus(url, status) {
  const jobs = await getJobs();
  const updated = jobs.map((job) => job.url === url ? { ...job, status, updatedAt: new Date().toISOString() } : job);
  await chromeSet({ jobs: updated });
  return updated;
}

export async function deleteJob(url) {
  const jobs = await getJobs();
  await chromeSet({ jobs: jobs.filter((job) => job.url !== url) });
}

export function normalizeList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value || "")
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}
