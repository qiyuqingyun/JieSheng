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
├── MVP_FEATURES.md       # 详细功能文档
└── package.json
```

## ✨ 核心功能

- **项目管理**：新建/打开项目，自动初始化 `chapters/outlines/characters/assets`
- **章节 + 大纲**：独立列表、独立文件、统一编辑体验
- **角色卡系统**：角色库、卡片化编辑、关系绑定、头像本地化存储
- **富文本编辑**：章节/大纲/角色小传共用编辑器（撤销/重做、统计、打字速度）
- **自动保存**：3 秒定时 + 窗口失焦（章节/大纲/角色一致）
- **快捷键**：保存/搜索/撤销/重做/专注模式，支持设置
- **专注模式**：聚焦写作主区域
- **安装包构建**：可生成 `.exe` (NSIS) 与 `.msi`

## 📦 构建安装包

```bash
cd tauri-app
yarn tauri build
```

产物目录：
- `tauri-app/src-tauri/target/release/bundle/nsis/`
- `tauri-app/src-tauri/target/release/bundle/msi/`

## 🛠️ 技术栈

- **前端**：React 19 + TypeScript 5 + Tailwind CSS 4
- **编辑器**：Tiptap 3
- **后端**：Tauri 2 + Rust
- **构建**：Vite 7

详见 [MVP_FEATURES.md](MVP_FEATURES.md)
