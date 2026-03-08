import React, { useState } from 'react';
import { confirm } from '@tauri-apps/plugin-dialog';
import { useKeyBindings } from '../contexts/KeyBindingsContext';

interface KeySettingsPanelProps {
  onClose: () => void;
}

export default function KeySettingsPanel({ onClose }: KeySettingsPanelProps) {
  const { bindings, updateBinding, resetToDefaults } = useKeyBindings();
  const [editingAction, setEditingAction] = useState<string | null>(null);

  const handleKeyDown = (e: React.KeyboardEvent, action: string) => {
    e.preventDefault();
    
    // 构建快捷键字符串
    const keys: string[] = [];
    if (e.ctrlKey) keys.push('ctrl');
    if (e.altKey) keys.push('alt');
    if (e.shiftKey) keys.push('shift');
    
    // 获取实际按下的键
    let keyName = e.key.toLowerCase();
    if (keyName === '\\') {
      keyName = '\\';
    } else if (keyName === 'enter') {
      keyName = 'enter';
    } else if (keyName >= 'a' && keyName <= 'z') {
      // 字母键保持小写
    } else if (keyName >= '0' && keyName <= '9') {
      // 数字键
    } else if (e.code.startsWith('Key')) {
      keyName = e.code.substring(3).toLowerCase();
    }
    
    if (keyName && !['Control', 'Alt', 'Shift'].includes(e.key)) {
      keys.push(keyName);
    }

    const keyCombination = keys.join('+');
    if (keyCombination) {
      updateBinding(action, keyCombination);
      setEditingAction(null);
    }
  };

  const handleReset = async () => {
    const confirmed = await confirm('所有自定义快捷键将被重置为默认值', {
      title: '恢复默认设置',
      kind: 'warning',
      okLabel: '确定',
      cancelLabel: '取消'
    });
    
    if (confirmed) {
      resetToDefaults();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-96 max-h-96 flex flex-col">
        {/* 标题 */}
        <div className="border-b border-gray-200 p-4 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">⌨️ 快捷键设置</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ✕
          </button>
        </div>

        {/* 快捷键列表 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {bindings.map((binding) => (
            <div
              key={binding.action}
              className="flex items-center justify-between p-3 rounded border border-gray-200 hover:bg-gray-50"
            >
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {binding.description}
                </p>
                <p className="text-xs text-gray-500">{binding.action}</p>
              </div>
              <button
                onClick={() => setEditingAction(binding.action)}
                onKeyDown={(e) => handleKeyDown(e, binding.action)}
                className={`px-3 py-1 rounded text-sm font-mono ${
                  editingAction === binding.action
                    ? 'bg-red-100 text-red-700 border border-red-300'
                    : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                }`}
              >
                {editingAction === binding.action
                  ? '按键中...'
                  : binding.keys}
              </button>
            </div>
          ))}
        </div>

        {/* 底部按钮 */}
        <div className="border-t border-gray-200 p-4 flex gap-2">
          <button
            onClick={handleReset}
            className="flex-1 px-3 py-2 rounded text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200"
          >
            恢复默认
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-3 py-2 rounded text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
}
