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

// 大纲信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OutlineInfo {
    pub id: String,
    pub title: String,
    pub filename: String,
    pub order: usize,
}

// 角色信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CharacterInfo {
    pub id: String,
    pub name: String,
    pub filename: String,
    pub role: String,
    pub tags: Vec<String>,
}

// 项目元数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectMetadata {
    pub name: String,
    pub chapters: Vec<ChapterInfo>,
    pub outlines: Vec<OutlineInfo>,
    pub characters: Vec<CharacterInfo>,
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
    // 创建 outlines 子目录
    let outlines_dir = path.join("outlines");
    fs::create_dir_all(&outlines_dir)
        .map_err(|e| format!("创建 outlines 目录失败: {}", e))?;    
    // 创建 characters 子目录
    let characters_dir = path.join("characters");
    fs::create_dir_all(&characters_dir)
        .map_err(|e| format!("创建 characters 目录失败: {}", e))?;
    // 初始化项目元数据
    let metadata = ProjectMetadata {
        name: project_name,
        chapters: Vec::new(),
        outlines: Vec::new(),
        characters: Vec::new(),
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
    
    // 检查 chapters 目录是否存在
    let chapters_dir = path.join("chapters");
    if !chapters_dir.exists() {
        return Err("项目结构不完整：缺少 chapters 目录".to_string());
    }
    
    if !chapters_dir.is_dir() {
        return Err("项目结构不完整：chapters 不是一个目录".to_string());
    }
    
    // 检查并创建 outlines 目录（兼容旧项目）
    let outlines_dir = path.join("outlines");
    if !outlines_dir.exists() {
        fs::create_dir_all(&outlines_dir)
            .map_err(|e| format!("创建 outlines 目录失败: {}", e))?;
    }

    // 检查并创建 characters 目录（兼容旧项目）
    let characters_dir = path.join("characters");
    if !characters_dir.exists() {
        fs::create_dir_all(&characters_dir)
            .map_err(|e| format!("创建 characters 目录失败: {}", e))?;
    }
    
    // 读取元数据文件
    let json = fs::read_to_string(&metadata_path)
        .map_err(|e| format!("读取项目文件失败: {}", e))?;
    
    // 尝试解析，如果没有 outlines 字段则添加空数组
    let metadata: ProjectMetadata = serde_json::from_str(&json)
        .unwrap_or_else(|_| {
            // 兼容旧格式：手动解析并添加 outlines 字段
            let legacy: serde_json::Value = serde_json::from_str(&json).unwrap();
            ProjectMetadata {
                name: legacy["name"].as_str().unwrap_or("未命名项目").to_string(),
                chapters: serde_json::from_value(legacy["chapters"].clone()).unwrap_or_default(),
                outlines: serde_json::from_value(legacy["outlines"].clone()).unwrap_or_default(),
                characters: serde_json::from_value(legacy["characters"].clone()).unwrap_or_default(),
            }
        });
    
    // 如果是旧项目，更新 project.json 添加新增字段
    if metadata.outlines.is_empty() || metadata.characters.is_empty() {
        let updated_json = serde_json::to_string_pretty(&metadata)
            .map_err(|e| format!("序列化失败: {}", e))?;
        fs::write(&metadata_path, updated_json)
            .map_err(|e| format!("更新项目文件失败: {}", e))?;
    }
    
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

// 创建新大纲
#[tauri::command]
fn create_outline(
    project_path: String,
    outline_title: String,
    outline_id: String,
) -> Result<ProjectMetadata, String> {
    let path = PathBuf::from(&project_path);
    let metadata_path = path.join("project.json");
    
    // 读取现有元数据
    let json = fs::read_to_string(&metadata_path)
        .map_err(|e| format!("读取项目文件失败: {}", e))?;
    let mut metadata: ProjectMetadata = serde_json::from_str(&json)
        .map_err(|e| format!("解析项目文件失败: {}", e))?;
    
    // 添加新大纲
    let new_outline = OutlineInfo {
        id: outline_id.clone(),
        title: outline_title,
        filename: format!("{}.md", outline_id),
        order: metadata.outlines.len(),
    };
    metadata.outlines.push(new_outline);
    
    // 保存更新后的元数据
    let json = serde_json::to_string_pretty(&metadata)
        .map_err(|e| format!("序列化失败: {}", e))?;
    fs::write(metadata_path, json)
        .map_err(|e| format!("写入元数据失败: {}", e))?;
    
    // 创建空大纲文件
    let outline_path = path.join("outlines").join(format!("{}.md", outline_id));
    fs::write(outline_path, "")
        .map_err(|e| format!("创建大纲文件失败: {}", e))?;
    
    Ok(metadata)
}

// 加载大纲内容
#[tauri::command]
fn load_outline(project_path: String, outline_id: String) -> Result<String, String> {
    let path = PathBuf::from(&project_path);
    let outline_path = path.join("outlines").join(format!("{}.md", outline_id));
    
    let content = fs::read_to_string(outline_path)
        .map_err(|e| format!("加载大纲失败: {}", e))?;
    
    Ok(content)
}

// 保存大纲内容
#[tauri::command]
fn save_outline(project_path: String, outline_id: String, content: String) -> Result<(), String> {
    let path = PathBuf::from(&project_path);
    let outline_path = path.join("outlines").join(format!("{}.md", outline_id));
    
    fs::write(&outline_path, content)
        .map_err(|e| format!("保存大纲失败: {}", e))?;
    
    Ok(())
}

// 创建新角色
#[tauri::command]
fn create_character(
    project_path: String,
    character_name: String,
    character_id: String,
) -> Result<ProjectMetadata, String> {
    let path = PathBuf::from(&project_path);
    let metadata_path = path.join("project.json");

    let json = fs::read_to_string(&metadata_path)
        .map_err(|e| format!("读取项目文件失败: {}", e))?;
    let mut metadata: ProjectMetadata = serde_json::from_str(&json)
        .map_err(|e| format!("解析项目文件失败: {}", e))?;

    if metadata
        .characters
        .iter()
        .any(|character| character.name == character_name)
    {
        return Err("角色名已存在，请使用其他名称".to_string());
    }

    let slug = character_name
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() {
                c.to_ascii_lowercase()
            } else if c.is_whitespace() {
                '_'
            } else {
                '_'
            }
        })
        .collect::<String>();

    let filename = format!("{}_{}.md", slug, character_id);
    let new_character = CharacterInfo {
        id: character_id.clone(),
        name: character_name.clone(),
        filename: filename.clone(),
        role: "配角".to_string(),
        tags: vec![],
    };
    metadata.characters.push(new_character);

    let updated_json = serde_json::to_string_pretty(&metadata)
        .map_err(|e| format!("序列化失败: {}", e))?;
    fs::write(metadata_path, updated_json)
        .map_err(|e| format!("写入元数据失败: {}", e))?;

    let template = format!(
        "---\nid: {}\nschema_version: 1\nname: {}\naliases: []\nrole: 配角\ntags: []\navatar: \"\"\nattributes:\n  appearance: \"\"\n  background: \"\"\n  weapon: \"\"\nstate:\n  level: \"\"\n  health: \"\"\n  location: \"\"\nrelationships: []\n---\n\n<p></p>\n",
        character_id, character_name
    );

    let character_path = path.join("characters").join(filename);
    fs::write(character_path, template)
        .map_err(|e| format!("创建角色文件失败: {}", e))?;

    Ok(metadata)
}

