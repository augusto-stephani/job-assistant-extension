import { DEFAULT_PROFILE, DEFAULT_SETTINGS, getProfile, getSettings, saveProfile, saveSettings } from "./utils/storage.js";

const form = document.querySelector("#profileForm");
const status = document.querySelector("#status");
const fields = ["name", "location", "objective", "skills", "experience", "english", "preferences", "avoid", "basePitch"];

document.querySelector("#resetBtn").addEventListener("click", () => fillForm(DEFAULT_PROFILE));
form.addEventListener("submit", save);

load();

async function load() {
  fillForm(await getProfile());
  const settings = await getSettings();
  document.querySelector("#autoSaveScore").value = settings.autoSaveScore;
}

function fillForm(profile) {
  fields.forEach((field) => {
    const element = document.querySelector(`#${field}`);
    const value = profile[field];
    element.value = Array.isArray(value) ? value.join("\n") : (value || "");
  });
}

async function save(event) {
  event.preventDefault();
  const profile = {};
  fields.forEach((field) => {
    profile[field] = document.querySelector(`#${field}`).value;
  });

  await saveProfile(profile);
  await saveSettings({
    autoSaveScore: Number(document.querySelector("#autoSaveScore").value || DEFAULT_SETTINGS.autoSaveScore)
  });
  status.textContent = "Perfil guardado.";
  setTimeout(() => status.textContent = "", 2200);
}
