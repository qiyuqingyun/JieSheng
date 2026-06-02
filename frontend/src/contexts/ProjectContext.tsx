import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open, message } from '@tauri-apps/plugin-dialog';

// 章节信息类型
export interface ChapterInfo {
  id: string;
  title: string;
  filename: string;
  order: number;
}

// 大纲信息类型
export interface OutlineInfo {
  id: string;
  title: string;
  filename: string;
  order: number;
}

// 角色信息类型
export interface CharacterInfo {
  id: string;
  name: string;
  filename: string;
  role: string;
  tags: string[];
}

// 项目元数据类型
export interface ProjectMetadata {
  name: string;
  chapters: ChapterInfo[];
  outlines: OutlineInfo[];
  characters: CharacterInfo[];
}

// Context 状态类型
interface ProjectContextType {
  projectPath: string | null;
  projectMetadata: ProjectMetadata | null;
  currentChapterId: string | null;
  currentChapterContent: string;
  currentOutlineId: string | null;
  currentOutlineContent: string;
  currentCharacterId: string | null;
  currentCharacterContent: string;
  hasUnsavedChanges: boolean;
  
  // 项目操作
  newProject: (projectName: string) => Promise<void>;
  openProject: () => Promise<void>;
  closeProject: () => void;
  
  // 章节操作
  createChapter: (title: string) => Promise<void>;
  loadChapter: (chapterId: string) => Promise<void>;
  saveCurrentChapter: () => Promise<void>;
  updateChapterContent: (content: string) => void;
  reorderChapters: (chapters: ChapterInfo[]) => Promise<void>;
  
  // 大纲操作
  createOutline: (title: string) => Promise<void>;
  loadOutline: (outlineId: string) => Promise<void>;
  saveCurrentOutline: () => Promise<void>;
  updateOutlineContent: (content: string) => void;

  // 角色操作
  createCharacter: (name: string) => Promise<void>;
  loadCharacter: (characterId: string) => Promise<void>;
  saveCurrentCharacter: () => Promise<void>;
  updateCharacterContent: (content: string) => void;
  updateCharacterMeta: (characterId: string, updates: { role?: string; tags?: string[] }) => Promise<void>;
  renameCharacter: (characterId: string, newName: string) => Promise<void>;
  deleteCharacter: (characterId: string) => Promise<void>;
  
