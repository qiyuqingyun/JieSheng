import { useState, useEffect } from "react";
import RichEditor from "./components/RichEditor";
import SearchPanel from "./components/SearchPanel";
import KeySettingsPanel from "./components/KeySettingsPanel";
import OutlinePanel from "./components/OutlinePanel";
import OutlineEditor from "./components/OutlineEditor";
import CreateItemDialog from "./components/CreateItemDialog";
import { useProject } from "./contexts/ProjectContext";
import { useKeyBindings } from "./contexts/KeyBindingsContext";
import "./App.css";

function App() {
  const {
    projectMetadata,
    currentChapterId,
    currentOutlineId,
    hasUnsavedChanges,
    newProject,
    openProject,
    closeProject,
    createChapter,
    loadChapter,
    saveCurrentChapter,
    saveCurrentOutline,
    createOutline,
    isProjectOpen,
  } = useProject();

  const { getBinding } = useKeyBindings();

  const [leftPanel, setLeftPanel] = useState<'chapters' | 'outline'>('chapters'); // 左侧面板：章节列表/大纲
  const [showAI, setShowAI] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [showKeySettings, setShowKeySettings] = useState(false);
  const [showCreateProjectDialog, setShowCreateProjectDialog] = useState(false);
  const [showCreateChapterDialog, setShowCreateChapterDialog] = useState(false);
  const [showCreateOutlineDialog, setShowCreateOutlineDialog] = useState(false);

  // 处理新建章节
  const handleCreateChapter = () => {
    setShowCreateChapterDialog(true);
  };

  // 处理新建大纲
  const handleCreateOutline = () => {
    setShowCreateOutlineDialog(true);
  };

  // 处理保存（Ctrl+S）
  const handleSave = () => {
    if (hasUnsavedChanges) {
      if (leftPanel === "outline" && currentOutlineId) {
        saveCurrentOutline();
      } else if (currentChapterId) {
        saveCurrentChapter();
      }
    }
  };

  // 切换专注模式
  const toggleFocusMode = () => {
    setFocusMode(!focusMode);
  };

  // 判断按键是否匹配快捷键配置
  const matchesKeyBinding = (e: KeyboardEvent, action: string): boolean => {
    const binding = getBinding(action);
    if (!binding) return false;

    const keys = binding.toLowerCase().split('+');
    
    // 检查修饰键
    const hasCtrl = keys.includes('ctrl');
    const hasAlt = keys.includes('alt');
    const hasShift = keys.includes('shift');
    
    if ((e.ctrlKey || e.metaKey) !== hasCtrl) return false;
    if (e.altKey !== hasAlt) return false;
    if (e.shiftKey !== hasShift) return false;

    // 检查主键
    const mainKey = keys.filter(k => !['ctrl', 'alt', 'shift'].includes(k))[0];
    if (!mainKey) return false;

    const pressedKey = e.key === '\\' ? '\\' : e.key.toLowerCase();
    return pressedKey === mainKey;
  };

  // 全局键盘监听（使用 useEffect，不依赖于 DOM 焦点）
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 搜索快捷键
      if (matchesKeyBinding(e, 'search') && isProjectOpen()) {
        e.preventDefault();
        setShowSearchPanel(true);
        return;
      }

      // 保存快捷键
      if (matchesKeyBinding(e, 'save')) {
        e.preventDefault();
        handleSave();
        return;
      }

      // 专注模式快捷键
      if (matchesKeyBinding(e, 'focusMode')) {
        e.preventDefault();
        toggleFocusMode();
        return;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [hasUnsavedChanges, focusMode, isProjectOpen]);

  return (
    <div className="flex h-screen flex-col bg-white">
      {/* 顶部工具栏 - 专注模式下隐藏 */}
      {!focusMode && (
        <header className="border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-gray-900">📖 Writer's IDE</h1>
              {projectMetadata && (
                <>
                  <span className="text-gray-400">|</span>
                  <span className="text-sm text-gray-600">{projectMetadata.name}</span>
                  {hasUnsavedChanges && (
                    <span className="text-xs text-orange-500">● 未保存</span>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!isProjectOpen() ? (
                <>
                  <button
                    onClick={() => setShowCreateProjectDialog(true)}
                    className="px-3 py-1 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded"
                  >
                    新建项目
                  </button>
                  <button
                    onClick={openProject}
                    className="px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded border border-gray-300"
                  >
                    打开项目
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={closeProject}
                    className="px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded border border-gray-300"
                    title="关闭项目并返回主界面"
                  >
                    ← 返回
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!hasUnsavedChanges}
                    className="px-3 py-1 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    保存 (Ctrl+S)
                  </button>
                  <button
                    onClick={() => setLeftPanel('chapters')}
                    className={`px-3 py-1 text-sm font-medium rounded ${
                      leftPanel === 'chapters'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    📑 章节
                  </button>
                  <button
                    onClick={() => setLeftPanel('outline')}
                    className={`px-3 py-1 text-sm font-medium rounded ${
                      leftPanel === 'outline'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    📋 大纲
                  </button>
                  <button
                    onClick={() => setShowAI(!showAI)}
                    className="px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded"
                  >
                    {showAI ? "🤖 AI" : "显示AI"}
                  </button>
                  <button
                    onClick={toggleFocusMode}
                    className="px-3 py-1 text-sm font-medium text-purple-700 hover:bg-purple-100 rounded border border-purple-300"
                    title="专注模式 (Ctrl+\ 或 F11)"
                  >
                    🎯 专注
                  </button>
                  <button
                    onClick={() => setShowSearchPanel(true)}
                    className="px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded"
                    title={`搜索 (${getBinding('search')})`}
                  >
                    🔍 搜索
                  </button>
                  <button
                    onClick={() => setShowKeySettings(true)}
                    className="px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded"
                    title="快捷键设置"
                  >
                    ⚙️ 快捷键
                  </button>
                </>
              )}
            </div>
          </div>
        </header>
      )}

      {/* 专注模式按镰 - 可点击退出 */}
      {focusMode && (
        <button
          onClick={toggleFocusMode}
          className="fixed bottom-4 right-4 z-50 text-xs text-gray-100 bg-black bg-opacity-75 px-3 py-2 rounded-full shadow-lg hover:bg-opacity-90 transition-all cursor-pointer"
          title="点击退出专注模式"
        >
          退出专注模式
        </button>
      )}

      {/* 主编辑区 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧面板 - 专注模式下隐藏 */}
        {!focusMode && isProjectOpen() && (
          <aside className="w-64 border-r border-gray-200 bg-gray-50 flex flex-col">
            {leftPanel === 'chapters' ? (
              // 章节列表
              <>
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                  <h2 className="text-sm font-semibold text-gray-900">章节列表</h2>
                  <button
                    onClick={handleCreateChapter}
                    className="px-2 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded"
                    title="新建章节"
                  >
                    + 新建
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-1">
                  {projectMetadata?.chapters.map((chapter) => (
                    <div
                      key={chapter.id}
                      onClick={() => loadChapter(chapter.id)}
                      className={`p-2 rounded cursor-pointer text-sm ${
                        currentChapterId === chapter.id
                          ? "bg-blue-100 text-blue-900 font-medium"
                          : "text-gray-700 hover:bg-white"
                      }`}
                    >
                      {chapter.title}
                    </div>
                  ))}
                  {(!projectMetadata?.chapters || projectMetadata.chapters.length === 0) && (
                    <div className="p-2 text-sm text-gray-400 text-center">
                      暂无章节，点击"新建"创建
                    </div>
                  )}
                </div>
              </>
            ) : (
              // 大纲面板
              <>
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                  <h2 className="text-sm font-semibold text-gray-900">大纲列表</h2>
                  <button
                    onClick={handleCreateOutline}
                    className="px-2 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded"
                    title="新建大纲"
                  >
                    + 新建
                  </button>
                </div>
                <OutlinePanel />
              </>
            )}
          </aside>
        )}

        {/* 中间编辑器 */}
        <main className="flex-1 flex flex-col overflow-hidden bg-white">
          {isProjectOpen() ? (
            leftPanel === 'outline' && currentOutlineId ? (
              // 大纲编辑模式
              <OutlineEditor />
            ) : currentChapterId ? (
              // 章节编辑模式
              <RichEditor />
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <p className="text-lg mb-2">📝</p>
                  <p>请从左侧选择或创建章节/大纲开始写作</p>
                </div>
              </div>
            )
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <p className="text-2xl mb-4">📖</p>
                <p className="text-lg mb-2">欢迎使用 Writer's IDE</p>
                <p className="text-sm">请点击顶部按钮新建或打开项目</p>
              </div>
            </div>
          )}
        </main>

        {/* 右侧AI助手面板 - 专注模式下隐藏 */}
        {!focusMode && showAI && isProjectOpen() && (
          <aside className="w-80 border-l border-gray-200 bg-gray-50 flex flex-col">
            <div className="border-b border-gray-200 p-4">
              <h2 className="text-sm font-semibold text-gray-900">🤖 AI助手</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="rounded bg-white p-3 text-sm text-gray-600 border border-gray-200">
                <strong>系统提示：</strong> 等待输入...
              </div>
            </div>
            <div className="border-t border-gray-200 p-3">
              <textarea
                placeholder="向AI提问或请求帮助..."
                className="w-full rounded border border-gray-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              ></textarea>
              <button className="mt-2 w-full rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
                发送（Ctrl+Enter）
              </button>
            </div>
          </aside>
        )}

      {/* 搜索面板 */}
      {showSearchPanel && (
        <SearchPanel onClose={() => setShowSearchPanel(false)} />
      )}

      <CreateItemDialog
        open={showCreateProjectDialog}
        title="新建项目"
        label="作品名称"
        placeholder="例如：我的长篇小说"
        confirmText="下一步：选择位置"
        onClose={() => setShowCreateProjectDialog(false)}
        onConfirm={(projectName) => newProject(projectName)}
      />

      <CreateItemDialog
        open={showCreateChapterDialog}
        title="新建章节"
        label="章节标题"
        placeholder="例如：第一章 雨夜来信"
        confirmText="创建章节"
        onClose={() => setShowCreateChapterDialog(false)}
        onConfirm={(title) => createChapter(title)}
      />

      <CreateItemDialog
        open={showCreateOutlineDialog}
        title="新建大纲"
        label="大纲标题"
        placeholder="例如：世界观总纲"
        confirmText="创建大纲"
        onClose={() => setShowCreateOutlineDialog(false)}
        onConfirm={(title) => createOutline(title)}
      />

      {/* 快捷键设置面板 */}
      {showKeySettings && (
        <KeySettingsPanel onClose={() => setShowKeySettings(false)} />
      )}
      </div>
    </div>
  );
}

export default App;
