import { useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { QuillBinding } from "y-quill";
import Quill from "quill";
import QuillCursors from "quill-cursors";
import "quill/dist/quill.snow.css"; // Import Quill's CSS
import { Box } from "@mui/material";

Quill.register("modules/cursors", QuillCursors);

const EditorPage = ({
  uname,
  editorContent,
  setEditorContent,
  fieldId,
  color,
  saveChanges,
}: any) => {
  const editorContainerRef = useRef(null);
  const editorRef = useRef<Quill | null>(null); // Add a ref for the editor instance
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!fieldId || !uname) return;
    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider(
      "wss://demos.yjs.dev/ws",
      `${fieldId}`,
      ydoc
    );
    const ytext = ydoc.getText("quill");

    if (editorContainerRef.current) {
      const editor = new Quill(editorContainerRef.current, {
        modules: {
          cursors: true,
          toolbar: false,
          history: {
            userOnly: true,
          },
        },
        placeholder: "Type something...",
        theme: "snow",
      });

      editorRef.current = editor;

      const binding = new QuillBinding(ytext, editor, provider.awareness);

      const userInfo = {
        name: uname,
        color: color,
      };
      provider.awareness.setLocalStateField("user", userInfo);

      const updateContent = () => {
        if (saveChanges) {
          saveChanges(editor.getText());
        }
      };

      editor.on("text-change", updateContent);

      return () => {
        provider.disconnect();
        provider.destroy();
        binding.destroy();
        editor.off("text-change", updateContent);
      };
    }
  }, [uname, fieldId]);

  // Optional: Handle external updates to editorContent (if needed)
  useEffect(() => {
    if (editorRef.current && editorContent !== editorRef.current.getText()) {
      // editorRef.current.setText(editorContent);
      editorRef.current.setText(""); // Clear existing text
    }
  }, [editorContent]);

  return (
    <Box
      ref={editorContainerRef}
      sx={{
        borderBottomRightRadius: "25px",
        borderBottomLeftRadius: "25px",
        minHeight: "70px",
        fontSize: fieldId.split("-").at(-1) === "title" ? "24px" : "18px",
      }}
    />
  );
};

export default EditorPage;
