use std::collections::HashSet;
use std::fs;
use std::path::PathBuf;

use crate::core::models::{
    character_slug, ChapterInfo, CharacterInfo, OutlineInfo, ProjectMetadata,
};
use crate::core::paths::{validate_id, validate_project_filename, ProjectPaths};
use crate::core::storage::{ensure_dir, read_text, safe_write_text};

pub fn new_project(project_path: String, project_name: String) -> Result<ProjectMetadata, String> {
    let paths = ProjectPaths::new(&project_path);
    ensure_dir(paths.root(), "项目")?;
    ensure_dir(&paths.chapters_dir(), "章节")?;
    ensure_dir(&paths.outlines_dir(), "大纲")?;
    ensure_dir(&paths.characters_dir(), "角色")?;

    let metadata = ProjectMetadata {
        name: project_name,
        chapters: Vec::new(),
        outlines: Vec::new(),
        characters: Vec::new(),
    };
    write_metadata(&paths, &metadata)?;
    Ok(metadata)
}

pub fn open_project(project_path: String) -> Result<ProjectMetadata, String> {
    let paths = ProjectPaths::new(&project_path);
    if !paths.root().exists() {
        return Err("项目文件夹不存在".to_string());
    }
    if !paths.root().is_dir() {
        return Err("选择的路径不是一个文件夹".to_string());
    }

    let project_file = paths.metadata();
    if !project_file.exists() {
        return Err("找不到 project.json 文件，这不是一个有效的 JieSheng 项目".to_string());
    }

    let chapters_dir = paths.chapters_dir();
    if !chapters_dir.exists() || !chapters_dir.is_dir() {
        return Err("项目结构不完整：缺少 chapters 目录".to_string());
    }

    ensure_dir(&paths.outlines_dir(), "大纲")?;
    ensure_dir(&paths.characters_dir(), "角色")?;

    let metadata = read_metadata(&paths)?;
    validate_metadata(&metadata)?;
    write_metadata(&paths, &metadata)?;
    Ok(metadata)
}

pub fn save_chapter(
    project_path: String,
    chapter_id: String,
    content: String,
) -> Result<(), String> {
    let paths = ProjectPaths::new(&project_path);
    let chapter_path = paths.chapter_file(&chapter_id)?;
    safe_write_text(&chapter_path, &content, "章节")
}

pub fn load_chapter(project_path: String, chapter_id: String) -> Result<String, String> {
    let paths = ProjectPaths::new(&project_path);
    let chapter_path = paths.chapter_file(&chapter_id)?;
    read_text(&chapter_path, "章节")
}

pub fn create_chapter(
    project_path: String,
    chapter_title: String,
    chapter_id: String,
) -> Result<ProjectMetadata, String> {
    validate_id(&chapter_id, "章节 ID")?;
    let paths = ProjectPaths::new(&project_path);
    let mut metadata = read_metadata(&paths)?;
    metadata.chapters.push(ChapterInfo {
        id: chapter_id.clone(),
        title: chapter_title,
        filename: format!("{}.md", chapter_id),
        order: metadata.chapters.len(),
    });
    validate_metadata(&metadata)?;
    write_metadata(&paths, &metadata)?;

    let chapter_path = paths.chapter_file(&chapter_id)?;
    safe_write_text(&chapter_path, "", "章节文件")?;
    Ok(metadata)
}

pub fn update_metadata(project_path: String, metadata: ProjectMetadata) -> Result<(), String> {
    validate_metadata(&metadata)?;
    let paths = ProjectPaths::new(&project_path);
    write_metadata(&paths, &metadata)
}

pub fn create_outline(
    project_path: String,
    outline_title: String,
    outline_id: String,
) -> Result<ProjectMetadata, String> {
    validate_id(&outline_id, "大纲 ID")?;
    let paths = ProjectPaths::new(&project_path);
    let mut metadata = read_metadata(&paths)?;
    metadata.outlines.push(OutlineInfo {
        id: outline_id.clone(),
        title: outline_title,
        filename: format!("{}.md", outline_id),
        order: metadata.outlines.len(),
    });
    validate_metadata(&metadata)?;
    write_metadata(&paths, &metadata)?;

    let outline_path = paths.outline_file(&outline_id)?;
    safe_write_text(&outline_path, "", "大纲文件")?;
    Ok(metadata)
}

pub fn load_outline(project_path: String, outline_id: String) -> Result<String, String> {
    let paths = ProjectPaths::new(&project_path);
    let outline_path = paths.outline_file(&outline_id)?;
    read_text(&outline_path, "大纲")
}

pub fn save_outline(
    project_path: String,
    outline_id: String,
    content: String,
) -> Result<(), String> {
    let paths = ProjectPaths::new(&project_path);
    let outline_path = paths.outline_file(&outline_id)?;
    safe_write_text(&outline_path, &content, "大纲")
}

pub fn create_character(
    project_path: String,
    character_name: String,
    character_id: String,
) -> Result<ProjectMetadata, String> {
    validate_id(&character_id, "角色 ID")?;
    let paths = ProjectPaths::new(&project_path);
    let mut metadata = read_metadata(&paths)?;
    if metadata
        .characters
        .iter()
        .any(|character| character.name == character_name)
    {
        return Err("角色名已存在，请使用其他名称".to_string());
    }

    let filename = format!("{}_{}.md", character_slug(&character_name), character_id);
    validate_project_filename(&filename, "角色文件名")?;
    metadata.characters.push(CharacterInfo {
        id: character_id.clone(),
        name: character_name.clone(),
        filename: filename.clone(),
        role: "配角".to_string(),
        tags: Vec::new(),
    });
    validate_metadata(&metadata)?;
    write_metadata(&paths, &metadata)?;

    let template = format!(
        "---\nid: {}\nschema_version: 1\nname: {}\naliases: []\nrole: 配角\ntags: []\navatar: \"\"\nattributes:\n  appearance: \"\"\n  background: \"\"\n  weapon: \"\"\nstate:\n  level: \"\"\n  health: \"\"\n  location: \"\"\nrelationships: []\n---\n\n<p></p>\n",
        character_id, character_name
    );
    let character_path = paths.character_file(&filename)?;
    safe_write_text(&character_path, &template, "角色文件")?;
    Ok(metadata)
}

