# Writer's IDE - MVP 功能清单

## ✅ 当前已实现功能

### 1. 项目管理
- 新建项目（先输入作品名，再选择目录）
- 打开项目（含旧项目结构兼容）
- 项目基础结构自动初始化：

```text
我的小说/
├── project.json
├── chapters/
├── outlines/
├── characters/
└── assets/
    └── avatars/
```

### 2. 章节与大纲
- 章节：新建、切换、编辑、保存
- 大纲：新建、切换、编辑、保存
- 左侧面板可在章节/大纲间切换
- 中间编辑区按当前对象切换对应编辑器

### 3. 角色卡（MVP）
- 角色库：新建、列表、搜索、按角色定位筛选
- 角色编辑：
   - 基础信息卡（定位、别名、标签）
   - 静态属性卡（外貌、背景、武器）
   - 动态状态卡（境界/健康/地点）
   - 关系卡（按角色名搜索选择，底层绑定 targetId）
   - 小传与设定笔记（富文本）
- 角色重命名/删除
- 角色内容写入 `characters/*.md`（YAML Frontmatter + 富文本正文）

### 4. 头像处理
- 点击角色头像直接选择本地图片
- 选择后自动复制到项目目录：`assets/avatars/`
- 角色卡中保存项目内头像路径

### 5. 编辑器与保存
- 通用 `DocumentEditor`（章节/大纲/角色复用）
- 支持撤销/重做、字数/词数、打字速度（字/分）
- 自动保存策略统一：
   - 每 3 秒轮询保存未保存内容
   - 窗口失焦立即保存
- 顶部显示未保存状态
- `Ctrl+S` 保存当前编辑对象（章节/大纲/角色）

### 6. 快捷键
- 支持动作：`save`、`search`、`undo`、`redo`、`focusMode`
- 支持快捷键设置与恢复默认
- 专注模式：`Ctrl+\` 或 `F11`

### 7. 其他体验
- 专注模式下隐藏非核心区域，仅保留写作主区域
- 崩溃恢复（章节草稿）
- 搜索面板
- 新建项目/章节/大纲/角色统一使用应用内弹窗

## 🧪 启动与构建

### 开发

```bash
cd tauri-app
yarn tauri dev
```

### 打包

```bash
yarn tauri build
```

生成产物位置：
- `src-tauri/target/release/bundle/nsis/*.exe`
- `src-tauri/target/release/bundle/msi/*.msi`

## 📝 关键数据结构

### ProjectMetadata

```json
{
   "name": "我的小说",
   "chapters": [],
   "outlines": [],
   "characters": []
}
```

### 角色卡文件（示意）

```yaml
---
id: character_123
schema_version: 1
name: 林萧
aliases: ["林老大"]
role: "主角"
tags: ["剑修", "护短"]
avatar: "D:\\...\\assets\\avatars\\character_123_avatar.png"
attributes:
   appearance: ""
   background: ""
   weapon: ""
state:
   level: ""
   health: ""
   location: ""
relationships:
   - target: character_456
      relation: "宿敌"
custom_fields:
   基础_阵营: "正道"
---

<p>角色小传...</p>
```

## 🔧 后端命令（当前）
- `new_project`
- `open_project`
- `create_chapter` / `load_chapter` / `save_chapter`
- `create_outline` / `load_outline` / `save_outline`
- `create_character` / `load_character` / `save_character`
- `rename_character` / `delete_character`
- `copy_avatar_to_project`
- `update_metadata`

## 🎯 下一步（已规划）
1. 正文 `@角色` 提及节点（底层绑定 characterId）
2. 点击提及弹角色速览卡
3. 右侧 Pin 多张角色卡
4. 角色引用冲突检测与删除风险提示
5. 导出“纯净正文”（移除辅助标记）
