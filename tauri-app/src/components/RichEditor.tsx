import { useEditor, EditorContent } from "@tiptap/react";
import { useEffect, useState } from "react";
import StarterKit from "@tiptap/starter-kit";
import GapCursor from "@tiptap/extension-gapcursor";
import Underline from "@tiptap/extension-underline";
import CharacterCount from "@tiptap/extension-character-count";
import { useProject } from "../contexts/ProjectContext";

export default function RichEditor() {
  const { currentChapterContent, updateChapterContent } = useProject();
  const [editStartTime, setEditStartTime] = useState<number | null>(null);
  const [initialWordCount, setInitialWordCount] = useState(0);
  const [typingSpeed, setTypingSpeed] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        paragraph: {
          HTMLAttributes: {
            class: "mb-3 leading-7",
          },
        },
        heading: {
          levels: [1, 2, 3],
          HTMLAttributes: {
            class: "font-bold mt-6 mb-3",
          },
        },
        codeBlock: {
          HTMLAttributes: {
            class: "bg-gray-100 p-3 rounded text-sm font-mono",
          },
        },
        bulletList: {
          HTMLAttributes: {
            class: "list-disc list-inside mb-3",
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: "list-decimal list-inside mb-3",
          },
        },
      }),
      GapCursor,
      Underline,
      CharacterCount,
    ],
    content: currentChapterContent || '<p>开始写作...</p>',
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      // 当编辑器内容变化时，更新 context
      const html = editor.getHTML();
      updateChapterContent(html);

      // 记录编辑开始时间（仅在第一次编辑时）
      if (editStartTime === null) {
        setEditStartTime(Date.now());
        setInitialWordCount(editor.storage.characterCount.words());
      }

      // 计算打字速度（基于新增字数）
      if (editStartTime !== null) {
        const elapsedMinutes = (Date.now() - editStartTime) / 1000 / 60;
        const currentWordCount = editor.storage.characterCount.words();
        const newWordCount = Math.max(0, currentWordCount - initialWordCount);
        const speed = elapsedMinutes > 0 ? Math.round(newWordCount / elapsedMinutes) : 0;
        setTypingSpeed(speed);
      }
    },
    editorProps: {
      handleKeyDown: (_view, event) => {
        // 处理格式化快捷键（不阻止 Ctrl+S，让它冒泡到 App）
        if (event.ctrlKey || event.metaKey) {
          switch (event.key.toLowerCase()) {
            case 'b':
              event.preventDefault();
              editor?.chain().focus().toggleBold().run();
              return true;
            case 'i':
              event.preventDefault();
              editor?.chain().focus().toggleItalic().run();
              return true;
            case 'u':
              event.preventDefault();
              editor?.chain().focus().toggleUnderline().run();
              return true;
            // Ctrl+Z 和 Ctrl+Y 由 StarterKit 的 History 插件处理，无需额外处理
          }
        }
        return false;
      },
    },
  });

  // 监听章节切换，更新编辑器内容和重置计时
  useEffect(() => {
    if (editor && currentChapterContent !== null) {
      const currentContent = editor.getHTML();
      if (currentContent !== currentChapterContent) {
        editor.commands.setContent(currentChapterContent);
        // 切换章节时重置编辑时间和打字速度
        setEditStartTime(null);
        setInitialWordCount(0);
        setTypingSpeed(0);
      }
    }
  }, [currentChapterContent, editor]);

  if (!editor) {
    return <div>加载编辑器...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* 编辑器工具栏 */}
      <div className="border-b border-gray-200 bg-gray-50 p-3 flex gap-1 flex-wrap">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="粗体 (Ctrl+B)"
          className={`px-2 py-1 rounded text-sm font-medium ${
            editor.isActive("bold")
              ? "bg-blue-500 text-white"
              : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
          }`}
        >
          B
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="斜体 (Ctrl+I)"
          className={`px-2 py-1 rounded text-sm font-medium italic ${
            editor.isActive("italic")
              ? "bg-blue-500 text-white"
              : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
          }`}
        >
          I
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="下划线 (Ctrl+U)"
          className={`px-2 py-1 rounded text-sm font-medium underline ${
            editor.isActive("underline")
              ? "bg-blue-500 text-white"
              : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
          }`}
        >
          U
        </button>

        <div className="w-px bg-gray-300 mx-1" />

        <button
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          className={`px-2 py-1 rounded text-sm font-bold ${
            editor.isActive("heading", { level: 1 })
              ? "bg-blue-500 text-white"
              : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
          }`}
        >
          H1
        </button>
        <button
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          className={`px-2 py-1 rounded text-sm font-bold ${
            editor.isActive("heading", { level: 2 })
              ? "bg-blue-500 text-white"
              : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
          }`}
        >
          H2
        </button>

        <div className="w-px bg-gray-300 mx-1" />

        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-2 py-1 rounded text-sm ${
            editor.isActive("bulletList")
              ? "bg-blue-500 text-white"
              : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
          }`}
        >
          • List
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-2 py-1 rounded text-sm ${
            editor.isActive("orderedList")
              ? "bg-blue-500 text-white"
              : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
          }`}
        >
          1. List
        </button>

        <div className="w-px bg-gray-300 mx-1" />

        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`px-2 py-1 rounded text-sm font-mono ${
            editor.isActive("codeBlock")
              ? "bg-blue-500 text-white"
              : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
          }`}
        >
          {'<>'}
        </button>

        <div className="w-px bg-gray-300 mx-1" />

        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="撤销 (Ctrl+Z)"
          className="px-2 py-1 rounded text-sm bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ↶ 撤销
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="重做 (Ctrl+Y)"
          className="px-2 py-1 rounded text-sm bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ↷ 重做
        </button>
      </div>

      {/* 编辑器内容区 */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-3xl">
          <EditorContent
            editor={editor}
            className="prose prose-sm max-w-none focus:outline-none"
          />
        </div>
      </div>

      {/* 底部字数统计和打字速度 */}
      <div className="border-t border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-600 flex items-center justify-between">
        <div>
          字数: {editor.storage.characterCount.characters()} | 词数: {editor.storage.characterCount.words()}
        </div>
        {editStartTime && typingSpeed > 0 && (
          <div className="text-blue-600 font-medium">
            ⚡ 打字速度: {typingSpeed} 词/分
          </div>
        )}
      </div>
    </div>
  );
}
