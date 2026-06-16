import { getProfileTechMatches } from "./analyzer.js";

export function generateShortMessage(job, analysis, profile) {
  const techs = getProfileTechMatches(job);
  const techText = getTechnologyText(techs);
  const titleText = getTitleText(job);
  const modalityText = getModalityText(job);

  return `Hola, mi nombre es ${profile.name || "Augusto Stephani"}. Estoy buscando mi primera experiencia profesional como Developer Jr${titleText}. Tengo conocimientos en ${techText}, y practica desarrollando proyectos CRUD y APIs REST. ${modalityText}Me interesa aportar, aprender rapido y crecer dentro de un equipo. Quedo atento, muchas gracias.`;
}

export function generateEmail(job, analysis, profile) {
  const techs = getProfileTechMatches(job);
  const techText = getTechnologyText(techs);
  const title = isValidTitle(job.title) ? job.title : "Developer Jr";
  const modalityText = getModalityText(job);

  return {
    subject: `Postulacion a ${title}`,
    body: `Hola,\n\nMi nombre es ${profile.name || "Augusto Stephani"} y me gustaria postularme para la posicion de ${title}.\n\nEstoy buscando mi primera experiencia profesional como Developer Jr. Tengo conocimientos en ${techText}. Tambien practique creando proyectos CRUD, APIs REST, sistemas con login, manejo de datos en CSV/JSON/XLSX y scraping.\n\n${modalityText}Me considero una persona responsable, con muchas ganas de aprender, mejorar y aportar al equipo desde el primer dia.\n\nQuedo atento a la posibilidad de conversar y ampliar mi perfil.\n\nMuchas gracias por su tiempo.\n\nSaludos,\n${profile.name || "Augusto Stephani"}`
  };
}

function getTechnologyText(matches) {
  const base = ["Python", "Flask", "Flask-CORS", "SQLite", "HTML", "CSS", "JavaScript", "APIs REST", "Postman", "Git", "GitHub", "requests", "BeautifulSoup", "lxml", "pandas", "PyYAML", "openpyxl", "CSV", "JSON", "React basico", "TypeScript basico", "Vite"];
  const merged = [...new Set([...matches, ...base])];
  return merged.join(", ");
}

function getTitleText(job) {
  return isValidTitle(job.title) ? ` y me interesa la posicion de ${job.title}` : "";
}

function getModalityText(job) {
  if (job.modality && /remoto/i.test(job.modality)) return "Me interesa especialmente la modalidad remota. ";
  if (job.modality && /hibrido/i.test(job.modality)) return "Me interesa tambien la posibilidad de modalidad hibrida. ";
  return "Me interesa una oportunidad donde pueda aprender, aportar y crecer dentro de un equipo. ";
}

function isValidTitle(title) {
  const value = String(title || "").trim();
  if (!value || value === "No detectado") return false;
  if (/^\d+$/.test(value)) return false;
  if (value.length < 4 || value.length > 120) return false;
  return /(developer|dev|programador|desarrollador|backend|frontend|full stack|python|flask|trainee|junior|jr|software|web|analista)/i.test(value);
}
