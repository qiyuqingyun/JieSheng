use crate::core::models::ProjectMetadata;
use crate::services::project_service;

#[tauri::command]
pub fn create_character(
    project_path: String,
    character_name: String,
    character_id: String,
) -> Result<ProjectMetadata, String> {
    project_service::create_character(project_path, character_name, character_id)
}

#[tauri::command]
pub fn load_character(project_path: String, character_id: String) -> Result<String, String> {
    project_service::load_character(project_path, character_id)
}

#[tauri::command]
pub fn save_character(
    project_path: String,
    character_id: String,
    content: String,
) -> Result<(), String> {
    project_service::save_character(project_path, character_id, content)
}

#[tauri::command]
pub fn rename_character(
    project_path: String,
    character_id: String,
    new_name: String,
) -> Result<ProjectMetadata, String> {
    project_service::rename_character(project_path, character_id, new_name)
}

#[tauri::command]
pub fn delete_character(
    project_path: String,
    character_id: String,
) -> Result<ProjectMetadata, String> {
    project_service::delete_character(project_path, character_id)
}

#[tauri::command]
pub fn copy_avatar_to_project(
    project_path: String,
    character_id: String,
    source_path: String,
) -> Result<String, String> {
    project_service::copy_avatar_to_project(project_path, character_id, source_path)
}
