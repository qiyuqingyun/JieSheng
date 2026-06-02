import { useProject } from "../contexts/ProjectContext";
import DocumentEditor from "./DocumentEditor";

export default function OutlineEditor() {
  const { currentOutlineContent, updateOutlineContent } = useProject();
  return (
    <DocumentEditor
      content={currentOutlineContent}
      onContentChange={updateOutlineContent}
    />
  );
}
