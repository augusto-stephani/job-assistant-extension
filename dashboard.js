import { deleteJob, getCv, getJobs, JOB_STATUSES, updateJobStatus } from "./utils/storage.js";

const body = document.querySelector("#jobsBody");
const count = document.querySelector("#count");
const emptyState = document.querySelector("#emptyState");
const jobTabs = document.querySelectorAll(".job-tab");
const sortBy = document.querySelector("#sortBy");
const applyPanel = document.querySelector("#applyPanel");
const applyTitle = document.querySelector("#applyTitle");
const applyMeta = document.querySelector("#applyMeta");
const applySubject = document.querySelector("#applySubject");
const applyMessage = document.querySelector("#applyMessage");
const cvSummary = document.querySelector("#cvSummary");
const applyStatus = document.querySelector("#applyStatus");
const closeApplyBtn = document.querySelector("#closeApplyBtn");
const prepareApplyBtn = document.querySelector("#prepareApplyBtn");
const copyApplyBtn = document.querySelector("#copyApplyBtn");
const openApplyUrlBtn = document.querySelector("#openApplyUrlBtn");
const markAppliedBtn = document.querySelector("#markAppliedBtn");

let jobs = [];
let selectedJob = null;
let activeTab = "new";

init();

async function init() {
  jobTabs.forEach((tab) => tab.addEventListener("click", () => setActiveTab(tab.dataset.tab)));
  sortBy.addEventListener("change", render);
  closeApplyBtn.addEventListener("click", closeApplyPanel);
  prepareApplyBtn.addEventListener("click", prepareCurrentApplication);
  copyApplyBtn.addEventListener("click", copyApplyMessage);
  openApplyUrlBtn.addEventListener("click", openSelectedOffer);
  markAppliedBtn.addEventListener("click", markSelectedApplied);
  jobs = await getJobs();
  render();
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes.jobs) return;
    jobs = Array.isArray(changes.jobs.newValue) ? changes.jobs.newValue : [];
    render();
  });
}

function setActiveTab(tabName) {
  activeTab = tabName;
  jobTabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === activeTab));
  render();
}

function render() {
  const filtered = getFilteredJobs();
  count.textContent = `${filtered.length} oferta${filtered.length === 1 ? "" : "s"}`;
  emptyState.classList.toggle("hidden", jobs.length > 0);
  body.innerHTML = filtered.map(renderCard).join("");

  body.querySelectorAll("[data-status-url]").forEach((button) => {
    button.addEventListener("click", async () => {
      await updateJobStatus(button.dataset.statusUrl, button.dataset.statusValue);
      jobs = await getJobs();
      render();
    });
  });

  body.querySelectorAll("[data-copy-url]").forEach((button) => {
    button.addEventListener("click", () => copyMessage(button.dataset.copyUrl));
  });

  body.querySelectorAll("[data-apply-url]").forEach((button) => {
    button.addEventListener("click", () => openApplyPanel(button.dataset.applyUrl));
  });

  body.querySelectorAll("[data-delete-url]").forEach((button) => {
    button.addEventListener("click", async () => {
      await deleteJob(button.dataset.deleteUrl);
      jobs = await getJobs();
      render();
    });
  });
}

function getFilteredJobs() {
  const filtered = jobs.filter((job) => {
    if (activeTab === "applied") return job.status === "postulada";
    if (activeTab === "low") return isLowChance(job);
    return job.status !== "postulada" && !isLowChance(job);
  });

  if (sortBy.value === "best") return filtered.sort((a, b) => getBestValue(b) - getBestValue(a));
  if (sortBy.value === "score") return filtered.sort((a, b) => (b.score || 0) - (a.score || 0));
  if (sortBy.value === "title") return filtered.sort((a, b) => String(a.title).localeCompare(String(b.title)));
  return filtered.sort((a, b) => new Date(b.savedAt || 0) - new Date(a.savedAt || 0));
}

function renderCard(job) {
  const cardClass = job.status === "postulada" ? "job-card is-applied" : "job-card";
  const lowReasons = getLowChanceReasons(job);
  return `
    <article class="${cardClass}">
      <header class="job-card-header">
        <div>
          <h2>${escapeHtml(job.title || "No detectado")}</h2>
          <p>${escapeHtml(job.company || "Empresa no detectada")} · ${escapeHtml(job.source || "Pagina no detectada")}</p>
        </div>
        <div class="score-pill">${Number(job.score || 0)}</div>
      </header>

      <dl class="job-meta">
        <div><dt>Ubicacion</dt><dd>${escapeHtml(job.location || "No detectado")}</dd></div>
        <div><dt>Modalidad</dt><dd>${escapeHtml(job.modality || "No detectado")}</dd></div>
        <div><dt>Experiencia</dt><dd>${escapeHtml(job.experienceRequired || "No detectado")}</dd></div>
        <div><dt>Sueldo</dt><dd>${escapeHtml(job.salary || "No detectado")}</dd></div>
        <div><dt>Estado</dt><dd>${escapeHtml(job.status || "nueva")}</dd></div>
        <div><dt>Guardada</dt><dd>${formatDate(job.savedAt)}</dd></div>
      </dl>

      ${lowReasons.length ? `<p class="low-reasons">${escapeHtml(lowReasons.join(" · "))}</p>` : ""}

      <div class="job-actions">
        <button class="primary" data-apply-url="${escapeHtml(job.url)}">Postular</button>
        <button data-copy-url="${escapeHtml(job.url)}">Copiar</button>
        <a class="button-link" href="${escapeHtml(job.url)}" target="_blank" rel="noreferrer">Abrir</a>
        ${job.status === "postulada" ? "" : `<button data-status-url="${escapeHtml(job.url)}" data-status-value="postulada">Marcar postulada</button>`}
        <button class="delete" data-delete-url="${escapeHtml(job.url)}">Eliminar</button>
      </div>
    </article>
  `;
}

