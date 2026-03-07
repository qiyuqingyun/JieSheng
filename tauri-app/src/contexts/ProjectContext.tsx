import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';

// 章节信息类型
export interface ChapterInfo {
  id: string;
  title: string;
  filename: string;
  order: number;
}

// 项目元数据类型
export interface ProjectMetadata {
  name: string;
  chapters: ChapterInfo[];
}

// Context 状态类型
interface ProjectContextType {
  projectPath: string | null;
  projectMetadata: ProjectMetadata | null;
  currentChapterId: string | null;
  currentChapterContent: string;
  hasUnsavedChanges: boolean;
  
  // 项目操作
  newProject: () => Promise<void>;
  openProject: () => Promise<void>;
  
  // 章节操作
  createChapter: (title: string) => Promise<void>;
  loadChapter: (chapterId: string) => Promise<void>;
  saveCurrentChapter: () => Promise<void>;
  updateChapterContent: (content: string) => void;
  reorderChapters: (chapters: ChapterInfo[]) => Promise<void>;
  
  // 状态查询
  isProjectOpen: () => boolean;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projectPath, setProjectPath] = useState<string | null>(null);
  const [projectMetadata, setProjectMetadata] = useState<ProjectMetadata | null>(null);
  const [currentChapterId, setCurrentChapterId] = useState<string | null>(null);
  const [currentChapterContent, setCurrentChapterContent] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // 应用启动时，尝试恢复草稿
  useEffect(() => {
    const recoverDraft = () => {
      const draftKey = `draft_${projectPath}_${currentChapterId}`;
      const savedDraft = localStorage.getItem(draftKey);
      const savedTimestamp = localStorage.getItem(`${draftKey}_timestamp`);
      
      if (savedDraft && savedTimestamp) {
        const timestamp = parseInt(savedTimestamp);
        const minutesAgo = Math.floor((Date.now() - timestamp) / 60000);
        
        if (minutesAgo < 60) { // 如果是1小时内的草稿
          const shouldRecover = window.confirm(
            `检测到 ${minutesAgo} 分钟前的未保存草稿，是否恢复？`
          );
          
          if (shouldRecover) {
            setCurrentChapterContent(savedDraft);
            setHasUnsavedChanges(true);
          } else {
            // 用户选择不恢复，清除草稿
            localStorage.removeItem(draftKey);
            localStorage.removeItem(`${draftKey}_timestamp`);
          }
        }
      }
    };

    if (projectPath && currentChapterId) {
      recoverDraft();
    }
  }, [projectPath, currentChapterId]);

  // 保存草稿到 localStorage
  useEffect(() => {
    if (projectPath && currentChapterId && currentChapterContent && hasUnsavedChanges) {
      const draftKey = `draft_${projectPath}_${currentChapterId}`;
      localStorage.setItem(draftKey, currentChapterContent);
      localStorage.setItem(`${draftKey}_timestamp`, Date.now().toString());
    }
  }, [projectPath, currentChapterId, currentChapterContent, hasUnsavedChanges]);

  // 创建新项目
  const newProject = useCallback(async () => {
    try {
      const selectedPath = await save({
        title: '新建项目',
        defaultPath: '我的小说',
      });

      if (selectedPath) {
        const projectName = selectedPath.split(/[\\/]/).pop() || '未命名项目';
        try {
          const metadata = await invoke<ProjectMetadata>('new_project', {
            projectPath: selectedPath,
            projectName,
          });

          setProjectPath(selectedPath);
          setProjectMetadata(metadata);
          setCurrentChapterId(null);
          setCurrentChapterContent('');
          setHasUnsavedChanges(false);
        } catch (invokeError) {
          console.error('创建项目失败:', invokeError);
          alert(`❌ 创建项目失败: ${invokeError}\n\n请确保选择的路径有写入权限。`);
        }
      }
    } catch (error) {
      console.error('打开保存对话框失败:', error);
      alert(`❌ 创建项目失败: ${error}`);
    }
  }, []);

  // 打开项目
  const openProject = useCallback(async () => {
    try {
      const selectedPath = await open({
        title: '打开项目',
        directory: true,
      });

      if (selectedPath) {
        try {
          const metadata = await invoke<ProjectMetadata>('open_project', {
            projectPath: selectedPath,
          });

          setProjectPath(selectedPath);
          setProjectMetadata(metadata);
          setCurrentChapterId(null);
          setCurrentChapterContent('');
          setHasUnsavedChanges(false);
        } catch (invokeError) {
          // Tauri invoke 失败，说明不是有效的 Writer's IDE 项目
          console.error('项目文件无效:', invokeError);
          alert('❌ 错误：选择的文件夹不是有效的 Writer\'s IDE 项目。\n\n请确保文件夹包含 project.json 文件。');
        }
      }
    } catch (error) {
      console.error('打开项目对话框失败:', error);
      alert(`❌ 打开项目失败: ${error}`);
    }
  }, []);

  // 创建新章节
  const createChapter = useCallback(async (title: string) => {
    if (!projectPath) return;

    try {
      const chapterId = `chapter_${Date.now()}`;
      const metadata = await invoke<ProjectMetadata>('create_chapter', {
        projectPath,
        chapterTitle: title,
        chapterId,
      });

      setProjectMetadata(metadata);
    } catch (error) {
      console.error('创建章节失败:', error);
      alert(`❌ 创建章节失败: ${error}\n\n请检查项目文件夹权限。`);
    }
  }, [projectPath]);

  // 加载章节
  const loadChapter = useCallback(async (chapterId: string) => {
    if (!projectPath) return;

    try {
      // 如果有未保存的更改，先保存
      if (hasUnsavedChanges && currentChapterId) {
        try {
          await invoke('save_chapter', {
            projectPath,
            chapterId: currentChapterId,
            content: currentChapterContent,
          });
        } catch (saveError) {
          console.error('保存章节时出错:', saveError);
          alert(`❌ 保存失败: ${saveError}\n\n请检查文件夹权限。`);
          return;
        }
      }

      try {
        const content = await invoke<string>('load_chapter', {
          projectPath,
          chapterId,
        });

        setCurrentChapterId(chapterId);
        setCurrentChapterContent(content);
        setHasUnsavedChanges(false);
      } catch (loadError) {
        console.error('加载章节失败:', loadError);
        alert(`❌ 加载章节失败: ${loadError}\n\n章节文件可能已被删除。`);
      }
    } catch (error) {
      console.error('加载章节失败:', error);
      alert(`❌ 加载章节失败: ${error}`);
    }
  }, [projectPath, hasUnsavedChanges, currentChapterId, currentChapterContent]);

  // 保存当前章节
  const saveCurrentChapter = useCallback(async () => {
    if (!projectPath || !currentChapterId) return;

    try {
      await invoke('save_chapter', {
        projectPath,
        chapterId: currentChapterId,
        content: currentChapterContent,
      });

      setHasUnsavedChanges(false);
      
      // 清除 localStorage 中的草稿
      const draftKey = `draft_${projectPath}_${currentChapterId}`;
      localStorage.removeItem(draftKey);
      localStorage.removeItem(`${draftKey}_timestamp`);
    } catch (error) {
      console.error('保存章节失败:', error);
      alert(`❌ 保存失败: ${error}\n\n请检查文件夹权限或磁盘空间。`);
    }
  }, [projectPath, currentChapterId, currentChapterContent]);

  // 更新章节内容
  const updateChapterContent = useCallback((content: string) => {
    setCurrentChapterContent(content);
    setHasUnsavedChanges(true);
  }, []);

  // 重新排序章节
  const reorderChapters = useCallback(async (chapters: ChapterInfo[]) => {
    if (!projectPath || !projectMetadata) return;

    try {
      const updatedMetadata = {
        ...projectMetadata,
        chapters,
      };

      await invoke('update_metadata', {
        projectPath,
        metadata: updatedMetadata,
      });

      setProjectMetadata(updatedMetadata);
    } catch (error) {
      console.error('更新章节顺序失败:', error);
      alert(`❌ 更新章节顺序失败: ${error}\n\n请检查文件夹权限。`);
    }
  }, [projectPath, projectMetadata]);

  // 检查项目是否打开
  const isProjectOpen = useCallback(() => {
    return projectPath !== null && projectMetadata !== null;
  }, [projectPath, projectMetadata]);

  // 自动保存：定时器（3秒）+ window blur
  useEffect(() => {
    // 定时自动保存
    const autoSaveInterval = setInterval(() => {
      if (hasUnsavedChanges && projectPath && currentChapterId) {
        console.log('自动保存（定时器）...');
        saveCurrentChapter();
      }
    }, 3000); // 每 3 秒检查一次

    // 窗口失焦时自动保存
    const handleBlur = () => {
      if (hasUnsavedChanges && projectPath && currentChapterId) {
        console.log('自动保存（失焦）...');
        saveCurrentChapter();
      }
    };
    window.addEventListener('blur', handleBlur);

    return () => {
      clearInterval(autoSaveInterval);
      window.removeEventListener('blur', handleBlur);
    };
  }, [hasUnsavedChanges, projectPath, currentChapterId, saveCurrentChapter]);

  const value: ProjectContextType = {
    projectPath,
    projectMetadata,
    currentChapterId,
    currentChapterContent,
    hasUnsavedChanges,
    newProject,
    openProject,
    createChapter,
    loadChapter,
    saveCurrentChapter,
    updateChapterContent,
    reorderChapters,
    isProjectOpen,
  };

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

// Hook 用于访问 Context
export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within ProjectProvider');
  }
  return context;
};
