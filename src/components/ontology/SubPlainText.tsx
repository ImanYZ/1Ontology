/* # SubPlainText Component

The `SubPlainText` component is a React component used for displaying and editing plain text fields within an ontology. It supports markdown rendering and integrates with Firebase Firestore for data persistence.

## Features

- Editable text fields with markdown support.
- Firestore integration for data retrieval and updates.
- Inheritance handling for ontology fields.
- Locking mechanism to prevent concurrent edits.
- Logging of edit actions for audit trails.
- Deletion of sub-ontologies.

## Props

The component accepts the following props:

- `text`: The text content to be displayed or edited.
- `type`: The type of the text field (e.g., 'title', 'description').
- `openOntology`: The current ontology object being viewed or edited.
- `setOpenOntology`: Function to update the state of the current ontology.
- `editOntology`: The ID of the ontology being edited, if any.
- `setEditOntology`: Function to set the ID of the ontology being edited.
- `lockedOntology`: An object containing information about locked ontologies to prevent concurrent edits.
- `addLock`: Function to add or remove a lock on an ontology field.
- `user`: The current user object.
- `recordLogs`: Function to record logs for edit actions.
- `deleteSubOntologyEditable`: Function to delete a sub-ontology.
- `updateInheritance`: Function to update the inheritance of ontology fields.

## Usage

To use the `SubPlainText` component, import it into your React application and provide the necessary props as shown in the example below:

```jsx
import SubPlainText from './SubPlainText';

// ... within your component's render method or function component body
<SubPlainText
  text={yourTextContent}
  type="description"
  openOntology={yourCurrentOntology}
  setOpenOntology={yourSetOpenOntologyFunction}
  editOntology={yourEditOntologyId}
  setEditOntology={yourSetEditOntologyFunction}
  lockedOntology={yourLockedOntologyObject}
  addLock={yourAddLockFunction}
  user={yourCurrentUser}
  recordLogs={yourRecordLogsFunction}
  deleteSubOntologyEditable={yourDeleteSubOntologyEditableFunction}
  updateInheritance={yourUpdateInheritanceFunction}
/>
```

## Component Structure

The component consists of the following main parts:

- A `TextField` component for editing the text, which appears when the `editMode` state is `true`.
- A `MarkdownRender` component for displaying the text content with markdown formatting.
- Buttons for toggling `editMode`, saving changes, and deleting the ontology.
- Lock icons and tooltips to indicate when a field is locked for editing.

## Editing Flow

1. The user clicks the "Edit" button, which sets `editMode` to `true`.
2. The `TextField` component becomes editable, allowing the user to make changes.
3. The user clicks the "Save" button, which triggers the `onSaveTextChange` function.
4. The function updates the Firestore document with the new text and toggles `editMode` to `false`.
5. If the text field has inheritance, the `updateInheritance` function is called to propagate changes to child ontologies.

## Locking Mechanism

The component uses a locking mechanism to prevent concurrent edits. When a user starts editing a field, a lock is added to the `lockedOntology` object. Other users will see a lock icon indicating that the field is currently being edited. Once the user saves or cancels the edit, the lock is removed.

## Logging

The `recordLogs` function is called whenever a user saves changes to a field. It records the action, field type, previous value, and new value for audit purposes.

## Deletion

The `handleDeleteOntology` function is called when the user clicks the "Delete" button. It triggers the `deleteSubOntologyEditable` function to remove the sub-ontology from the database.

## Styling

The component uses Material-UI components and styles for a consistent look and feel. Custom styles are applied using the `sx` prop.

## Dependencies

- `@mui/icons-material`
- `@mui/material`
- `firebase/firestore`
- `react`
- `MarkdownRender` (a custom component for rendering markdown)

## Importing Types

The component imports the `IOntology` and `ILockedOntology` types from `@components/types/IOntology` for TypeScript type checking.

---
 */

import LockIcon from "@mui/icons-material/Lock";
import { Box, Button, TextField, Tooltip, Typography } from "@mui/material";
import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getFirestore,
  updateDoc,
} from "firebase/firestore";
import { useEffect, useRef, useState } from "react";

