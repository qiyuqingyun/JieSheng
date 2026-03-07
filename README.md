# Writer's IDE

一个专为网络文学作者设计的现代化写作 IDE，采用 Tauri + React + TypeScript 构建。

## 🚀 快速开始

```bash
cd tauri-app
yarn tauri dev
```

## 📚 项目结构

```
tauri-app/
├── src/                    # React 前端代码
│   ├── components/        # UI 组件
│   ├── contexts/          # 状态管理
│   └── App.tsx           # 主应用
├── src-tauri/            # Rust 后端
│   ├── src/
│   │   ├── lib.rs        # 文件操作命令
│   │   └── main.rs       # 应用入口
│   └── Cargo.toml        # Rust 依赖
└── MVP_FEATURES.md       # 功能文档
```

## ✨ 核心功能

- **项目管理**：新建/打开写作项目
- **章节管理**：创建、编辑、保存章节
- **富文本编辑**：Tiptap 编辑器，支持格式化、撤销/重做
- **自动保存**：3秒定时 + 窗口失焦自动保存
- **快捷键**：Ctrl+S（保存）、Ctrl+B/I/U（格式化）、Ctrl+Z/Y（撤销/重做）
- **专注模式**：Ctrl+\ 或 F11 隐藏所有 UI
- **崩溃恢复**：localStorage 自动保存草稿

## 🛠️ 技术栈

- **前端**：React 19 + TypeScript 5 + Tailwind CSS 4
- **编辑器**：Tiptap 3
- **后端**：Tauri 2 + Rust
- **构建**：Vite 7

详见 [MVP_FEATURES.md](MVP_FEATURES.md)
