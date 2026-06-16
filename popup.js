import { analyzeJob } from "./utils/analyzer.js";
import { extractJobData } from "./utils/extractor.js";
import { generateEmail, generateShortMessage } from "./utils/messageGenerator.js";
import { getCv, getProfile, getSettings, JOB_STATUSES, saveCv, saveJob } from "./utils/storage.js";

const AUTO_SAVE_STATUS = "interesante";

const elements = {
  pageStatus: document.querySelector("#pageStatus"),
  tabs: document.querySelectorAll(".tab"),
  panels: document.querySelectorAll(".panel"),
  analyzeBtn: document.querySelector("#analyzeBtn"),
  dashboardBtn: document.querySelector("#dashboardBtn"),
  openOptions: document.querySelector("#openOptions"),
  result: document.querySelector("#result"),
  scoreValue: document.querySelector("#scoreValue"),
  recommendation: document.querySelector("#recommendation"),
  jobTitle: document.querySelector("#jobTitle"),
  company: document.querySelector("#company"),
  source: document.querySelector("#source"),
  salary: document.querySelector("#salary"),
  modality: document.querySelector("#modality"),
  seniority: document.querySelector("#seniority"),
  experienceRequired: document.querySelector("#experienceRequired"),
  technologies: document.querySelector("#technologies"),
  pros: document.querySelector("#pros"),
  cons: document.querySelector("#cons"),
  statusSelect: document.querySelector("#statusSelect"),
  messageBtn: document.querySelector("#messageBtn"),
  emailBtn: document.querySelector("#emailBtn"),
  applyAssistBtn: document.querySelector("#applyAssistBtn"),
  saveBtn: document.querySelector("#saveBtn"),
  outputText: document.querySelector("#outputText"),
  copyBtn: document.querySelector("#copyBtn"),
  searchQuery: document.querySelector("#searchQuery"),
  searchLocation: document.querySelector("#searchLocation"),
  searchSite: document.querySelector("#searchSite"),
  openSearchesBtn: document.querySelector("#openSearchesBtn"),
  analyzeLinksBtn: document.querySelector("#analyzeLinksBtn"),
  searchResults: document.querySelector("#searchResults"),
  cvFile: document.querySelector("#cvFile"),
  cvInfo: document.querySelector("#cvInfo"),
  cvText: document.querySelector("#cvText"),
  saveCvBtn: document.querySelector("#saveCvBtn"),
  copyCvBtn: document.querySelector("#copyCvBtn"),
  downloadCvBtn: document.querySelector("#downloadCvBtn")
};

let currentJob = null;
let currentAnalysis = null;
let currentProfile = null;
let currentSettings = null;
let selectedCvFile = null;
let searchItems = [];

init();

async function init() {
  currentProfile = await getProfile();
  currentSettings = await getSettings();
  elements.statusSelect.innerHTML = JOB_STATUSES.map((status) => `<option value="${status}">${status}</option>`).join("");
  elements.tabs.forEach((tab) => tab.addEventListener("click", () => activateTab(tab.dataset.tab)));
  elements.analyzeBtn.addEventListener("click", analyzeCurrentPage);
  elements.dashboardBtn.addEventListener("click", () => chrome.runtime.sendMessage({ type: "OPEN_DASHBOARD" }));
  elements.openOptions.addEventListener("click", () => chrome.runtime.openOptionsPage());
  elements.messageBtn.addEventListener("click", showShortMessage);
  elements.emailBtn.addEventListener("click", showEmail);
  elements.applyAssistBtn.addEventListener("click", prepareApplication);
  elements.saveBtn.addEventListener("click", () => saveCurrentJob(false));
  elements.copyBtn.addEventListener("click", copyOutput);
  elements.openSearchesBtn.addEventListener("click", openSearches);
  elements.analyzeLinksBtn.addEventListener("click", analyzeVisibleLinks);
  elements.cvFile.addEventListener("change", () => selectedCvFile = elements.cvFile.files?.[0] || null);
  elements.saveCvBtn.addEventListener("click", saveCvFromPopup);
  elements.copyCvBtn.addEventListener("click", copyCvText);
  elements.downloadCvBtn.addEventListener("click", downloadStoredCv);
  loadCv();
}

function activateTab(panelId) {
  elements.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === panelId));
  elements.panels.forEach((panel) => panel.classList.toggle("active", panel.id === panelId));
}

