use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

// 章节信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChapterInfo {
    pub id: String,
    pub title: String,
    pub filename: String,
    pub order: usize,
}

// 项目元数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectMetadata {
    pub name: String,
    pub chapters: Vec<ChapterInfo>,
}

// 创建新项目
#[tauri::command]
fn new_project(project_path: String, project_name: String) -> Result<ProjectMetadata, String> {
    let path = PathBuf::from(&project_path);
    
    // 创建项目目录
    fs::create_dir_all(&path)
        .map_err(|e| format!("创建目录失败: {}", e))?;
    
    // 创建 chapters 子目录
    let chapters_dir = path.join("chapters");
    fs::create_dir_all(&chapters_dir)
        .map_err(|e| format!("创建章节目录失败: {}", e))?;
    
    // 初始化项目元数据
    let metadata = ProjectMetadata {
        name: project_name,
        chapters: Vec::new(),
    };
    
    // 保存元数据文件
    let metadata_path = path.join("project.json");
    let json = serde_json::to_string_pretty(&metadata)
        .map_err(|e| format!("序列化失败: {}", e))?;
    fs::write(metadata_path, json)
        .map_err(|e| format!("写入元数据失败: {}", e))?;
    
    Ok(metadata)
}

// 打开项目
#[tauri::command]
fn open_project(project_path: String) -> Result<ProjectMetadata, String> {
    let path = PathBuf::from(&project_path);
    
    // 检查路径是否存在
    if !path.exists() {
        return Err("项目文件夹不存在".to_string());
    }
    
    // 检查是否是目录
    if !path.is_dir() {
        return Err("选择的路径不是一个文件夹".to_string());
    }
    
    let metadata_path = path.join("project.json");
    
    // 检查 project.json 是否存在
    if !metadata_path.exists() {
        return Err("找不到 project.json 文件，这不是一个有效的 Writer's IDE 项目".to_string());
    }
    
    // 读取元数据文件
    let json = fs::read_to_string(&metadata_path)
        .map_err(|e| format!("读取项目文件失败: {}", e))?;
    
    let metadata: ProjectMetadata = serde_json::from_str(&json)
        .map_err(|e| format!("解析项目文件失败: {}", e))?;
    
    Ok(metadata)
}

// 保存章节内容
#[tauri::command]
fn save_chapter(project_path: String, chapter_id: String, content: String) -> Result<(), String> {
    let path = PathBuf::from(&project_path);
    let chapter_path = path.join("chapters").join(format!("{}.md", chapter_id));
    
    fs::write(chapter_path, content)
        .map_err(|e| format!("保存章节失败: {}", e))?;
    
    Ok(())
}

// 加载章节内容
#[tauri::command]
fn load_chapter(project_path: String, chapter_id: String) -> Result<String, String> {
    let path = PathBuf::from(&project_path);
    let chapter_path = path.join("chapters").join(format!("{}.md", chapter_id));
    
    let content = fs::read_to_string(chapter_path)
        .map_err(|e| format!("加载章节失败: {}", e))?;
    
    Ok(content)
}

// 创建新章节
#[tauri::command]
fn create_chapter(
    project_path: String,
    chapter_title: String,
    chapter_id: String,
) -> Result<ProjectMetadata, String> {
    let path = PathBuf::from(&project_path);
    let metadata_path = path.join("project.json");
    
    // 读取现有元数据
    let json = fs::read_to_string(&metadata_path)
        .map_err(|e| format!("读取项目文件失败: {}", e))?;
    let mut metadata: ProjectMetadata = serde_json::from_str(&json)
        .map_err(|e| format!("解析项目文件失败: {}", e))?;
    
    // 添加新章节
    let new_chapter = ChapterInfo {
        id: chapter_id.clone(),
        title: chapter_title,
        filename: format!("{}.md", chapter_id),
        order: metadata.chapters.len(),
    };
    metadata.chapters.push(new_chapter);
    
    // 保存更新后的元数据
    let json = serde_json::to_string_pretty(&metadata)
        .map_err(|e| format!("序列化失败: {}", e))?;
    fs::write(metadata_path, json)
        .map_err(|e| format!("写入元数据失败: {}", e))?;
    
    // 创建空章节文件
    let chapter_path = path.join("chapters").join(format!("{}.md", chapter_id));
    fs::write(chapter_path, "")
        .map_err(|e| format!("创建章节文件失败: {}", e))?;
    
    Ok(metadata)
}

// 更新项目元数据
#[tauri::command]
fn update_metadata(project_path: String, metadata: ProjectMetadata) -> Result<(), String> {
    let path = PathBuf::from(&project_path);
    let metadata_path = path.join("project.json");
    
    let json = serde_json::to_string_pretty(&metadata)
        .map_err(|e| format!("序列化失败: {}", e))?;
    fs::write(metadata_path, json)
        .map_err(|e| format!("写入元数据失败: {}", e))?;
    
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            new_project,
            open_project,
            save_chapter,
            load_chapter,
            create_chapter,
            update_metadata,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
