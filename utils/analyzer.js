const PROFILE_TECHS = ["python", "flask", "sqlite", "sql", "html", "css", "javascript", "api rest", "rest", "postman", "git", "github"];
const BAD_TECHS = ["java avanzado", ".net avanzado", "devops avanzado", "kubernetes avanzado", "aws avanzado", "azure avanzado", "spring boot", "microservicios avanzados"];

export function analyzeJob(job, profile) {
  const text = `${job.title} ${job.description} ${job.rawText}`.toLowerCase();
  let score = 45;
  const pros = [];
  const cons = [];

  addIf(text, ["python"], 12, "Menciona Python.");
  addIf(text, ["flask"], 12, "Menciona Flask.");
  addIf(text, ["api rest", "rest api", "apis rest"], 8, "Incluye APIs REST.");
  addIf(text, ["sqlite", "sql", "mysql", "postgresql"], 7, "Pide SQL o bases de datos relacionales.");
  addIf(text, ["html", "css", "javascript"], 7, "Coincide con HTML/CSS/JavaScript.");
  addIf(text, ["junior", "jr", "trainee", "entry level", "inicial"], 16, "El seniority parece adecuado.");
  addIf(text, ["remoto", "remote", "home office", "work from home"], 12, "La modalidad remota coincide con tu preferencia principal.");
  addIf(text, ["hibrido", "hybrid"], 5, "La modalidad hibrida puede ser compatible.");
  addIf(text, ["argentina", "buenos aires", "caba", "latam", "latinoamerica", "remote worldwide"], 8, "La ubicacion o alcance parece compatible.");

  if (job.salary && !/no detectado|no informado/i.test(job.salary)) {
    score += 5;
    pros.push(`Informa sueldo: ${job.salary}.`);
  }

  const years = detectYears(text);
  if (/sin experiencia|no requiere experiencia|primer empleo|primera experiencia/i.test(text)) {
    score += 12;
    pros.push("Es compatible con primera experiencia.");
  }
  if (years.length && Math.min(...years) <= 2) {
    score += 8;
    pros.push("La experiencia requerida parece alcanzable.");
  }
  if (years.some((year) => year > 3)) {
    score -= 18;
    cons.push("Pide mas de 3 anos de experiencia.");
  }

  if (/\b(senior|sr\.?|lead|architect)\b/i.test(text)) {
    score -= 25;
    cons.push("Detecta seniority Senior o Lead.");
  }

  if (/\b(ssr|semi senior|semisenior)\b/i.test(text)) {
    score -= 10;
    cons.push("Puede ser SSR o mas exigente que Jr.");
  }

  if (/presencial/i.test(job.modality) && !/buenos aires|caba|argentina/i.test(job.location)) {
    score -= 12;
    cons.push("La oferta parece presencial y la ubicacion no es clara o no coincide.");
  } else if (/presencial/i.test(job.modality)) {
    score -= 6;
    cons.push("Es presencial, menor prioridad frente a remoto.");
  }

  BAD_TECHS.forEach((tech) => {
    if (text.includes(tech)) {
      score -= 8;
      cons.push(`Pide ${tech}, que esta fuera de tu foco actual.`);
    }
  });

  if (!/(developer|programador|backend|frontend|full stack|software|web|python|flask|api|desarrollador)/i.test(text)) {
    score -= 15;
    cons.push("No queda claro que sea una oferta de programacion/backend/web.");
  }

  const matchedSkills = (profile.skills || []).filter((skill) => text.includes(String(skill).toLowerCase()));
  if (matchedSkills.length) {
    pros.push(`Coincide con tu perfil: ${matchedSkills.slice(0, 8).join(", ")}.`);
  }

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    pros: unique(pros),
    cons: unique(cons),
    recommendation: getRecommendation(score, cons),
    summary: buildSummary(score, pros, cons)
  };

  function addIf(source, keywords, points, message) {
    if (keywords.some((keyword) => source.includes(keyword))) {
      score += points;
      pros.push(message);
    }
  }
}

function detectYears(text) {
  const matches = [...text.matchAll(/(\d+)\s*(?:\+)?\s*(?:anos|años|years|yrs)/gi)];
  return matches.map((match) => Number(match[1])).filter(Number.isFinite);
}

function getRecommendation(score, cons) {
  if (score >= 65 && !cons.some((item) => /Senior|mas de 3 anos/i.test(item))) return "Postular";
  if (score >= 45) return "Revisar";
  return "Descartar";
}

function buildSummary(score, pros, cons) {
  if (score >= 65) return "Buena compatibilidad para una postulacion revisada.";
  if (score >= 45) return "Tiene puntos compatibles, pero conviene revisar los requisitos.";
  return "Baja compatibilidad con el perfil objetivo actual.";
}

function unique(items) {
  return [...new Set(items)].filter(Boolean);
}

export function getProfileTechMatches(job) {
  const text = `${job.title} ${job.description} ${job.rawText}`.toLowerCase();
  return PROFILE_TECHS.filter((tech) => text.includes(tech));
}
