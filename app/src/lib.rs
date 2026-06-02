use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChapterInfo {
    pub id: String,
    pub title: String,
    pub filename: String,
    pub order: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OutlineInfo {
    pub id: String,
    pub title: String,
    pub filename: String,
    pub order: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CharacterInfo {
    pub id: String,
    pub name: String,
    pub filename: String,
    pub role: String,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectMetadata {
    pub name: String,
    #[serde(default)]
    pub chapters: Vec<ChapterInfo>,
    #[serde(default)]
    pub outlines: Vec<OutlineInfo>,
    #[serde(default)]
    pub characters: Vec<CharacterInfo>,
}

fn project_root(project_path: &str) -> PathBuf {
    PathBuf::from(project_path)
}

fn metadata_path(project_path: &str) -> PathBuf {
    project_root(project_path).join("project.json")
}

fn read_metadata(project_path: &str) -> Result<ProjectMetadata, String> {
    let path = metadata_path(project_path);
    let json = fs::read_to_string(&path)
        .map_err(|e| format!("读取项目文件失败: {}", e))?;
    serde_json::from_str::<ProjectMetadata>(&json)
        .map_err(|e| format!("解析项目文件失败: {}", e))
}

fn write_metadata(project_path: &str, metadata: &ProjectMetadata) -> Result<(), String> {
    let json = serde_json::to_string_pretty(metadata)
        .map_err(|e| format!("序列化项目文件失败: {}", e))?;
    fs::write(metadata_path(project_path), json)
        .map_err(|e| format!("写入项目文件失败: {}", e))
}

fn ensure_dir(path: &Path, label: &str) -> Result<(), String> {
    fs::create_dir_all(path).map_err(|e| format!("创建{}目录失败: {}", label, e))
}

fn find_character<'a>(
    metadata: &'a ProjectMetadata,
    character_id: &str,
) -> Result<&'a CharacterInfo, String> {
    metadata
        .characters
        .iter()
        .find(|character| character.id == character_id)
        .ok_or_else(|| "找不到角色".to_string())
}

fn character_slug(name: &str) -> String {
    let slug = name
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() {
                c.to_ascii_lowercase()
            } else {
                '_'
            }
        })
        .collect::<String>();

    if slug.trim_matches('_').is_empty() {
        "character".to_string()
    } else {
        slug
    }
}

#[tauri::command]
fn new_project(project_path: String, project_name: String) -> Result<ProjectMetadata, String> {
    let root = project_root(&project_path);
    ensure_dir(&root, "项目")?;
    ensure_dir(&root.join("chapters"), "章节")?;
    ensure_dir(&root.join("outlines"), "大纲")?;
    ensure_dir(&root.join("characters"), "角色")?;

    let metadata = ProjectMetadata {
        name: project_name,
        chapters: Vec::new(),
        outlines: Vec::new(),
        characters: Vec::new(),
    };
    write_metadata(&project_path, &metadata)?;
    Ok(metadata)
}

#[tauri::command]
fn open_project(project_path: String) -> Result<ProjectMetadata, String> {
    let root = project_root(&project_path);
    if !root.exists() {
        return Err("项目文件夹不存在".to_string());
    }
    if !root.is_dir() {
        return Err("选择的路径不是一个文件夹".to_string());
    }

    let project_file = metadata_path(&project_path);
    if !project_file.exists() {
        return Err("找不到 project.json 文件，这不是一个有效的 JieSheng 项目".to_string());
    }

    let chapters_dir = root.join("chapters");
    if !chapters_dir.exists() || !chapters_dir.is_dir() {
        return Err("项目结构不完整：缺少 chapters 目录".to_string());
    }

    ensure_dir(&root.join("outlines"), "大纲")?;
    ensure_dir(&root.join("characters"), "角色")?;

    let metadata = read_metadata(&project_path)?;
    write_metadata(&project_path, &metadata)?;
    Ok(metadata)
}

#[tauri::command]
fn save_chapter(project_path: String, chapter_id: String, content: String) -> Result<(), String> {
    let chapter_path = project_root(&project_path)
        .join("chapters")
        .join(format!("{}.md", chapter_id));
    fs::write(chapter_path, content).map_err(|e| format!("保存章节失败: {}", e))
}

#[tauri::command]
fn load_chapter(project_path: String, chapter_id: String) -> Result<String, String> {
    let chapter_path = project_root(&project_path)
        .join("chapters")
        .join(format!("{}.md", chapter_id));
    fs::read_to_string(chapter_path).map_err(|e| format!("加载章节失败: {}", e))
}

#[tauri::command]
fn create_chapter(
    project_path: String,
    chapter_title: String,
    chapter_id: String,
) -> Result<ProjectMetadata, String> {
    let mut metadata = read_metadata(&project_path)?;
    metadata.chapters.push(ChapterInfo {
        id: chapter_id.clone(),
        title: chapter_title,
        filename: format!("{}.md", chapter_id),
        order: metadata.chapters.len(),
    });
    write_metadata(&project_path, &metadata)?;

    let chapter_path = project_root(&project_path)
        .join("chapters")
        .join(format!("{}.md", chapter_id));
    fs::write(chapter_path, "").map_err(|e| format!("创建章节文件失败: {}", e))?;
    Ok(metadata)
}

#[tauri::command]
fn update_metadata(project_path: String, metadata: ProjectMetadata) -> Result<(), String> {
    write_metadata(&project_path, &metadata)
}

