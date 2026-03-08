import { useProject } from "../contexts/ProjectContext";
import DocumentEditor from "./DocumentEditor";

export default function RichEditor() {
  const { currentChapterContent, updateChapterContent } = useProject();
  return (
    <DocumentEditor
      content={currentChapterContent}
      onContentChange={updateChapterContent}
    />
  );
}
