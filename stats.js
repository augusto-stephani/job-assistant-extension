import { getJobs } from "./utils/storage.js";

const els = {
  totalJobs: document.querySelector("#totalJobs"),
  appliedJobs: document.querySelector("#appliedJobs"),
  averageScore: document.querySelector("#averageScore"),
  remoteJobs: document.querySelector("#remoteJobs"),
  techList: document.querySelector("#techList"),
  sourceList: document.querySelector("#sourceList"),
  modalityList: document.querySelector("#modalityList"),
  seniorityList: document.querySelector("#seniorityList"),
  requirementsList: document.querySelector("#requirementsList")
};

render();

async function render() {
  const jobs = await getJobs();
  const visibleJobs = jobs.filter((job) => job.status !== "oculta");
  const average = visibleJobs.length ? Math.round(visibleJobs.reduce((sum, job) => sum + Number(job.score || 0), 0) / visibleJobs.length) : 0;

  els.totalJobs.textContent = visibleJobs.length;
  els.appliedJobs.textContent = visibleJobs.filter((job) => job.status === "postulada").length;
  els.averageScore.textContent = average;
  els.remoteJobs.textContent = visibleJobs.filter((job) => /remoto/i.test(job.modality || "")).length;

  renderRows(els.techList, countMany(visibleJobs.flatMap((job) => job.technologies || [])));
  renderRows(els.sourceList, countMany(visibleJobs.map((job) => job.source || "No detectado")));
  renderRows(els.modalityList, countMany(visibleJobs.map((job) => job.modality || "No detectado")));
  renderRows(els.seniorityList, countMany(visibleJobs.map((job) => job.seniority || job.experienceRequired || "No detectado")));
  renderChips(els.requirementsList, topRequirementWords(visibleJobs));
}

function countMany(items) {
  const map = new Map();
  items.filter(Boolean).forEach((item) => {
    const key = String(item).trim() || "No detectado";
    map.set(key, (map.get(key) || 0) + 1);
  });
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
}

function renderRows(target, rows) {
  target.innerHTML = rows.length ? rows.map(([label, count]) => `
    <div class="row"><strong>${escapeHtml(label)}</strong><span>${count}</span></div>
  `).join("") : `<p>No hay datos.</p>`;
}

function topRequirementWords(jobs) {
  const stop = new Set(["para", "con", "de", "en", "y", "o", "la", "el", "los", "las", "del", "un", "una", "que", "se", "no"]);
  const text = jobs.flatMap((job) => job.requirements || []).join(" ").toLowerCase();
  const words = text.match(/[a-záéíóúñ0-9+#.]{3,}/gi) || [];
  return countMany(words.filter((word) => !stop.has(word))).slice(0, 24);
}

function renderChips(target, rows) {
  target.innerHTML = rows.length ? rows.map(([label, count]) => `
    <span class="chip">${escapeHtml(label)} (${count})</span>
  `).join("") : `<p>No hay requisitos detectados.</p>`;
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
