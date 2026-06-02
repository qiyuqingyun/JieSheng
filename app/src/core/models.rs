use serde::{Deserialize, Serialize};

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

pub fn character_slug(name: &str) -> String {
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