// 加载角色内容
#[tauri::command]
fn load_character(project_path: String, character_id: String) -> Result<String, String> {
    let path = PathBuf::from(&project_path);
    let metadata_path = path.join("project.json");
    let json = fs::read_to_string(&metadata_path)
        .map_err(|e| format!("读取项目文件失败: {}", e))?;
    let metadata: ProjectMetadata = serde_json::from_str(&json)
        .map_err(|e| format!("解析项目文件失败: {}", e))?;

    let character = metadata
        .characters
        .iter()
        .find(|c| c.id == character_id)
        .ok_or_else(|| "找不到角色".to_string())?;

    let content = fs::read_to_string(path.join("characters").join(&character.filename))
        .map_err(|e| format!("加载角色失败: {}", e))?;

    Ok(content)
}

// 保存角色内容
#[tauri::command]
fn save_character(project_path: String, character_id: String, content: String) -> Result<(), String> {
    let path = PathBuf::from(&project_path);
    let metadata_path = path.join("project.json");
    let json = fs::read_to_string(&metadata_path)
        .map_err(|e| format!("读取项目文件失败: {}", e))?;
    let metadata: ProjectMetadata = serde_json::from_str(&json)
        .map_err(|e| format!("解析项目文件失败: {}", e))?;

    let character = metadata
        .characters
        .iter()
        .find(|c| c.id == character_id)
        .ok_or_else(|| "找不到角色".to_string())?;

    fs::write(path.join("characters").join(&character.filename), content)
        .map_err(|e| format!("保存角色失败: {}", e))?;

    Ok(())
}

