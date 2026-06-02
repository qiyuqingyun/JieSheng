import { useEditor, EditorContent } from "@tiptap/react";
import { useEffect, useState } from "react";
import StarterKit from "@tiptap/starter-kit";
import GapCursor from "@tiptap/extension-gapcursor";
import Underline from "@tiptap/extension-underline";
import CharacterCount from "@tiptap/extension-character-count";
import { useKeyBindings } from "../contexts/KeyBindingsContext";

interface DocumentEditorProps {
  content: string;
  onContentChange: (content: string) => void;
}

export default function DocumentEditor({
  content,
  onContentChange,
}: DocumentEditorProps) {
  const { getBinding } = useKeyBindings();
  const [editStartTime, setEditStartTime] = useState<number | null>(null);
  const [initialCharCount, setInitialCharCount] = useState(0);
  const [typingSpeed, setTypingSpeed] = useState(0);

  const matchesKeyBinding = (e: KeyboardEvent, action: string): boolean => {
    const binding = getBinding(action);
    if (!binding) return false;

    const keys = binding.toLowerCase().split("+");
    const hasCtrl = keys.includes("ctrl");
    const hasAlt = keys.includes("alt");
    const hasShift = keys.includes("shift");

    if ((e.ctrlKey || e.metaKey) !== hasCtrl) return false;
    if (e.altKey !== hasAlt) return false;
    if (e.shiftKey !== hasShift) return false;

    const mainKey = keys.filter((k) => !["ctrl", "alt", "shift"].includes(k))[0];
    if (!mainKey) return false;

    const pressedKey = e.key === "\\" ? "\\" : e.key.toLowerCase();
    return pressedKey === mainKey;
  };

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
    content: content || "<p>开始写作...</p>",
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onContentChange(html);

      if (editStartTime === null) {
        setEditStartTime(Date.now());
        setInitialCharCount(editor.storage.characterCount.characters());
      }

      if (editStartTime !== null) {
        const elapsedMinutes = (Date.now() - editStartTime) / 1000 / 60;
        const currentCharCount = editor.storage.characterCount.characters();
        const newCharCount = Math.max(0, currentCharCount - initialCharCount);
        const speed = elapsedMinutes > 0 ? Math.round(newCharCount / elapsedMinutes) : 0;
        setTypingSpeed(speed);
      }
    },
    editorProps: {
      // 纯文本编辑器，不拦截格式化快捷键
      handleKeyDown: (_view, event) => {
        if (matchesKeyBinding(event, "undo")) {
          event.preventDefault();
          editor?.chain().focus().undo().run();
          return true;
        }

        if (matchesKeyBinding(event, "redo")) {
          event.preventDefault();
          editor?.chain().focus().redo().run();
          return true;
        }

        return false;
      },
    },
  });

  useEffect(() => {
    if (editor && content !== null) {
      const currentContent = editor.getHTML();
      if (currentContent !== content) {
        editor.commands.setContent(content);
        setEditStartTime(null);
        setInitialCharCount(0);
        setTypingSpeed(0);
      }
    }
  }, [content, editor]);

  if (!editor) {
    return <div>加载编辑器...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-2 flex items-center justify-between">
        <div className="text-xs text-gray-600 flex items-center gap-4">
          <span>字数: {editor.storage.characterCount.characters()}</span>
          <span>词数: {editor.storage.characterCount.words()}</span>
          {editStartTime && typingSpeed > 0 && (
            <span className="text-blue-600 font-medium">⚡ {typingSpeed} 字/分</span>
          )}
        </div>
        <div className="flex items-center gap-2">
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
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-3xl">
          <EditorContent
            editor={editor}
            className="prose prose-sm max-w-none focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}