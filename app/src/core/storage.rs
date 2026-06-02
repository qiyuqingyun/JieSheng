use std::fs::{self, File};
use std::io::Write;
use std::path::Path;

pub fn ensure_dir(path: &Path, label: &str) -> Result<(), String> {
    fs::create_dir_all(path).map_err(|e| format!("创建{}目录失败: {}", label, e))
}

pub fn read_text(path: &Path, label: &str) -> Result<String, String> {
    fs::read_to_string(path).map_err(|e| format!("读取{}失败: {}", label, e))
}

pub fn safe_write_text(path: &Path, content: &str, label: &str) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("创建{}目录失败: {}", label, e))?;
    }

    let tmp_path = path.with_extension(tmp_extension(path));
    let bak_path = path.with_extension(bak_extension(path));

    {
        let mut file =
            File::create(&tmp_path).map_err(|e| format!("写入{}临时文件失败: {}", label, e))?;
        file.write_all(content.as_bytes())
            .map_err(|e| format!("写入{}临时文件失败: {}", label, e))?;
        file.sync_all()
            .map_err(|e| format!("同步{}临时文件失败: {}", label, e))?;
    }

    if path.exists() {
        fs::copy(path, &bak_path).map_err(|e| format!("备份{}失败: {}", label, e))?;
        fs::remove_file(path).map_err(|e| format!("替换{}失败: {}", label, e))?;
    }

    fs::rename(&tmp_path, path).map_err(|e| {
        if bak_path.exists() && !path.exists() {
            let _ = fs::copy(&bak_path, path);
        }
        let _ = fs::remove_file(&tmp_path);
        format!("保存{}失败: {}", label, e)
    })?;

    if let Some(parent) = path.parent() {
        if let Ok(dir) = File::open(parent) {
            let _ = dir.sync_all();
        }
    }

    Ok(())
}

fn tmp_extension(path: &Path) -> String {
    let extension = path.extension().and_then(|ext| ext.to_str()).unwrap_or("");
    if extension.is_empty() {
        "tmp".to_string()
    } else {
        format!("{}.tmp", extension)
    }
}

fn bak_extension(path: &Path) -> String {
    let extension = path.extension().and_then(|ext| ext.to_str()).unwrap_or("");
    if extension.is_empty() {
        "bak".to_string()
    } else {
        format!("{}.bak", extension)
    }
}