import MarkdownRender from "../Markdown/MarkdownRender";
import { IOntology } from " @components/types/IOntology";

type ISubOntologyProps = {
  openOntology: IOntology;
  setOpenOntology: (state: any) => void;
  type: string;
  setSnackbarMessage: (message: any) => void;
  text: string;
  editOntology?: string | null;
  setEditOntology: (state: string) => void;
  lockedOntology: {
    [field: string]: {
      id: string;
      uname: string;
      ontology: string;
      field: string;
      deleted: boolean;
      createdAt: Timestamp;
    };
  };
  addLock: (ontology: string, field: string, type: string) => void;
  user: any;
  recordLogs: (logs: any) => void;
  deleteSubOntologyEditable?: () => void;
  updateInheritance: (parameters: {
    updatedOntology: IOntology;
    updatedField: string;
    type: "subOntologies" | "plainText";
    newValue: any;
    ancestorTitle: string;
  }) => void;
};
const SubPlainText = ({
  text,
  type,
  openOntology,
  setOpenOntology,
  editOntology = null,
  setEditOntology,
  lockedOntology,
  addLock,
  user,
  recordLogs,
  deleteSubOntologyEditable = () => {},
  updateInheritance,
}: ISubOntologyProps) => {
  const db = getFirestore();
  const [editMode, setEditMode] = useState(false);
  const textFieldRef = useRef<any>(null);

  const capitalizeFirstLetter = (word: string) => {
    return word.charAt(0).toUpperCase() + word.slice(1);
  };

  const editTitleSubOntology = ({ parentData, newTitle, id }: any) => {
    for (let type in parentData.subOntologies) {
      for (let category in parentData.subOntologies[type] || {}) {
        if (
          (parentData.subOntologies[type][category].ontologies || []).length > 0
        ) {
          const subOntologyIdx = parentData.subOntologies[type][
            category
          ].ontologies.findIndex((sub: any) => sub.id === id);
          if (subOntologyIdx !== -1) {
            parentData.subOntologies[type][category].ontologies[
              subOntologyIdx
            ].title = newTitle;
          }
        }
      }
    }
  };

  useEffect(() => {
    if (type === "title" && editOntology) {
      setEditMode(editOntology === openOntology.id);
    }
  }, [editOntology, openOntology]);

  const onSaveTextChange = async () => {
    setEditMode((edit) => !edit);
    if (editMode) {
      const ontologyDoc = await getDoc(
        doc(collection(db, "ontology"), openOntology.id)
      );
      if (ontologyDoc.exists()) {
        const ontologyData: any = ontologyDoc.data();

        if (type === "title") {
          setEditOntology("");
          for (let parentId of openOntology?.parents || []) {
            const parentRef = doc(collection(db, "ontology"), parentId);
            const parentDoc = await getDoc(parentRef);
            const parentData: any = parentDoc.data();
            editTitleSubOntology({
              parentData,
              newTitle: openOntology.title,
              id: openOntology.id,
            });
            await updateDoc(parentRef, parentData);
          }
        }
        let previousValue = "";
        let newValue = "";

        if (["description", "title"].includes(type)) {
          previousValue = ontologyData[type];
          newValue = openOntology[type as "description" | "title"];
          ontologyData[type] = openOntology[type as "description" | "title"];
        } else {
          previousValue = ontologyData.plainText[type];
          newValue = openOntology.plainText[type];
          ontologyData.plainText[type] = openOntology.plainText[type] || "";
        }
        if (type !== "title" && ontologyData.inheritance) {
          ontologyData.inheritance.plainText[type] = {
            ref: null,
            title: "",
          };
        }

        await updateDoc(ontologyDoc.ref, ontologyData);

        //need to call this to update the children according to the Inhiretance
        //Title doesn't have Inhiretance
        updateInheritance({
          updatedField: type,
          type: "plainText",
          newValue: newValue,
          updatedOntology: { ...ontologyData, id: openOntology.id },
          ancestorTitle: ontologyData.title,
        });

        addLock(openOntology.id, type, "remove");
        recordLogs({
          action: "Edited a field",
          field: type,
          previousValue,
          newValue,
        });
      }
    } else {
      await addLock(openOntology.id, type, "add");
    }
  };

  const handleEditText = (e: any) => {
    setOpenOntology((openOntology: IOntology) => {
      const _openOntology: IOntology = { ...openOntology };
      if (["description", "title"].includes(type)) {
        _openOntology[type as "description" | "title"] = e.target.value;
      } else {
        _openOntology.plainText[type] = e.target.value;
      }

      return _openOntology;
    });
  };
  const handleFocus = (event: any) => {
    if (type === "title" && editOntology === openOntology.id) {
      event.target.select();
    }
  };

  const handleDeleteOntology = () => {
    deleteSubOntologyEditable();
  };

  return (
    <Box>
      {type !== "title" && (
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Typography sx={{ fontSize: "19px" }}>
            {capitalizeFirstLetter(type)}:
          </Typography>
          {lockedOntology[type] && user.uname !== lockedOntology[type].uname ? (
            <Tooltip title={"Locked"} sx={{ ml: "5px" }}>
              <LockIcon />
            </Tooltip>
          ) : (
            <Tooltip title={editMode ? "Save" : "Edit"}>
              <Button onClick={onSaveTextChange} sx={{ ml: "5px" }}>
                {editMode ? "Save" : "Edit"}
              </Button>
            </Tooltip>
          )}
          {(openOntology.inheritance || {}).plainText &&
            (openOntology.inheritance || {}).plainText[type]?.ref && (
              <Typography sx={{ color: "grey" }}>
                {"("}
                {"Inherited from "}
                {'"'}
                {(openOntology.inheritance || {}).plainText[type]?.title}
                {'"'}
                {")"}
              </Typography>
            )}
        </Box>
      )}
      {editMode ? (
        <TextField
          placeholder={type}
          variant="standard"
          fullWidth
          value={text}
          multiline
          onChange={handleEditText}
          InputProps={{
            style: { fontSize: type === "title" ? "30px" : "" },
            endAdornment: (
              <Box
                style={{
                  marginRight: "18px",
                  cursor: "pointer",
                  display: "flex",
                }}
              >
                {type === "title" && (
                  <Tooltip title={"Save"}>
                    <Button onClick={onSaveTextChange} sx={{ ml: "5px" }}>
                      {editMode ? "Save" : "Edit"}
                    </Button>
                  </Tooltip>
                )}
              </Box>
            ),
          }}
          sx={{
            fontWeight: 400,
            fontSize: {
              xs: "14px",
              md: "16px",
            },
            marginBottom: "5px",
            width: "100%",
            display: "block",
          }}
          focused={editMode}
          autoFocus
          inputRef={textFieldRef}
          onFocus={handleFocus}
        />
      ) : (
        <Box
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "15px",
          }}
        >
          <MarkdownRender
            text={text}
            sx={{ fontSize: type === "title" ? "30px" : "" }}
          />
          {type === "title" && !openOntology.locked && (
            <Box sx={{ display: "flex", alignItems: "center" }}>
              {lockedOntology[type] &&
              user.uname !== lockedOntology[type].uname ? (
                <Tooltip title={"Locked"} sx={{ ml: "5px" }}>
                  <LockIcon />
                </Tooltip>
              ) : (
                <Tooltip title={editMode ? "Save" : "Edit"}>
                  <Button onClick={onSaveTextChange} sx={{ ml: "5px" }}>
                    {editMode ? "Save" : "Edit"}
                  </Button>
                </Tooltip>
              )}
              <Tooltip title={"Delete Ontology"} sx={{ ml: "5px" }}>
                <Button onClick={handleDeleteOntology} sx={{ ml: "5px" }}>
                  Delete
                </Button>
              </Tooltip>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default SubPlainText;