#[tauri::command]
fn create_outline(
    project_path: String,
    outline_title: String,
    outline_id: String,
) -> Result<ProjectMetadata, String> {
    let mut metadata = read_metadata(&project_path)?;
    metadata.outlines.push(OutlineInfo {
        id: outline_id.clone(),
        title: outline_title,
        filename: format!("{}.md", outline_id),
        order: metadata.outlines.len(),
    });
    write_metadata(&project_path, &metadata)?;

    let outline_path = project_root(&project_path)
        .join("outlines")
        .join(format!("{}.md", outline_id));
    fs::write(outline_path, "").map_err(|e| format!("创建大纲文件失败: {}", e))?;
    Ok(metadata)
}

#[tauri::command]
fn load_outline(project_path: String, outline_id: String) -> Result<String, String> {
    let outline_path = project_root(&project_path)
        .join("outlines")
        .join(format!("{}.md", outline_id));
    fs::read_to_string(outline_path).map_err(|e| format!("加载大纲失败: {}", e))
}

#[tauri::command]
fn save_outline(project_path: String, outline_id: String, content: String) -> Result<(), String> {
    let outline_path = project_root(&project_path)
        .join("outlines")
        .join(format!("{}.md", outline_id));
    fs::write(outline_path, content).map_err(|e| format!("保存大纲失败: {}", e))
}

#[tauri::command]
fn create_character(
    project_path: String,
    character_name: String,
    character_id: String,
) -> Result<ProjectMetadata, String> {
    let mut metadata = read_metadata(&project_path)?;
    if metadata
        .characters
        .iter()
        .any(|character| character.name == character_name)
    {
        return Err("角色名已存在，请使用其他名称".to_string());
    }

    let filename = format!("{}_{}.md", character_slug(&character_name), character_id);
    metadata.characters.push(CharacterInfo {
        id: character_id.clone(),
        name: character_name.clone(),
        filename: filename.clone(),
        role: "配角".to_string(),
        tags: Vec::new(),
    });
    write_metadata(&project_path, &metadata)?;

    let template = format!(
        "---\nid: {}\nschema_version: 1\nname: {}\naliases: []\nrole: 配角\ntags: []\navatar: \"\"\nattributes:\n  appearance: \"\"\n  background: \"\"\n  weapon: \"\"\nstate:\n  level: \"\"\n  health: \"\"\n  location: \"\"\nrelationships: []\n---\n\n<p></p>\n",
        character_id, character_name
    );
    let character_path = project_root(&project_path).join("characters").join(filename);
    fs::write(character_path, template).map_err(|e| format!("创建角色文件失败: {}", e))?;
    Ok(metadata)
}

#[tauri::command]
fn load_character(project_path: String, character_id: String) -> Result<String, String> {
    let metadata = read_metadata(&project_path)?;
    let character = find_character(&metadata, &character_id)?;
    let character_path = project_root(&project_path)
        .join("characters")
        .join(&character.filename);
    fs::read_to_string(character_path).map_err(|e| format!("加载角色失败: {}", e))
}

#[tauri::command]
fn save_character(project_path: String, character_id: String, content: String) -> Result<(), String> {
    let metadata = read_metadata(&project_path)?;
    let character = find_character(&metadata, &character_id)?;
    let character_path = project_root(&project_path)
        .join("characters")
        .join(&character.filename);
    fs::write(character_path, content).map_err(|e| format!("保存角色失败: {}", e))
}

#[tauri::command]
fn rename_character(
    project_path: String,
    character_id: String,
    new_name: String,
) -> Result<ProjectMetadata, String> {
    let mut metadata = read_metadata(&project_path)?;
    if metadata
        .characters
        .iter()
        .any(|character| character.name == new_name && character.id != character_id)
    {
        return Err("角色名已存在，请使用其他名称".to_string());
    }

    let target = metadata
        .characters
        .iter_mut()
        .find(|character| character.id == character_id)
        .ok_or_else(|| "找不到角色".to_string())?;
    target.name = new_name;
    write_metadata(&project_path, &metadata)?;
    Ok(metadata)
}

#[tauri::command]
fn delete_character(project_path: String, character_id: String) -> Result<ProjectMetadata, String> {
    let mut metadata = read_metadata(&project_path)?;
    let index = metadata
        .characters
        .iter()
        .position(|character| character.id == character_id)
        .ok_or_else(|| "找不到角色".to_string())?;

    let removed = metadata.characters.remove(index);
    let character_path = project_root(&project_path)
        .join("characters")
        .join(removed.filename);
    if character_path.exists() {
        fs::remove_file(character_path).map_err(|e| format!("删除角色文件失败: {}", e))?;
    }
    write_metadata(&project_path, &metadata)?;
    Ok(metadata)
}

#[tauri::command]
fn copy_avatar_to_project(
    project_path: String,
    character_id: String,
    source_path: String,
) -> Result<String, String> {
    let source = PathBuf::from(&source_path);
    if !source.exists() {
        return Err("头像文件不存在".to_string());
    }
    if !source.is_file() {
        return Err("选择的头像不是文件".to_string());
    }

    let avatars_dir = project_root(&project_path).join("assets").join("avatars");
    ensure_dir(&avatars_dir, "头像")?;

    let extension = source
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("png");
    let target = avatars_dir.join(format!("{}_avatar.{}", character_id, extension));
    fs::copy(&source, &target).map_err(|e| format!("复制头像失败: {}", e))?;
    Ok(target.to_string_lossy().to_string())
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
            create_outline,
            load_outline,
            save_outline,
            create_character,
            load_character,
            save_character,
            rename_character,
            delete_character,
            copy_avatar_to_project,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
