const KNOWN_TECHS = [
  "Python", "Flask", "Django", "FastAPI", "SQLite", "SQL", "MySQL", "PostgreSQL",
  "HTML", "CSS", "JavaScript", "TypeScript", "React", "Node", "Express", "REST",
  "API REST", "Git", "GitHub", "Postman", "Docker", "Kubernetes", "AWS", "Azure",
  "Java", ".NET", "C#", "PHP", "Laravel", "Ruby", "Go"
];

export function extractJobData(pageData) {
  const text = normalizeText(pageData?.text || "");
  const title = detectTitle(pageData, text);

  return {
    title,
    company: detectCompany(text),
    location: detectLocation(text),
    modality: detectModality(text),
    seniority: detectSeniority(text),
    experienceRequired: detectExperience(text),
    technologies: detectTechnologies(text),
    requirements: detectRequirements(text),
    salary: detectSalary(text),
    source: detectSource(pageData?.url || ""),
    url: pageData?.url || "No detectado",
    description: text ? text.slice(0, 1200) : "No detectado",
    rawText: text || "No detectado"
  };
}

function normalizeText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function detectTitle(pageData, text) {
  const titleHint = normalizeText(pageData?.titleHint);
  if (looksLikeJobTitle(titleHint)) return titleHint;

  const firstLine = text.split(/(?=Empresa|Company|Ubicaci[oó]n|Modalidad|Remoto|Presencial|H[ií]brido)/i)[0].trim();
  if (looksLikeJobTitle(firstLine)) return cleanField(firstLine);

  const pageTitle = normalizeText(pageData?.pageTitle).split("|")[0].split("-")[0].trim();
  if (looksLikeJobTitle(pageTitle)) return pageTitle;

  const match = text.match(/(?:buscamos|se busca|position|puesto|vacante|cargo)[:\s]+([^.;]{8,120})/i);
  return match ? cleanField(match[1]) : "No detectado";
}

function looksLikeJobTitle(text) {
  return text && !/^\d+$/.test(text) && text.length >= 4 && text.length <= 160 && /(developer|dev|programador|desarrollador|backend|frontend|full stack|python|flask|trainee|junior|jr|software|web|analista)/i.test(text);
}

function detectCompany(text) {
  const patterns = [
    /empresa[:\s]+([^.;|]{2,80})/i,
    /company[:\s]+([^.;|]{2,80})/i,
    /(?:^|\s)(Confidencial|Importante empresa|ManpowerGroup|Adecco|Randstad|Accenture|Globant|Mercado Libre)(?:\s|$)/i,
    /en\s+([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ0-9&.\s]{2,60})\s+(?:buscamos|estamos|se encuentra)/i
  ];
  return findFirst(patterns, text);
}

function detectLocation(text) {
  const locations = ["Argentina", "Buenos Aires", "CABA", "Cordoba", "Rosario", "Mendoza", "LATAM", "Latinoamerica", "Uruguay", "Chile", "Mexico", "Exterior"];
  const found = locations.find((location) => new RegExp(`\\b${escapeRegExp(location)}\\b`, "i").test(text));
  if (found) return found;

  const match = text.match(/ubicaci[oó]n[:\s]+([^.;|]{2,80})/i);
  return match ? cleanField(match[1]) : "No detectado";
}

function detectModality(text) {
  if (/remoto|remote|home office|work from home/i.test(text)) return "Remoto";
  if (/h[ií]brido|hybrid/i.test(text)) return "Hibrido";
  if (/presencial|onsite|oficina/i.test(text)) return "Presencial";
  return "No detectado";
}

function detectSeniority(text) {
  if (/\b(trainee|entry level|inicial|pr[aá]ctica|pasant[ií]a)\b/i.test(text)) return "Trainee / Entry Level";
  if (/\b(junior|jr\.?|semi junior)\b/i.test(text)) return "Junior";
  if (/\b(ssr|semi senior|semisenior)\b/i.test(text)) return "SSR";
  if (/\b(senior|sr\.?|lead|architect)\b/i.test(text)) return "Senior";
  return "No detectado";
}

function detectExperience(text) {
  const ranges = [
    /(\d+)\s*(?:a|-)\s*(\d+)\s*(?:anos|años|years|yrs)\s+de\s+experiencia/i,
    /experiencia\s+(?:de\s+)?(\d+)\s*(?:a|-)\s*(\d+)\s*(?:anos|años|years|yrs)/i
  ];
  for (const pattern of ranges) {
    const match = text.match(pattern);
    if (match) return `${match[1]} a ${match[2]} anos`;
  }

  const single = text.match(/(?:experiencia\s+(?:de\s+)?|minimo\s+|mínimo\s+|al menos\s+)?(\d+)\s*(?:\+)?\s*(?:anos|años|years|yrs)(?:\s+de\s+experiencia)?/i);
  if (single) return `${single[1]} anos`;
  if (/sin experiencia|no requiere experiencia|primer empleo|primera experiencia/i.test(text)) return "Sin experiencia";
  if (/experiencia deseable|deseable experiencia/i.test(text)) return "Deseable";
  return "No detectado";
}

function detectTechnologies(text) {
  const found = KNOWN_TECHS.filter((tech) => new RegExp(`\\b${escapeRegExp(tech)}\\b`, "i").test(text));
  return [...new Set(found)];
}

function detectRequirements(text) {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const requirementSentences = sentences.filter((sentence) => /(requisito|experiencia|conocimiento|excluyente|deseable|manejo|dominio|anos|años)/i.test(sentence));
  return requirementSentences.slice(0, 5).map(cleanField);
}

function detectSalary(text) {
  const match = text.match(/(?:(?:sueldo|salario|remuneraci[oó]n|rango salarial)[:\s]*)?(?:USD|US\$|\$|ARS)\s?\d[\d.,]*(?:\s?-\s?(?:USD|US\$|\$|ARS)?\s?\d[\d.,]*)?/i);
  if (match) return match[0];
  if (/sueldo a convenir|salario a convenir|remuneraci[oó]n a convenir/i.test(text)) return "A convenir";
  if (/no informa sueldo|sueldo no informado|salario no informado/i.test(text)) return "No informado";
  return match ? match[0] : "No detectado";
}

function detectSource(url) {
  const value = String(url || "").toLowerCase();
  if (value.includes("computrabajo")) return "Computrabajo";
  if (value.includes("linkedin")) return "LinkedIn";
  if (value.includes("indeed")) return "Indeed";
  if (value.includes("zonajobs")) return "Zonajobs";
  if (value.includes("bumeran")) return "Bumeran";
  if (value.includes("getonbrd")) return "Get on Board";
  if (value.includes("google")) return "Google";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch (error) {
    return "No detectado";
  }
}

function findFirst(patterns, text) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return cleanField(match[1]);
  }
  return "No detectado";
}

function cleanField(value) {
  return normalizeText(value).replace(/^[,:\-\s]+|[,:\-\s]+$/g, "").slice(0, 160) || "No detectado";
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
