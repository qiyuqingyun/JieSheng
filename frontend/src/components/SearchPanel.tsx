import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useProject } from '../contexts/ProjectContext';

interface SearchResult {
  chapterId: string;
  chapterTitle: string;
  startIndex: number;
  endIndex: number;
  preview: string;
}

interface SearchPanelProps {
  onClose: () => void;
}

export default function SearchPanel({ onClose }: SearchPanelProps) {
  const { projectPath, projectMetadata, currentChapterId, loadChapter } = useProject();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchScope, setSearchScope] = useState<'current' | 'all'>('all');

  const performSearch = async (query: string) => {
    if (!query.trim() || !projectMetadata) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    const foundResults: SearchResult[] = [];

    try {
      // 搜索所有章节内容（从文件读取）
      const chaptersToSearch = searchScope === 'all' 
        ? projectMetadata.chapters 
        : projectMetadata.chapters.filter(c => c.id === currentChapterId);

      for (const chapter of chaptersToSearch) {
        try {
          // 从文件读取章节内容
          const content = await invoke<string>('load_chapter', {
            projectPath: projectPath,
            chapterId: chapter.id,
          });
          
          // 移除 HTML 标签用于搜索
          const plainText = content.replace(/<[^>]*>/g, '');
          
          // 搜索（不区分大小写）
          const lowerQuery = query.toLowerCase();
          const lowerText = plainText.toLowerCase();
          let index = 0;

          while ((index = lowerText.indexOf(lowerQuery, index)) !== -1) {
            const start = Math.max(0, index - 20);
            const end = Math.min(plainText.length, index + query.length + 20);
            const preview = plainText.slice(start, end);

            foundResults.push({
              chapterId: chapter.id,
              chapterTitle: chapter.title,
              startIndex: index,
              endIndex: index + query.length,
              preview: `...${preview}...`,
            });

            index += query.length;
          }
        } catch (error) {
          // 章节文件可能不存在，跳过
          console.warn(`无法读取章节 ${chapter.id}:`, error);
        }
      }

      setResults(foundResults.slice(0, 50)); // 限制最多 50 条结果
    } catch (error) {
      console.error('搜索失败:', error);
      alert(`❌ 搜索失败: ${error}`);
    }

    setIsSearching(false);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    performSearch(query);
  };

  const handleResultClick = (result: SearchResult) => {
    loadChapter(result.chapterId);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-96 max-h-96 flex flex-col">
        {/* 标题 */}
        <div className="border-b border-gray-200 p-4 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">🔍 搜索</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ✕
          </button>
        </div>

        {/* 搜索框 */}
        <div className="p-4 border-b border-gray-200 space-y-3">
          <input
            type="text"
            placeholder="搜索内容..."
            value={searchQuery}
            onChange={handleSearch}
            autoFocus
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                value="all"
                checked={searchScope === 'all'}
                onChange={(e) => {
                  setSearchScope(e.target.value as 'all');
                  performSearch(searchQuery);
                }}
              />
              全部章节
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                value="current"
                checked={searchScope === 'current'}
                onChange={(e) => {
                  setSearchScope(e.target.value as 'current');
                  performSearch(searchQuery);
                }}
              />
              当前章节
            </label>
          </div>
        </div>

        {/* 结果列表 */}
        <div className="flex-1 overflow-y-auto p-4">
          {isSearching && (
            <div className="text-center text-gray-400">搜索中...</div>
          )}
          {!isSearching && results.length === 0 && searchQuery && (
            <div className="text-center text-gray-400 text-sm">
              未找到匹配的内容
            </div>
          )}
          {!isSearching && results.length > 0 && (
            <div className="space-y-2">
              {results.map((result, idx) => (
                <div
                  key={idx}
                  onClick={() => handleResultClick(result)}
                  className="p-2 rounded hover:bg-blue-50 cursor-pointer border border-gray-200"
                >
                  <p className="text-sm font-medium text-gray-900">
                    {result.chapterTitle}
                  </p>
                  <p className="text-xs text-gray-600 line-clamp-2">
                    {result.preview}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 结果计数 */}
        {searchQuery && (
          <div className="border-t border-gray-200 p-3 text-xs text-gray-500 text-center">
            找到 {results.length} 条结果
          </div>
        )}
      </div>
    </div>
  );
}