// 重命名角色
#[tauri::command]
fn rename_character(
    project_path: String,
    character_id: String,
    new_name: String,
) -> Result<ProjectMetadata, String> {
    let path = PathBuf::from(&project_path);
    let metadata_path = path.join("project.json");
    let json = fs::read_to_string(&metadata_path)
        .map_err(|e| format!("读取项目文件失败: {}", e))?;
    let mut metadata: ProjectMetadata = serde_json::from_str(&json)
        .map_err(|e| format!("解析项目文件失败: {}", e))?;

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

    let updated_json = serde_json::to_string_pretty(&metadata)
        .map_err(|e| format!("序列化失败: {}", e))?;
    fs::write(metadata_path, updated_json)
        .map_err(|e| format!("写入元数据失败: {}", e))?;

    Ok(metadata)
}

// 删除角色
#[tauri::command]
fn delete_character(project_path: String, character_id: String) -> Result<ProjectMetadata, String> {
    let path = PathBuf::from(&project_path);
    let metadata_path = path.join("project.json");
    let json = fs::read_to_string(&metadata_path)
        .map_err(|e| format!("读取项目文件失败: {}", e))?;
    let mut metadata: ProjectMetadata = serde_json::from_str(&json)
        .map_err(|e| format!("解析项目文件失败: {}", e))?;

    let index = metadata
        .characters
        .iter()
        .position(|character| character.id == character_id)
        .ok_or_else(|| "找不到角色".to_string())?;

    let removed = metadata.characters.remove(index);
    let character_file = path.join("characters").join(removed.filename);
    if character_file.exists() {
        fs::remove_file(character_file).map_err(|e| format!("删除角色文件失败: {}", e))?;
    }

    let updated_json = serde_json::to_string_pretty(&metadata)
        .map_err(|e| format!("序列化失败: {}", e))?;
    fs::write(metadata_path, updated_json)
        .map_err(|e| format!("写入元数据失败: {}", e))?;

    Ok(metadata)
}

// 复制角色头像到项目目录
#[tauri::command]
fn copy_avatar_to_project(
    project_path: String,
    character_id: String,
    source_path: String,
) -> Result<String, String> {
    let project = PathBuf::from(&project_path);
    let source = PathBuf::from(&source_path);

    if !source.exists() {
        return Err("头像文件不存在".to_string());
    }
    if !source.is_file() {
        return Err("选择的头像不是文件".to_string());
    }

    let avatars_dir = project.join("assets").join("avatars");
    fs::create_dir_all(&avatars_dir)
        .map_err(|e| format!("创建头像目录失败: {}", e))?;

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
