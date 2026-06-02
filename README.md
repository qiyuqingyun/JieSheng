# JieSheng

JieSheng 是一个面向中文网络文学作者的本地桌面写作工具。它把章节写作、大纲管理、角色设定放在同一个工作流里，默认使用本地文件存储，强调数据可控、可迁移和写作安全。

当前架构原则：

```text
Rust/Tauri = 本地项目核心
React/Tiptap = 编辑器界面
Python AI worker = 未来 AI/RAG 能力插件
```

项目数据的最终权威在 Rust。Python worker 只为后续 AI/RAG、LangChain、语义检索、长任务和流式输出预留，不直接写项目文件。

## 目录说明

```text
app/                Tauri 主应用和 Rust 本地项目核心
app/src/            Rust 命令和项目文件读写逻辑
app/capabilities/   Tauri 2 权限配置
app/icons/          应用图标

frontend/           React + TypeScript + Tiptap 前端
frontend/src/       前端源码
frontend/dist/      Vite 构建产物，自动生成，不提交

ai-worker/          Python AI/RAG worker 源码
ai-worker/src/      Python 包 jiesheng_ai_worker
ai-worker/.venv/    uv 创建的虚拟环境，自动生成，不提交

scripts/            构建辅助脚本
scripts/build-all.ps1          串联 AI worker 资源准备和前端构建
scripts/build-frontend.ps1     构建前端静态文件
scripts/prepare-ai-worker.ps1  用 uv 准备 Python runtime 和 AI worker 资源

target/             Cargo/Tauri 构建输出和生成资源，不提交
target/ai-worker-resources/    Python runtime 与 ai_worker 打包资源

Cargo.toml          Rust workspace 配置
Cargo.lock          Rust 依赖锁文件
LICENSE             开源许可证
README.md           项目说明
```

## 环境准备

请先按 Tauri 官方文档安装 Windows 开发环境，包括：

- Rust 和 Cargo
- Node.js
- WebView2
- Visual Studio C++ Build Tools
- Tauri CLI 需要的系统依赖

官方文档：

[Tauri prerequisites](https://tauri.app/start/prerequisites/)

本项目还需要：

- Yarn 1.x
- uv，用于管理 Python AI worker 环境

确认工具可用：

```powershell
rustc --version
cargo --version
node --version
yarn --version
uv --version
```

## 安装依赖

首次进入项目后安装前端依赖：

```powershell
cd D:\jieshenaiwriting\JieSheng\frontend
yarn install --frozen-lockfile
```

AI worker 的 Python 环境由构建脚本自动创建。也可以手动准备：

```powershell
cd D:\jieshenaiwriting\JieSheng
powershell -ExecutionPolicy Bypass -File scripts\prepare-ai-worker.ps1
```

该脚本会使用 uv 创建：

```text
ai-worker/.venv/
.uv-python/
.uv-cache/
target/ai-worker-resources/
```

这些都是生成物，不需要提交。

## 开发运行

从 Tauri 主应用目录启动：

```powershell
cd D:\jieshenaiwriting\JieSheng\app
..\frontend\node_modules\.bin\tauri.cmd dev
```

开发模式会启动 Vite dev server，Tauri 窗口加载前端页面。

## 构建 Release Exe

只构建 release exe，不生成安装包：

```powershell
cd D:\jieshenaiwriting\JieSheng\app
..\frontend\node_modules\.bin\tauri.cmd build --no-bundle
```

输出位置：

```text
target/release/jiesheng-sidecar.exe
```

## 构建安装包

当前只分发 NSIS 安装包，不构建 MSI：

```powershell
cd D:\jieshenaiwriting\JieSheng\app
..\frontend\node_modules\.bin\tauri.cmd build
```

输出位置：

```text
target/release/bundle/nsis/
```

## 基础使用

1. 启动应用。
2. 点击“新建项目”，输入作品名并选择保存目录。
3. 或点击“打开项目”，选择已有 JieSheng 项目目录。
4. 在左侧切换章节、大纲、角色。
5. 新建章节或大纲后，在编辑区写作。
6. 角色卡支持基础信息、状态、关系、小传和头像。

常用快捷键：

```text
Ctrl+S      保存当前内容
Ctrl+F      打开搜索
Ctrl+Z      撤销
Ctrl+Y      重做
Ctrl+\      切换专注模式
F11         切换专注模式
```

## 数据存储

JieSheng 项目以文件夹形式存在：

```text
project.json
chapters/
outlines/
characters/
assets/
```

章节和大纲使用独立 Markdown 文件。角色卡使用 Markdown 文件，并带有结构化 frontmatter。

## 开发原则

- Rust 负责本地项目数据、文件读写、路径校验和最终保存。
- 前端只负责 UI、编辑器交互和调用 Tauri command。
- Python AI worker 只负责未来 AI/RAG 能力，不直接写项目文件。
- `target/`、`frontend/dist/`、`ai-worker/.venv/`、`.uv-python/` 都是生成物。

## 未来规划

请参阅 [MVP_FEATURES.md](MVP_FEATURES.md) 查看详细的产品特性规划和迭代目标。


