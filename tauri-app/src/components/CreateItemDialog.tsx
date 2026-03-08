import { useEffect, useRef, useState } from "react";

interface CreateItemDialogProps {
  open: boolean;
  title: string;
  label: string;
  placeholder: string;
  confirmText: string;
  onClose: () => void;
  onConfirm: (value: string) => void;
}

export default function CreateItemDialog({
  open,
  title,
  label,
  placeholder,
  confirmText,
  onClose,
  onConfirm,
}: CreateItemDialogProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue("");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
      if (e.key === "Enter") {
        const trimmed = value.trim();
        if (trimmed) {
          onConfirm(trimmed);
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, onConfirm, value]);

  if (!open) return null;

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/45 backdrop-blur-[1px]">
      <div className="w-105 max-w-[92vw] rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        </div>

        <div className="space-y-2 px-5 py-4">
          <label className="block text-sm font-medium text-slate-700">{label}</label>
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            取消
          </button>
          <button
            onClick={submit}
            disabled={!value.trim()}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}