use crate::core::models::ProjectMetadata;
use crate::services::project_service;

#[tauri::command]
pub fn new_project(project_path: String, project_name: String) -> Result<ProjectMetadata, String> {
    project_service::new_project(project_path, project_name)
}

#[tauri::command]
pub fn open_project(project_path: String) -> Result<ProjectMetadata, String> {
    project_service::open_project(project_path)
}

#[tauri::command]
pub fn update_metadata(project_path: String, metadata: ProjectMetadata) -> Result<(), String> {
    project_service::update_metadata(project_path, metadata)
}
