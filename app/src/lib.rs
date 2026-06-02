mod commands;
mod core;
mod services;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::project_commands::new_project,
            commands::project_commands::open_project,
            commands::project_commands::update_metadata,
            commands::chapter_commands::save_chapter,
            commands::chapter_commands::load_chapter,
            commands::chapter_commands::create_chapter,
            commands::outline_commands::create_outline,
            commands::outline_commands::load_outline,
            commands::outline_commands::save_outline,
            commands::character_commands::create_character,
            commands::character_commands::load_character,
            commands::character_commands::save_character,
            commands::character_commands::rename_character,
            commands::character_commands::delete_character,
            commands::character_commands::copy_avatar_to_project,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