async function analyzeCurrentPage() {
  setBusy(true, "Analizando la pagina...");
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error("No se pudo leer la pestana activa.");

    const linksResponse = await chrome.tabs.sendMessage(tab.id, { type: "GET_JOB_LINKS" });
    const links = linksResponse?.links || [];
    if (linksResponse?.isListingPage && links.length >= 2) {
      await analyzeLinksData(links);
      elements.pageStatus.textContent = `${searchItems.length} ofertas analizadas y guardadas. Dashboard ordenado por mejores opciones.`;
      chrome.runtime.sendMessage({ type: "OPEN_DASHBOARD" });
      return;
    }

    const pageData = await chrome.tabs.sendMessage(tab.id, { type: "GET_JOB_CONTENT" });
    currentProfile = await getProfile();
    currentSettings = await getSettings();
    currentJob = extractJobData(pageData);
    currentAnalysis = analyzeJob(currentJob, currentProfile);

    renderResult();
    if (currentAnalysis.score >= currentSettings.autoSaveScore) {
      await saveCurrentJob(true);
      elements.pageStatus.textContent = `Analisis completo. Guardada automaticamente por score ${currentAnalysis.score}.`;
    } else {
      elements.pageStatus.textContent = "Analisis completo.";
    }
  } catch (error) {
    elements.pageStatus.textContent = "No pude analizar esta pagina. Recarga la web e intenta de nuevo.";
  } finally {
    setBusy(false);
  }
}

function renderResult() {
  elements.result.classList.remove("hidden");
  elements.scoreValue.textContent = currentAnalysis.score;
  elements.recommendation.textContent = currentAnalysis.recommendation;
  elements.recommendation.className = `badge ${currentAnalysis.recommendation.toLowerCase()}`;
  elements.jobTitle.textContent = currentJob.title || "No detectado";
  elements.company.textContent = currentJob.company || "No detectado";
  elements.source.textContent = currentJob.source || "No detectado";
  elements.salary.textContent = currentJob.salary || "No detectado";
  elements.modality.textContent = currentJob.modality || "No detectado";
  elements.seniority.textContent = currentJob.seniority || "No detectado";
  elements.experienceRequired.textContent = currentJob.experienceRequired || "No detectado";
  elements.technologies.textContent = currentJob.technologies?.length ? currentJob.technologies.join(", ") : "No detectado";
  renderList(elements.pros, currentAnalysis.pros, "Sin puntos a favor claros.");
  renderList(elements.cons, currentAnalysis.cons, "Sin puntos en contra claros.");
}

function renderList(target, items, emptyText) {
  const list = items?.length ? items : [emptyText];
  target.innerHTML = list.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function showShortMessage() {
  if (!ensureAnalysis()) return;
  elements.outputText.value = generateShortMessage(currentJob, currentAnalysis, currentProfile);
  elements.copyBtn.classList.remove("hidden");
}

function showEmail() {
  if (!ensureAnalysis()) return;
  const email = generateEmail(currentJob, currentAnalysis, currentProfile);
  elements.outputText.value = `Asunto: ${email.subject}\n\n${email.body}`;
  elements.copyBtn.classList.remove("hidden");
}

async function prepareApplication() {
  if (!ensureAnalysis()) return;
  elements.outputText.value = generateShortMessage(currentJob, currentAnalysis, currentProfile);
  await copyOutput();
  if (currentJob.url && currentJob.url !== "No detectado") {
    chrome.tabs.create({ url: currentJob.url });
  }
  elements.pageStatus.textContent = "Mensaje copiado y oferta abierta para revisar/postular.";
}

async function saveCurrentJob(isAutomatic) {
  if (!ensureAnalysis()) return;
  const message = generateShortMessage(currentJob, currentAnalysis, currentProfile);
  const email = generateEmail(currentJob, currentAnalysis, currentProfile);
  await saveJob({
    ...currentJob,
    ...currentAnalysis,
    status: isAutomatic ? AUTO_SAVE_STATUS : elements.statusSelect.value,
    generatedMessage: message,
    generatedEmail: email
  });
  if (!isAutomatic) elements.pageStatus.textContent = "Oferta guardada.";
}

async function openSearches() {
  const query = elements.searchQuery.value.trim() || "Python Flask Backend Jr Trainee remoto";
  const location = elements.searchLocation.value.trim() || "Argentina";
  const full = `${query} ${location}`;
  const slug = encodeURIComponent(query.replace(/\s+/g, "-").toLowerCase());
  const urls = {
    linkedin: `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}`,
    indeed: `https://ar.indeed.com/jobs?q=${encodeURIComponent(query)}&l=${encodeURIComponent(location)}`,
    computrabajo: `https://www.computrabajo.com.ar/trabajo-de-${slug}`,
    zonajobs: `https://www.zonajobs.com.ar/empleos-busqueda-${slug}.html`,
    google: `https://www.google.com/search?q=${encodeURIComponent(`${full} site:linkedin.com/jobs OR site:computrabajo.com.ar OR site:zonajobs.com.ar OR site:indeed.com`)}`
  };
  chrome.tabs.create({ url: urls[elements.searchSite.value], active: true });
  elements.pageStatus.textContent = "Busqueda abierta en una sola pestana.";
}

async function analyzeVisibleLinks() {
  setBusy(true, "Analizando links visibles...");
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const response = await chrome.tabs.sendMessage(tab.id, { type: "GET_JOB_LINKS" });
    await analyzeLinksData(response.links || []);
    renderSearchResults();
    elements.pageStatus.textContent = `${searchItems.length} ofertas analizadas y guardadas.`;
    chrome.runtime.sendMessage({ type: "OPEN_DASHBOARD" });
  } catch (error) {
    elements.pageStatus.textContent = "No pude leer links de esta pagina. Proba en una pagina de resultados.";
  } finally {
    setBusy(false);
  }
}

