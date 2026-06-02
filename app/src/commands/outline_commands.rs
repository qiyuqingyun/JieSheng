use crate::core::models::ProjectMetadata;
use crate::services::project_service;

#[tauri::command]
pub fn create_outline(
    project_path: String,
    outline_title: String,
    outline_id: String,
) -> Result<ProjectMetadata, String> {
    project_service::create_outline(project_path, outline_title, outline_id)
}

#[tauri::command]
pub fn load_outline(project_path: String, outline_id: String) -> Result<String, String> {
    project_service::load_outline(project_path, outline_id)
}

#[tauri::command]
pub fn save_outline(
    project_path: String,
    outline_id: String,
    content: String,
) -> Result<(), String> {
    project_service::save_outline(project_path, outline_id, content)
}