pub fn load_character(project_path: String, character_id: String) -> Result<String, String> {
    let paths = ProjectPaths::new(&project_path);
    let metadata = read_metadata(&paths)?;
    let character = find_character(&metadata, &character_id)?;
    let character_path = paths.character_file(&character.filename)?;
    read_text(&character_path, "角色")
}

pub fn save_character(
    project_path: String,
    character_id: String,
    content: String,
) -> Result<(), String> {
    let paths = ProjectPaths::new(&project_path);
    let metadata = read_metadata(&paths)?;
    let character = find_character(&metadata, &character_id)?;
    let character_path = paths.character_file(&character.filename)?;
    safe_write_text(&character_path, &content, "角色")
}

pub fn rename_character(
    project_path: String,
    character_id: String,
    new_name: String,
) -> Result<ProjectMetadata, String> {
    validate_id(&character_id, "角色 ID")?;
    let paths = ProjectPaths::new(&project_path);
    let mut metadata = read_metadata(&paths)?;
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
    validate_metadata(&metadata)?;
    write_metadata(&paths, &metadata)?;
    Ok(metadata)
}

pub fn delete_character(
    project_path: String,
    character_id: String,
) -> Result<ProjectMetadata, String> {
    validate_id(&character_id, "角色 ID")?;
    let paths = ProjectPaths::new(&project_path);
    let mut metadata = read_metadata(&paths)?;
    let index = metadata
        .characters
        .iter()
        .position(|character| character.id == character_id)
        .ok_or_else(|| "找不到角色".to_string())?;

    let removed = metadata.characters.remove(index);
    let character_path = paths.character_file(&removed.filename)?;
    if character_path.exists() {
        fs::remove_file(character_path).map_err(|e| format!("删除角色文件失败: {}", e))?;
    }
    write_metadata(&paths, &metadata)?;
    Ok(metadata)
}

pub fn copy_avatar_to_project(
    project_path: String,
    character_id: String,
    source_path: String,
) -> Result<String, String> {
    validate_id(&character_id, "角色 ID")?;
    let source = PathBuf::from(&source_path);
    if !source.exists() {
        return Err("头像文件不存在".to_string());
    }
    if !source.is_file() {
        return Err("选择的头像不是文件".to_string());
    }

    let size = source
        .metadata()
        .map_err(|e| format!("读取头像文件信息失败: {}", e))?
        .len();
    if size > 10 * 1024 * 1024 {
        return Err("头像文件不能超过 10MB".to_string());
    }

    let paths = ProjectPaths::new(&project_path);
    ensure_dir(&paths.avatars_dir(), "头像")?;

    let extension = source
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("png")
        .to_ascii_lowercase();
    let target = paths.avatar_file(&character_id, &extension)?;
    fs::copy(&source, &target).map_err(|e| format!("复制头像失败: {}", e))?;
    Ok(target.to_string_lossy().to_string())
}

fn read_metadata(paths: &ProjectPaths) -> Result<ProjectMetadata, String> {
    let json = read_text(&paths.metadata(), "项目文件")?;
    serde_json::from_str::<ProjectMetadata>(&json).map_err(|e| format!("解析项目文件失败: {}", e))
}

fn write_metadata(paths: &ProjectPaths, metadata: &ProjectMetadata) -> Result<(), String> {
    validate_metadata(metadata)?;
    let json =
        serde_json::to_string_pretty(metadata).map_err(|e| format!("序列化项目文件失败: {}", e))?;
    safe_write_text(&paths.metadata(), &json, "项目文件")
}

fn find_character<'a>(
    metadata: &'a ProjectMetadata,
    character_id: &str,
) -> Result<&'a CharacterInfo, String> {
    validate_id(character_id, "角色 ID")?;
    metadata
        .characters
        .iter()
        .find(|character| character.id == character_id)
        .ok_or_else(|| "找不到角色".to_string())
}

fn validate_metadata(metadata: &ProjectMetadata) -> Result<(), String> {
    let mut chapter_ids = HashSet::new();
    for chapter in &metadata.chapters {
        validate_id(&chapter.id, "章节 ID")?;
        if !chapter_ids.insert(&chapter.id) {
            return Err("章节 ID 不能重复".to_string());
        }
        validate_project_filename(&chapter.filename, "章节文件名")?;
        if chapter.filename != format!("{}.md", chapter.id) {
            return Err("章节文件名必须与章节 ID 对应".to_string());
        }
    }

    let mut outline_ids = HashSet::new();
    for outline in &metadata.outlines {
        validate_id(&outline.id, "大纲 ID")?;
        if !outline_ids.insert(&outline.id) {
            return Err("大纲 ID 不能重复".to_string());
        }
        validate_project_filename(&outline.filename, "大纲文件名")?;
        if outline.filename != format!("{}.md", outline.id) {
            return Err("大纲文件名必须与大纲 ID 对应".to_string());
        }
    }

    let mut character_ids = HashSet::new();
    for character in &metadata.characters {
        validate_id(&character.id, "角色 ID")?;
        if !character_ids.insert(&character.id) {
            return Err("角色 ID 不能重复".to_string());
        }
        validate_project_filename(&character.filename, "角色文件名")?;
    }

    Ok(())
}