async function analyzeLinksData(links) {
  currentProfile = await getProfile();
  currentSettings = await getSettings();
  searchItems = links.map((pageData) => {
    const job = extractJobData(pageData);
    const analysis = analyzeJob(job, currentProfile);
    return { job, analysis };
  }).sort((a, b) => b.analysis.score - a.analysis.score);

  await autoSaveSearchItems();
}

async function autoSaveSearchItems() {
  for (const item of searchItems) {
    await saveSearchItem(item, true);
  }
}

function renderSearchResults() {
  if (!searchItems.length) {
    elements.searchResults.innerHTML = `<p class="hint">No encontre links claros de ofertas en esta pagina.</p>`;
    return;
  }

  elements.searchResults.innerHTML = searchItems.map((item, index) => `
    <article class="search-card">
      <div>
        <strong>${escapeHtml(item.job.title || "No detectado")}</strong>
        <span class="mini-score">${item.analysis.score}</span>
      </div>
      <p>${escapeHtml(item.job.source || "Pagina no detectada")} - ${escapeHtml(item.job.location || "Ubicacion no detectada")} - ${escapeHtml(item.job.modality || "Modalidad no detectada")} - ${escapeHtml(item.job.experienceRequired || "Experiencia no detectada")} - ${escapeHtml(item.job.salary || "Sueldo no detectado")}</p>
      <div class="row-actions">
        <button data-open-index="${index}">Abrir</button>
        <button data-save-index="${index}">Guardar</button>
      </div>
    </article>
  `).join("");

  elements.searchResults.querySelectorAll("[data-open-index]").forEach((button) => {
    button.addEventListener("click", () => chrome.tabs.create({ url: searchItems[Number(button.dataset.openIndex)].job.url }));
  });

  elements.searchResults.querySelectorAll("[data-save-index]").forEach((button) => {
    button.addEventListener("click", async () => {
      await saveSearchItem(searchItems[Number(button.dataset.saveIndex)], false);
      elements.pageStatus.textContent = "Oferta guardada desde busqueda.";
    });
  });
}

async function saveSearchItem(item, isAutomatic) {
  const message = generateShortMessage(item.job, item.analysis, currentProfile);
  const email = generateEmail(item.job, item.analysis, currentProfile);
  await saveJob({
    ...item.job,
    ...item.analysis,
    status: isAutomatic && item.analysis.score >= currentSettings.autoSaveScore ? AUTO_SAVE_STATUS : "nueva",
    generatedMessage: message,
    generatedEmail: email
  });
}

async function saveCvFromPopup() {
  const currentCv = await getCv();
  const cv = {
    fileName: selectedCvFile?.name || currentCv?.fileName || "",
    fileType: selectedCvFile?.type || currentCv?.fileType || "",
    fileDataUrl: selectedCvFile ? await readFileAsDataUrl(selectedCvFile) : currentCv?.fileDataUrl || "",
    text: elements.cvText.value.trim(),
    savedAt: new Date().toISOString()
  };
  await saveCv(cv);
  selectedCvFile = null;
  elements.cvFile.value = "";
  renderCv(cv);
  elements.pageStatus.textContent = "CV guardado localmente.";
}

async function loadCv() {
  renderCv(await getCv());
}

function renderCv(cv) {
  elements.cvText.value = cv?.text || "";
  elements.cvInfo.textContent = cv?.fileName ? `CV cargado: ${cv.fileName}` : "No hay archivo de CV cargado.";
}

async function copyCvText() {
  if (!elements.cvText.value.trim()) {
    elements.pageStatus.textContent = "No hay texto de CV para copiar.";
    return;
  }
  await navigator.clipboard.writeText(elements.cvText.value.trim());
  elements.pageStatus.textContent = "Texto del CV copiado.";
}

async function downloadStoredCv() {
  const cv = await getCv();
  if (!cv?.fileDataUrl) {
    elements.pageStatus.textContent = "No hay archivo de CV guardado.";
    return;
  }
  const link = document.createElement("a");
  link.href = cv.fileDataUrl;
  link.download = cv.fileName || "cv";
  link.click();
  elements.pageStatus.textContent = "CV descargado.";
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function copyOutput() {
  if (!elements.outputText.value) return;
  await navigator.clipboard.writeText(elements.outputText.value);
  elements.pageStatus.textContent = "Texto copiado.";
}

function ensureAnalysis() {
  if (currentJob && currentAnalysis && currentProfile) return true;
  elements.pageStatus.textContent = "Primero analiza una oferta.";
  return false;
}

function setBusy(isBusy, text) {
  elements.analyzeBtn.disabled = isBusy;
  elements.analyzeLinksBtn.disabled = isBusy;
  if (text) elements.pageStatus.textContent = text;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}
