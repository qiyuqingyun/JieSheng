use std::path::{Component, Path, PathBuf};

pub struct ProjectPaths {
    root: PathBuf,
}

impl ProjectPaths {
    pub fn new(project_path: &str) -> Self {
        Self {
            root: PathBuf::from(project_path),
        }
    }

    pub fn root(&self) -> &Path {
        &self.root
    }

    pub fn metadata(&self) -> PathBuf {
        self.root.join("project.json")
    }

    pub fn chapters_dir(&self) -> PathBuf {
        self.root.join("chapters")
    }

    pub fn outlines_dir(&self) -> PathBuf {
        self.root.join("outlines")
    }

    pub fn characters_dir(&self) -> PathBuf {
        self.root.join("characters")
    }

    pub fn avatars_dir(&self) -> PathBuf {
        self.root.join("assets").join("avatars")
    }

    pub fn chapter_file(&self, chapter_id: &str) -> Result<PathBuf, String> {
        validate_id(chapter_id, "章节 ID")?;
        Ok(self.chapters_dir().join(format!("{}.md", chapter_id)))
    }

    pub fn outline_file(&self, outline_id: &str) -> Result<PathBuf, String> {
        validate_id(outline_id, "大纲 ID")?;
        Ok(self.outlines_dir().join(format!("{}.md", outline_id)))
    }

    pub fn character_file(&self, filename: &str) -> Result<PathBuf, String> {
        validate_project_filename(filename, "角色文件名")?;
        Ok(self.characters_dir().join(filename))
    }

    pub fn avatar_file(&self, character_id: &str, extension: &str) -> Result<PathBuf, String> {
        validate_id(character_id, "角色 ID")?;
        validate_extension(extension)?;
        Ok(self
            .avatars_dir()
            .join(format!("{}_avatar.{}", character_id, extension)))
    }
}

pub fn validate_id(value: &str, label: &str) -> Result<(), String> {
    if value.trim().is_empty() {
        return Err(format!("{}不能为空", label));
    }

    if value.contains(['/', '\\', ':', '\0']) || value == "." || value == ".." {
        return Err(format!("{}包含非法路径字符", label));
    }

    if Path::new(value)
        .components()
        .any(|component| !matches!(component, Component::Normal(_)))
    {
        return Err(format!("{}不能包含路径片段", label));
    }

    Ok(())
}

pub fn validate_project_filename(value: &str, label: &str) -> Result<(), String> {
    if value.trim().is_empty() {
        return Err(format!("{}不能为空", label));
    }

    if value.contains(['/', '\\', ':', '\0']) || value == "." || value == ".." {
        return Err(format!("{}包含非法路径字符", label));
    }

    let path = Path::new(value);
    if path
        .components()
        .any(|component| !matches!(component, Component::Normal(_)))
    {
        return Err(format!("{}不能包含路径片段", label));
    }

    if path.extension().and_then(|ext| ext.to_str()) != Some("md") {
        return Err(format!("{}必须是 .md 文件", label));
    }

    Ok(())
}

fn validate_extension(value: &str) -> Result<(), String> {
    let extension = value.to_ascii_lowercase();
    let allowed = ["png", "jpg", "jpeg", "webp", "gif"];
    if allowed.contains(&extension.as_str()) {
        Ok(())
    } else {
        Err("头像只支持 png、jpg、jpeg、webp、gif".to_string())
    }
}