  // 状态查询
  isProjectOpen: () => boolean;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projectPath, setProjectPath] = useState<string | null>(null);
  const [projectMetadata, setProjectMetadata] = useState<ProjectMetadata | null>(null);
  const [currentChapterId, setCurrentChapterId] = useState<string | null>(null);
  const [currentChapterContent, setCurrentChapterContent] = useState('');
  const [currentOutlineId, setCurrentOutlineId] = useState<string | null>(null);
  const [currentOutlineContent, setCurrentOutlineContent] = useState('');
  const [currentCharacterId, setCurrentCharacterId] = useState<string | null>(null);
  const [currentCharacterContent, setCurrentCharacterContent] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const parseCharacterMetaFromMarkdown = (markdown: string): { role?: string; tags?: string[] } => {
    const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) return {};

    const frontmatter = frontmatterMatch[1];
    const roleMatch = frontmatter.match(/^role:\s*(.+)$/m);
    const tagsMatch = frontmatter.match(/^tags:\s*\[(.*)\]$/m);

    const role = roleMatch?.[1]?.trim() || undefined;
    const tags = tagsMatch
      ? tagsMatch[1]
          .split(',')
          .map((item) => item.trim().replace(/^"|"$/g, ''))
          .filter(Boolean)
      : undefined;

    return { role, tags };
  };

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
  const newProject = useCallback(async (projectName: string) => {
    try {
      const selectedPath = await open({
        title: '选择项目保存位置',
        directory: true,
      });

      if (selectedPath) {
        const basePath = Array.isArray(selectedPath) ? selectedPath[0] : selectedPath;
        const safeProjectName = projectName.trim() || '未命名项目';
        const projectPath = `${basePath}\\${safeProjectName}`;

        try {
          const metadata = await invoke<ProjectMetadata>('new_project', {
            projectPath,
            projectName: safeProjectName,
          });

          setProjectPath(projectPath);
          setProjectMetadata(metadata);
          setCurrentChapterId(null);
          setCurrentChapterContent('');
          setCurrentOutlineId(null);
          setCurrentOutlineContent('');
          setCurrentCharacterId(null);
          setCurrentCharacterContent('');
          setHasUnsavedChanges(false);
        } catch (invokeError) {
          console.error('创建项目失败:', invokeError);
          await message(`❌ 创建项目失败: ${invokeError}\n\n请确保选择的路径有写入权限。`, { title: '创建项目失败', kind: 'error' });
        }
      }
    } catch (error) {
      console.error('打开目录对话框失败:', error);
      await message(`❌ 创建项目失败: ${error}`, { title: '创建项目失败', kind: 'error' });
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
          setCurrentOutlineId(null);
          setCurrentOutlineContent('');
          setCurrentCharacterId(null);
          setCurrentCharacterContent('');
          setHasUnsavedChanges(false);
        } catch (invokeError) {
          // Tauri invoke 失败，说明不是有效的 Writer's IDE 项目
          console.error('[前端] Rust 调用失败:', invokeError);
          
          await message(`选择的文件夹不是有效的 Writer's IDE 项目。\n\n${invokeError}`, { 
            title: '打开项目失败', 
            kind: 'error' 
          });
        }
      }
    } catch (error) {
      console.error('打开项目对话框失败:', error);
      await message(`❌ 打开项目失败: ${error}`, { title: '打开项目失败', kind: 'error' });
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
      await message(`❌ 创建章节失败: ${error}\n\n请检查项目文件夹权限。`, { title: '创建章节失败', kind: 'error' });
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
          await message(`❌ 保存失败: ${saveError}\n\n请检查文件夹权限。`, { title: '保存失败', kind: 'error' });
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
        setCurrentOutlineId(null);
        setCurrentOutlineContent('');
        setCurrentCharacterId(null);
        setCurrentCharacterContent('');
        setHasUnsavedChanges(false);
      } catch (loadError) {
        console.error('加载章节失败:', loadError);
        await message(`❌ 加载章节失败: ${loadError}\n\n章节文件可能已被删除。`, { title: '加载章节失败', kind: 'error' });
      }
    } catch (error) {
      console.error('加载章节失败:', error);
      await message(`❌ 加载章节失败: ${error}`, { title: '加载章节失败', kind: 'error' });
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
      await message(`❌ 保存失败: ${error}\n\n请检查文件夹权限或磁盘空间。`, { title: '保存失败', kind: 'error' });
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
      await message(`❌ 更新章节顺序失败: ${error}\n\n请检查文件夹权限。`, { title: '更新章节顺序失败', kind: 'error' });
    }
  }, [projectPath, projectMetadata]);

  // 检查项目是否打开
  const isProjectOpen = useCallback(() => {
    return projectPath !== null && projectMetadata !== null;
  }, [projectPath, projectMetadata]);

  // 关闭项目
  const closeProject = useCallback(() => {
    if (hasUnsavedChanges) {
      const shouldClose = window.confirm('有未保存的更改，确定要关闭项目吗？');
      if (!shouldClose) return;
    }
    
    // 清除状态
    setProjectPath(null);
    setProjectMetadata(null);
    setCurrentChapterId(null);
    setCurrentChapterContent('');
    setCurrentOutlineId(null);
    setCurrentOutlineContent('');
    setCurrentCharacterId(null);
    setCurrentCharacterContent('');
    setHasUnsavedChanges(false);
  }, [hasUnsavedChanges]);

  // 创建新大纲
  const createOutline = useCallback(async (title: string) => {
    if (!projectPath) return;

    try {
      const outlineId = `outline_${Date.now()}`;
      const updatedMetadata = await invoke<ProjectMetadata>('create_outline', {
        projectPath,
        outlineTitle: title,
        outlineId,
      });

      setProjectMetadata(updatedMetadata);
      // 自动加载新创建的大纲
      loadOutline(outlineId);
    } catch (error) {
      console.error('创建大纲失败:', error);
      await message(`❌ 创建大纲失败: ${error}`, { title: '创建大纲失败', kind: 'error' });
    }
  }, [projectPath]);

  // 加载大纲
  const loadOutline = useCallback(async (outlineId: string) => {
    if (!projectPath) return;

    try {
      const content = await invoke<string>('load_outline', {
        projectPath,
        outlineId,
      });

      setCurrentOutlineId(outlineId);
      setCurrentOutlineContent(content);
      setCurrentChapterId(null); // 切换到大纲时清除章节
      setCurrentChapterContent('');
      setCurrentCharacterId(null);
      setCurrentCharacterContent('');
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('加载大纲失败:', error);
      await message(`❌ 加载大纲失败: ${error}`, { title: '加载大纲失败', kind: 'error' });
    }
  }, [projectPath]);

  // 保存当前大纲
  const saveCurrentOutline = useCallback(async () => {
    if (!projectPath || !currentOutlineId) return;

    try {
      await invoke('save_outline', {
        projectPath,
        outlineId: currentOutlineId,
        content: currentOutlineContent,
      });

      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('保存大纲失败:', error);
      await message(`❌ 保存大纲失败: ${error}`, { title: '保存大纲失败', kind: 'error' });
    }
  }, [projectPath, currentOutlineId, currentOutlineContent]);

  // 更新大纲内容
  const updateOutlineContent = useCallback((content: string) => {
    setCurrentOutlineContent(content);
    setHasUnsavedChanges(true);
  }, []);

  // 创建新角色
  const createCharacter = useCallback(async (name: string) => {
    if (!projectPath) return;

    try {
      const characterId = `character_${Date.now()}`;
      const updatedMetadata = await invoke<ProjectMetadata>('create_character', {
        projectPath,
        characterName: name,
        characterId,
      });

      setProjectMetadata(updatedMetadata);
      await loadCharacter(characterId);
    } catch (error) {
      console.error('创建角色失败:', error);
      await message(`❌ 创建角色失败: ${error}`, { title: '创建角色失败', kind: 'error' });
    }
  }, [projectPath]);

  // 加载角色
  const loadCharacter = useCallback(async (characterId: string) => {
    if (!projectPath) return;

    try {
      const content = await invoke<string>('load_character', {
        projectPath,
        characterId,
      });

      setCurrentCharacterId(characterId);
      setCurrentCharacterContent(content);
      setCurrentChapterId(null);
      setCurrentChapterContent('');
      setCurrentOutlineId(null);
      setCurrentOutlineContent('');
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('加载角色失败:', error);
      await message(`❌ 加载角色失败: ${error}`, { title: '加载角色失败', kind: 'error' });
    }
  }, [projectPath]);

  // 保存当前角色
  const saveCurrentCharacter = useCallback(async () => {
    if (!projectPath || !currentCharacterId) return;

    try {
      await invoke('save_character', {
        projectPath,
        characterId: currentCharacterId,
        content: currentCharacterContent,
      });

      if (projectMetadata) {
        const parsedMeta = parseCharacterMetaFromMarkdown(currentCharacterContent);
        const updatedMetadata = {
          ...projectMetadata,
          characters: projectMetadata.characters.map((character) =>
            character.id === currentCharacterId
              ? {
                  ...character,
                  role: parsedMeta.role ?? character.role,
                  tags: parsedMeta.tags ?? character.tags,
                }
              : character
          ),
        };

        await invoke('update_metadata', {
          projectPath,
          metadata: updatedMetadata,
        });

        setProjectMetadata(updatedMetadata);
      }

      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('保存角色失败:', error);
      await message(`❌ 保存角色失败: ${error}`, { title: '保存角色失败', kind: 'error' });
    }
  }, [projectPath, currentCharacterId, currentCharacterContent, projectMetadata]);

  // 更新角色内容
  const updateCharacterContent = useCallback((content: string) => {
    setCurrentCharacterContent(content);
    setHasUnsavedChanges(true);
  }, []);

  // 更新角色元信息
  const updateCharacterMeta = useCallback(async (
    characterId: string,
    updates: { role?: string; tags?: string[] }
  ) => {
    if (!projectPath || !projectMetadata) return;

    try {
      const updatedMetadata = {
        ...projectMetadata,
        characters: projectMetadata.characters.map((character) =>
          character.id === characterId
            ? {
                ...character,
                role: updates.role ?? character.role,
                tags: updates.tags ?? character.tags,
              }
            : character
        ),
      };

      await invoke('update_metadata', {
        projectPath,
        metadata: updatedMetadata,
      });

      setProjectMetadata(updatedMetadata);
    } catch (error) {
      console.error('更新角色元信息失败:', error);
      await message(`❌ 更新角色元信息失败: ${error}`, { title: '更新角色元信息失败', kind: 'error' });
    }
  }, [projectPath, projectMetadata]);

  // 重命名角色
  const renameCharacter = useCallback(async (characterId: string, newName: string) => {
    if (!projectPath) return;

    try {
      const updatedMetadata = await invoke<ProjectMetadata>('rename_character', {
        projectPath,
        characterId,
        newName,
      });
      setProjectMetadata(updatedMetadata);
    } catch (error) {
      console.error('重命名角色失败:', error);
      await message(`❌ 重命名角色失败: ${error}`, { title: '重命名角色失败', kind: 'error' });
    }
  }, [projectPath]);

  // 删除角色
  const deleteCharacter = useCallback(async (characterId: string) => {
    if (!projectPath) return;

    try {
      const updatedMetadata = await invoke<ProjectMetadata>('delete_character', {
        projectPath,
        characterId,
      });
      setProjectMetadata(updatedMetadata);

      if (currentCharacterId === characterId) {
        setCurrentCharacterId(null);
        setCurrentCharacterContent('');
      }
    } catch (error) {
      console.error('删除角色失败:', error);
      await message(`❌ 删除角色失败: ${error}`, { title: '删除角色失败', kind: 'error' });
    }
  }, [projectPath, currentCharacterId]);

  // 自动保存：定时器（3秒）+ window blur
  useEffect(() => {
    // 定时自动保存
    const autoSaveInterval = setInterval(() => {
      if (hasUnsavedChanges && projectPath) {
        if (currentChapterId) {
          console.log('自动保存章节（定时器）...');
          saveCurrentChapter();
        } else if (currentOutlineId) {
          console.log('自动保存大纲（定时器）...');
          saveCurrentOutline();
        } else if (currentCharacterId) {
          console.log('自动保存角色（定时器）...');
          saveCurrentCharacter();
        }
      }
    }, 3000); // 每 3 秒检查一次

    // 窗口失焦时自动保存
    const handleBlur = () => {
      if (hasUnsavedChanges && projectPath) {
        if (currentChapterId) {
          console.log('自动保存章节（失焦）...');
          saveCurrentChapter();
        } else if (currentOutlineId) {
          console.log('自动保存大纲（失焦）...');
          saveCurrentOutline();
        } else if (currentCharacterId) {
          console.log('自动保存角色（失焦）...');
          saveCurrentCharacter();
        }
      }
    };
    window.addEventListener('blur', handleBlur);

    return () => {
      clearInterval(autoSaveInterval);
      window.removeEventListener('blur', handleBlur);
    };
  }, [
    hasUnsavedChanges,
    projectPath,
    currentChapterId,
    currentOutlineId,
    currentCharacterId,
    saveCurrentChapter,
    saveCurrentOutline,
    saveCurrentCharacter,
  ]);

  const value: ProjectContextType = {
    projectPath,
    projectMetadata,
    currentChapterId,
    currentChapterContent,
    currentOutlineId,
    currentOutlineContent,
    currentCharacterId,
    currentCharacterContent,
    hasUnsavedChanges,
    newProject,
    openProject,
    closeProject,
    createChapter,
    loadChapter,
    saveCurrentChapter,
    updateChapterContent,
    reorderChapters,
    createOutline,
    loadOutline,
    saveCurrentOutline,
    updateOutlineContent,
    createCharacter,
    loadCharacter,
    saveCurrentCharacter,
    updateCharacterContent,
    updateCharacterMeta,
    renameCharacter,
    deleteCharacter,
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
