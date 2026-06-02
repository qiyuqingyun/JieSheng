use crate::core::models::ProjectMetadata;
use crate::services::project_service;

#[tauri::command]
pub fn save_chapter(
    project_path: String,
    chapter_id: String,
    content: String,
) -> Result<(), String> {
    project_service::save_chapter(project_path, chapter_id, content)
}

#[tauri::command]
pub fn load_chapter(project_path: String, chapter_id: String) -> Result<String, String> {
    project_service::load_chapter(project_path, chapter_id)
}

#[tauri::command]
pub fn create_chapter(
    project_path: String,
    chapter_title: String,
    chapter_id: String,
) -> Result<ProjectMetadata, String> {
    project_service::create_chapter(project_path, chapter_title, chapter_id)
}
