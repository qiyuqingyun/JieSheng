import React, { createContext, useContext, useState, useEffect } from 'react';

export interface KeyBinding {
  action: string;
  keys: string;
  description: string;
}

interface KeyBindingsContextType {
  bindings: KeyBinding[];
  updateBinding: (action: string, keys: string) => void;
  getBinding: (action: string) => string | undefined;
  resetToDefaults: () => void;
}

const defaultBindings: KeyBinding[] = [
  { action: 'save', keys: 'ctrl+s', description: '保存章节' },
  { action: 'search', keys: 'ctrl+f', description: '搜索' },
  { action: 'bold', keys: 'ctrl+b', description: '粗体' },
  { action: 'italic', keys: 'ctrl+i', description: '斜体' },
  { action: 'underline', keys: 'ctrl+u', description: '下划线' },
  { action: 'undo', keys: 'ctrl+z', description: '撤销' },
  { action: 'redo', keys: 'ctrl+y', description: '重做' },
  { action: 'focusMode', keys: 'ctrl+\\', description: '专注模式' },
];

const KeyBindingsContext = createContext<KeyBindingsContextType | undefined>(undefined);

export const KeyBindingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bindings, setBindings] = useState<KeyBinding[]>(defaultBindings);

  // 从 localStorage 加载快捷键配置
  useEffect(() => {
    const saved = localStorage.getItem('keyBindings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setBindings(parsed);
      } catch (e) {
        console.error('加载快捷键配置失败:', e);
      }
    }
  }, []);

  const updateBinding = (action: string, keys: string) => {
    setBindings((prev) => {
      const updated = prev.map((b) =>
        b.action === action ? { ...b, keys } : b
      );
      localStorage.setItem('keyBindings', JSON.stringify(updated));
      return updated;
    });
  };

  const getBinding = (action: string) => {
    return bindings.find((b) => b.action === action)?.keys;
  };

  const resetToDefaults = () => {
    setBindings(defaultBindings);
    localStorage.setItem('keyBindings', JSON.stringify(defaultBindings));
  };

  const value: KeyBindingsContextType = {
    bindings,
    updateBinding,
    getBinding,
    resetToDefaults,
  };

  return (
    <KeyBindingsContext.Provider value={value}>
      {children}
    </KeyBindingsContext.Provider>
  );
};

export const useKeyBindings = () => {
  const context = useContext(KeyBindingsContext);
  if (!context) {
    throw new Error('useKeyBindings must be used within KeyBindingsProvider');
  }
  return context;
};
