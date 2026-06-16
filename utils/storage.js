export const JOB_STATUSES = ["nueva", "interesante", "descartada", "postulada", "entrevista", "rechazada", "oculta"];

export const DEFAULT_PROFILE = {
  name: "Augusto Stephani",
  lastName: "Stephani",
  email: "",
  phone: "",
  address: "Argentina",
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
  const jobs = Array.isArray(data.jobs) ? data.jobs : [];
  const deduped = dedupeJobs(jobs);
  if (deduped.length !== jobs.length || deduped.some((job, index) => job.url !== jobs[index]?.url)) {
    await chromeSet({ jobs: deduped });
  }
  return deduped;
}

export async function saveJob(job) {
  const jobs = await getJobs();
  const normalizedUrl = normalizeJobUrl(job.url);
  const existingIndex = jobs.findIndex((item) => normalizeJobUrl(item.url) === normalizedUrl);
  const now = new Date().toISOString();
  const finalJob = {
    ...job,
    url: normalizedUrl,
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
  const normalizedUrl = normalizeJobUrl(url);
  const now = new Date().toISOString();
  const updated = jobs.map((job) => normalizeJobUrl(job.url) === normalizedUrl ? {
    ...job,
    url: normalizeJobUrl(job.url),
    status,
    appliedAt: status === "postulada" ? (job.appliedAt || now) : job.appliedAt,
    updatedAt: now
  } : job);
  await chromeSet({ jobs: updated });
  return updated;
}

export async function deleteJob(url) {
  const jobs = await getJobs();
  const normalizedUrl = normalizeJobUrl(url);
  await chromeSet({ jobs: jobs.filter((job) => normalizeJobUrl(job.url) !== normalizedUrl) });
}

export function normalizeList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value || "")
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeJobUrl(value) {
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

function dedupeJobs(jobs) {
  const map = new Map();

  jobs.forEach((job) => {
    const normalized = { ...job, url: normalizeJobUrl(job.url) };
    const fallbackKey = `${String(normalized.title || "").toLowerCase()}|${String(normalized.company || "").toLowerCase()}|${String(normalized.source || "").toLowerCase()}`;
    const key = normalized.url && normalized.url !== "No detectado" ? normalized.url : fallbackKey;
    const current = map.get(key);
    if (!current) {
      map.set(key, normalized);
      return;
    }

    map.set(key, {
      ...current,
      ...normalized,
      status: current.status === "postulada" || normalized.status === "postulada" ? "postulada" : (normalized.status || current.status),
      appliedAt: current.appliedAt || normalized.appliedAt,
      appliedUrl: current.appliedUrl || normalized.appliedUrl,
      savedAt: current.savedAt || normalized.savedAt,
      updatedAt: normalized.updatedAt || current.updatedAt,
      score: Math.max(Number(current.score || 0), Number(normalized.score || 0))
    });
  });

  return [...map.values()];
}
