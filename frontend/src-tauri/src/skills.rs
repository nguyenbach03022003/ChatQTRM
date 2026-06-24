//! Skill system. Skills are user-authored, trusted instruction bundles stored as
//! JSON. Enabled skills are injected into the chat system prompt when relevant.

use chrono::Utc;
use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use uuid::Uuid;

use crate::storage;

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Skill {
    pub id: String,
    pub name: String,
    pub description: String,
    pub instructions: String,
    #[serde(default)]
    pub file_patterns: Vec<String>,
    #[serde(default)]
    pub tools: Vec<String>,
    #[serde(default = "default_true")]
    pub enabled: bool,
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub updated_at: String,
}

fn default_true() -> bool {
    true
}

/// Payload for create/update — `id` is optional (absent = create).
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillInput {
    pub id: Option<String>,
    pub name: String,
    pub description: String,
    pub instructions: String,
    #[serde(default)]
    pub file_patterns: Vec<String>,
    #[serde(default)]
    pub tools: Vec<String>,
    #[serde(default = "default_true")]
    pub enabled: bool,
}

fn load(app: &AppHandle) -> Result<Vec<Skill>, String> {
    storage::read_json(app, "skills.json")
}

fn save(app: &AppHandle, skills: &[Skill]) -> Result<(), String> {
    storage::write_json(app, "skills.json", &skills.to_vec())
}

#[tauri::command]
pub fn list_skills(app: AppHandle) -> Result<Vec<Skill>, String> {
    load(&app)
}

#[tauri::command]
pub fn save_skill(app: AppHandle, input: SkillInput) -> Result<Skill, String> {
    if input.name.trim().is_empty() {
        return Err("Skill name is required.".into());
    }
    let mut skills = load(&app)?;
    let now = Utc::now().to_rfc3339();

    if let Some(id) = &input.id {
        if let Some(existing) = skills.iter_mut().find(|s| &s.id == id) {
            existing.name = input.name;
            existing.description = input.description;
            existing.instructions = input.instructions;
            existing.file_patterns = input.file_patterns;
            existing.tools = input.tools;
            existing.enabled = input.enabled;
            existing.updated_at = now;
            let result = existing.clone();
            save(&app, &skills)?;
            return Ok(result);
        }
    }

    let skill = Skill {
        id: Uuid::new_v4().to_string(),
        name: input.name,
        description: input.description,
        instructions: input.instructions,
        file_patterns: input.file_patterns,
        tools: input.tools,
        enabled: input.enabled,
        created_at: now.clone(),
        updated_at: now,
    };
    skills.push(skill.clone());
    save(&app, &skills)?;
    Ok(skill)
}

#[tauri::command]
pub fn set_skill_enabled(app: AppHandle, id: String, enabled: bool) -> Result<(), String> {
    let mut skills = load(&app)?;
    let skill = skills.iter_mut().find(|s| s.id == id).ok_or("Skill not found.")?;
    skill.enabled = enabled;
    save(&app, &skills)
}

#[tauri::command]
pub fn delete_skill(app: AppHandle, id: String) -> Result<(), String> {
    let mut skills = load(&app)?;
    skills.retain(|s| s.id != id);
    save(&app, &skills)
}

/// Imports a skill from a raw JSON string (the "import skill" feature).
#[tauri::command]
pub fn import_skill(app: AppHandle, json: String) -> Result<Skill, String> {
    let input: SkillInput =
        serde_json::from_str(&json).map_err(|e| format!("Invalid skill JSON: {e}"))?;
    // Force a fresh id on import to avoid clobbering an existing skill.
    save_skill(app, SkillInput { id: None, ..input })
}

/// Builds the system-prompt section for all enabled skills (trusted content).
pub fn enabled_skill_prompt(app: &AppHandle) -> String {
    let skills = load(app).unwrap_or_default();
    let enabled: Vec<&Skill> = skills.iter().filter(|s| s.enabled).collect();
    if enabled.is_empty() {
        return String::new();
    }
    let mut out = String::from("\n\nActive skills (trusted instructions you should apply when relevant):\n");
    for s in enabled {
        out.push_str(&format!(
            "\n### Skill: {}\n{}\nInstructions: {}\n",
            s.name, s.description, s.instructions
        ));
        if !s.file_patterns.is_empty() {
            out.push_str(&format!("Applies to files: {}\n", s.file_patterns.join(", ")));
        }
    }
    out
}
