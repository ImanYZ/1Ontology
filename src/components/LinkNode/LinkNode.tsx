/* 
## Overview

The `ChildNode` component is a React component that displays a child node within a larger ontology structure. It provides functionality for navigating to the child node, updating the user's current path within the ontology, and deleting the child node from the ontology.

## Props

The component accepts the following props:

- `child`: An object representing the child node to be displayed.
- `currentVisibleNode`: The currently visible node in the ontology.
- `sx`: An object containing style properties to be applied to the component.
- `type`: A string representing the type of the child node (e.g., "specializations").
- `setCurrentVisibleNode`: A function to update the state of the currently visible node.
- `setSnackbarMessage`: A function to display a message in a snackbar/notification.
- `category`: A string representing the category of the child node.
- `ontologyPath`: An array representing the path of nodes leading to the current node.
- `updateUserDoc`: A function to update the user's document with the new ontology path.
- `recordLogs`: A function to record logs for certain actions.
- `updateInheritance`: A function to update the inheritance of nodes.

## Functions


### removeChildNode

This function removes a child node from the given node's children. It iterates over the types and categories of children and removes the child node if it is found.

### deleteSubOntologyEditable

This asynchronous function is triggered when the user clicks the "Delete" button. It confirms the deletion with the user and, upon confirmation, deletes the child node from the ontology. It handles the deletion of the node from the Firestore database and updates the inheritance if necessary. It also records the deletion action in the logs.

## Rendering

The component renders a `Box` containing a `Link` and a `Button` within a `Tooltip`. The `Link` allows the user to navigate to the child node, and the `Button` provides the option to delete the child node. A `ConfirmDialog` is also included to confirm deletion actions.

## Usage

The `ChildNode` component is used within a larger application that manages an ontology structure. It is likely part of a list or tree view where each node can have child nodes. The component allows users to interact with these child nodes by navigating to them or removing them from the ontology.

## Example

```jsx
<ChildNode
  child={someChildNode}
  currentVisibleNode={currentNode}
  sx={{ margin: '10px' }}
  type="specializations"
  setCurrentVisibleNode={handleSetCurrentVisibleNode}
  setSnackbarMessage={handleSetSnackbarMessage}
  category="SomeCategory"
  ontologyPath={currentPath}
  recordLogs={handleRecordLogs}
  updateInheritance={handleUpdateInheritance}
/>
```

In this example, `ChildNode` is used to display a child node with the given properties and functions to handle various interactions.

## Notes

- The component assumes that the `NODES` collection and the necessary Firestore functions are correctly set up and available.
- The `useConfirmDialog` hook is used to manage confirmation dialogs for deletion actions.
- The component makes use of Material-UI components (`Box`, `Button`, `Link`, `Tooltip`) for styling and interaction.
- Error handling is implemented in the `deleteSubOntologyEditable` function, but it is important to ensure that proper error handling is in place throughout the application.
- The component does not directly mutate the state but uses provided functions to handle state changes, ensuring a unidirectional data flow.
 */
import { NODES } from " @components/lib/firestoreClient/collections";
import useConfirmDialog from " @components/lib/hooks/useConfirmDialog";
import {
  saveNewChange,
  unlinkPropertyOf,
} from " @components/lib/utils/helpers";
import { INode, INodePath, IChildNode } from " @components/types/INode";
import { Box, Button, Link, Tooltip, useTheme } from "@mui/material";
import {
  collection,
  doc,
  getDoc,
  getFirestore,
  updateDoc,
} from "firebase/firestore";

type ISubOntologyProps = {
  link: IChildNode;
  currentVisibleNode: INode;
  sx?: { [key: string]: any };
  property: string;
  setCurrentVisibleNode: (currentVisibleNode: any) => void;
  setSnackbarMessage: (message: any) => void;
  category: string;
  recordLogs: (logs: any) => void;
  updateInheritance: (parameters: {
    nodeId: string;
    updatedProperty: string;
  }) => void;
  navigateToNode: (nodeID: string) => void;
  title: string;
  nodes: any;
  index: number;
  deleteVisible: boolean;
  linkLocked: any;
  locked: boolean;
  user: any;
};