function isLowChance(job) {
  return Number(job.score || 0) < 45 || /senior|ssr|semi senior/i.test(job.seniority || "") || /4|5|6|7|8|9|10/i.test(job.experienceRequired || "") || (/presencial/i.test(job.modality || "") && !/argentina|buenos aires|caba/i.test(job.location || ""));
}

function getLowChanceReasons(job) {
  const reasons = [];
  if (Number(job.score || 0) < 45) reasons.push("score bajo");
  if (/senior|ssr|semi senior/i.test(job.seniority || "")) reasons.push("seniority alto");
  if (/4|5|6|7|8|9|10/i.test(job.experienceRequired || "")) reasons.push("mucha experiencia");
  if (/presencial/i.test(job.modality || "") && !/argentina|buenos aires|caba/i.test(job.location || "")) reasons.push("zona/modalidad menos conveniente");
  return reasons;
}

function getBestValue(job) {
  let value = Number(job.score || 0);
  if (/remoto/i.test(job.modality || "")) value += 12;
  if (/hibrido/i.test(job.modality || "")) value += 4;
  if (/argentina|latam|buenos aires|caba/i.test(job.location || "")) value += 6;
  if (job.salary && !/no detectado|no informado/i.test(job.salary)) value += 5;
  if (/sin experiencia|deseable|0|1|2/i.test(job.experienceRequired || "")) value += 8;
  if (/senior|ssr|semi senior/i.test(job.seniority || "")) value -= 20;
  return value;
}

async function copyMessage(url) {
  const job = jobs.find((item) => item.url === url);
  const text = job?.generatedMessage || "No hay mensaje generado.";
  await navigator.clipboard.writeText(text);
}

function openApplyPanel(url) {
  selectedJob = jobs.find((item) => item.url === url);
  if (!selectedJob) return;

  const email = selectedJob.generatedEmail || {};
  applyTitle.textContent = selectedJob.title || "Postular";
  applyMeta.textContent = `${selectedJob.source || "Pagina no detectada"} - ${selectedJob.company || "Empresa no detectada"} - Score ${Number(selectedJob.score || 0)} - ${selectedJob.salary || "Sueldo no detectado"}`;
  applySubject.value = email.subject || `Postulacion a ${selectedJob.title || "Developer Jr"}`;
  applyMessage.value = email.body || selectedJob.generatedMessage || "";
  applyStatus.textContent = "";
  renderApplicationSummary();
  applyPanel.classList.remove("hidden");
  applyPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function renderApplicationSummary() {
  const cv = await getCv();
  cvSummary.textContent = cv?.fileName ? `CV listo: ${cv.fileName}` : "CV: no hay archivo cargado";
}

function closeApplyPanel() {
  selectedJob = null;
  applyPanel.classList.add("hidden");
}

async function copyApplyMessage() {
  const fullText = `Asunto: ${applySubject.value}\n\n${applyMessage.value}`;
  await navigator.clipboard.writeText(fullText);
  applyStatus.textContent = "Mensaje copiado. Podes pegarlo en la oferta.";
}

async function prepareCurrentApplication() {
  await copyApplyMessage();
  chrome.runtime.sendMessage({
    type: "OPEN_AND_PREPARE_APPLICATION",
    url: selectedJob?.url,
    subject: applySubject.value,
    message: applyMessage.value,
    cvFileName: (await getCv())?.fileName || ""
  });
  applyStatus.textContent = "Oferta abierta y texto preparado. Si enviaste la postulacion, toca Marcar postulada.";
}

function openSelectedOffer() {
  if (!selectedJob?.url) return;
  window.open(selectedJob.url, "_blank", "noreferrer");
  applyStatus.textContent = "Oferta abierta. Adjunta el CV y pega el mensaje revisado.";
}

async function markSelectedApplied(showMessage = true) {
  if (!selectedJob?.url) return;
  await updateJobStatus(selectedJob.url, "postulada");
  jobs = await getJobs();
  selectedJob = jobs.find((item) => item.url === selectedJob.url);
  render();
  if (showMessage) applyStatus.textContent = "Marcada como postulada.";
}

function formatDate(value) {
  if (!value) return "No detectado";
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
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
