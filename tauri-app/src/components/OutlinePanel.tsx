import { useProject } from '../contexts/ProjectContext';

export default function OutlinePanel() {
  const { 
    projectMetadata, 
    currentOutlineId, 
    loadOutline
  } = useProject();

  const handleOutlineClick = (outlineId: string) => {
    loadOutline(outlineId);
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {projectMetadata?.outlines && projectMetadata.outlines.length > 0 ? (
          projectMetadata.outlines.map((outline) => (
            <div
              key={outline.id}
              onClick={() => handleOutlineClick(outline.id)}
              className={`p-2 rounded cursor-pointer text-sm ${
                currentOutlineId === outline.id
                  ? 'bg-blue-100 text-blue-900 font-medium'
                  : 'text-gray-700 hover:bg-white'
              }`}
            >
              {outline.title}
            </div>
          ))
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            <div className="text-center">
              <p className="mb-2">📋</p>
              <p>暂无大纲</p>
              <p className="text-xs mt-1">点击下方"新建"创建</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