const LinkNode = ({
  link,
  sx,
  property,
  currentVisibleNode,
  category,
  recordLogs,
  updateInheritance,
  navigateToNode,
  title,
  nodes,
  index,
  deleteVisible,
  linkLocked,
  locked,
  user,
}: ISubOntologyProps) => {
  const db = getFirestore();
  const theme = useTheme();
  const BUTTON_COLOR = theme.palette.mode === "dark" ? "#373739" : "#dde2ea";
  const { confirmIt, ConfirmDialog } = useConfirmDialog();
  const handleNavigateToNode = () => {
    navigateToNode(link.id);
  };

  const unlinkNodeRelation = async () => {
    try {
      if (
        await confirmIt(
          `Are you sure you want remove this item the list?`,
          `Remove`,
          "Keep"
        )
      ) {
        const nodeDoc = await getDoc(
          doc(collection(db, NODES), currentVisibleNode.id)
        );
        if (nodeDoc.exists()) {
          const nodeData = nodeDoc.data() as INode;

          const nodeId = nodeData.inheritance[property].ref;
          if (nodeId) {
            const inheritedNode = nodes[nodeId as string];
            nodeData.properties[property] = JSON.parse(
              JSON.stringify(inheritedNode.properties[property])
            );
          }
          const previousValue = JSON.parse(
            JSON.stringify(nodeData.properties[property])
          );
          if (index !== -1) {
            nodeData.properties[property][category].splice(index, 1);
          }

          const shouldBeRemovedFromParent = !(
            Object.values(nodeData.properties[property]) as { id: string }[]
          )
            .flat()
            .some((c: { id: string }) => c.id === link.id);

          // const childDoc = await getDoc(doc(collection(db, NODES), child.id));
          // const childData = childDoc.data() as INode;
          if (shouldBeRemovedFromParent) {
            unlinkPropertyOf(db, property, currentVisibleNode.id, link.id);
          }

          await updateDoc(nodeDoc.ref, {
            [`properties.${property}.${category}`]:
              nodeData.properties[property][category],
          });
          if (property !== "isPartOf") {
            await updateDoc(nodeDoc.ref, {
              [`inheritance.${property}.ref`]: null,
            });

            updateInheritance({
              nodeId: nodeDoc.id,
              updatedProperty: property,
            });
          }
          saveNewChange(db, {
            nodeId: currentVisibleNode.id,
            modifiedBy: user?.uname,
            modifiedProperty: property,
            previousValue,
            newValue: nodeData.properties[property],
            modifiedAt: new Date(),
            changeType: "remove element",
            fullNode: currentVisibleNode,
          });
          recordLogs({
            action: "unlinked a node",
            property,
            unlinked: link.id,
            node: nodeDoc.id,
          });
        }
      }
    } catch (error) {
      console.error(error);
      await confirmIt(
        `There is an issue with deleting the node, please try again.`,
        `Ok`,
        ""
      );
    }
  };

  const removeNodeLink = async (
    type: "specializations" | "generalizations",
    removeNodeId: string,
    removeIdFrom: string
  ) => {
    const specOrGenDoc = await getDoc(doc(collection(db, NODES), removeIdFrom));
    let removeFrom: "specializations" | "generalizations" = "specializations";

    if (type === "specializations") {
      removeFrom = "generalizations";
    }
    if (specOrGenDoc.exists()) {
      const specOrGenData = specOrGenDoc.data() as INode;
      for (let cat in specOrGenData[removeFrom]) {
        specOrGenData[removeFrom][cat] = specOrGenData[removeFrom][cat].filter(
          (c: { id: string }) => c.id !== removeNodeId
        );
      }
      await updateDoc(specOrGenDoc.ref, {
        [`${removeFrom}`]: specOrGenData[removeFrom],
      });
    }
  };

  const unlinkSpecializationOrGeneralization = async () => {
    try {
      if (
        await confirmIt(
          `Are you sure you want unlink this node?`,
          "Unlink",
          "Keep"
        )
      ) {
        const nodeDoc = await getDoc(
          doc(collection(db, NODES), currentVisibleNode.id)
        );
        if (nodeDoc.exists()) {
          const nodeData = nodeDoc.data() as INode;
          const previousValue = JSON.parse(
            JSON.stringify(
              nodeData[property as "specializations" | "generalizations"]
            )
          );
          if (index !== -1) {
            nodeData[property as "specializations" | "generalizations"][
              category
            ].splice(index, 1);
          }

          const shouldBeRemovedFromParent = !Object.values(
            nodeData[property as "specializations" | "generalizations"]
          )
            .flat()
            .some((c: { id: string }) => c.id === link.id);

          if (shouldBeRemovedFromParent) {
            removeNodeLink(
              property as "specializations" | "generalizations",
              currentVisibleNode.id,
              link.id
            );
          }
          saveNewChange(db, {
            nodeId: currentVisibleNode.id,
            modifiedBy: user?.uname,
            modifiedProperty: property,
            previousValue,
            newValue:
              nodeData[property as "specializations" | "generalizations"],
            modifiedAt: new Date(),
            changeType: "remove element",
            fullNode: currentVisibleNode,
          });
          await updateDoc(nodeDoc.ref, nodeData);
        }
      }
    } catch (error) {
      console.error(error);
      await confirmIt(
        `There is an issue with deleting the node, please try again.`,
        `Ok`,
        ""
      );
    }
  };

  const handleUnlinkNode = () => {
    if (property === "specializations" || property === "generalizations") {
      unlinkSpecializationOrGeneralization();
    } else {
      unlinkNodeRelation();
    }
  };

  return (
    <Box sx={{ ...sx }}>
      <Box style={{ display: "flex", alignItems: "center" }}>
        <Link
          underline="hover"
          onClick={handleNavigateToNode}
          sx={{
            cursor: "pointer",
            color: (theme) =>
              link.change === "added"
                ? "green"
                : link.change === "removed"
                ? "red"
                : theme.palette.mode === "dark"
                ? theme.palette.common.gray50
                : theme.palette.common.notebookMainBlack,
          }}
        >
          {" "}
          {title}
        </Link>
        {deleteVisible && !locked && !linkLocked && (
          <Button
            sx={{
              ml: "8px",
              borderRadius: "25px",
              backgroundColor: BUTTON_COLOR,
            }}
            variant="outlined"
            onClick={handleUnlinkNode}
          >
            Unlink
          </Button>
        )}
      </Box>

      {ConfirmDialog}
    </Box>
  );
};

export default LinkNode;
