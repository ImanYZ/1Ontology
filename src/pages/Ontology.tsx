/* 
This React component named `Ontology` is a complex and feature-rich component that serves as a central part of an application dealing with ontological data. It provides a user interface for viewing and interacting with a hierarchical structure of ontologies, managing comments, and searching through ontology nodes. The component uses Firebase Firestore for data storage and retrieval, Fuse.js for search functionality, and Material-UI for styling and layout. It also includes markdown rendering capabilities and responsive design adjustments for mobile devices.

Here's a breakdown of the key parts of the component:

### Imports and Setup
- The component imports a variety of libraries and components, including Firebase Firestore functions, Material-UI components, Fuse.js for search, and custom components like `TreeViewSimplified`, `DAGGraph`, and `MarkdownRender`.
- It defines the `Ontology` functional component and sets up state variables for managing nodes, search results, comments, UI states, and more.

### Authentication and Routing
- The component checks if the user is authenticated and their email is verified. If not, it redirects to the sign-in page.
- It uses the `useRouter` hook from Next.js to handle routing within the application.

### Firestore Data Subscription
- The component sets up Firestore subscriptions to listen for changes in nodes, user data, and locked node fields, updating the component's state accordingly.

### Ontology Path Management
- Functions like `getPath` and `updateTheUrl` are used to construct and manage the path of the current ontology being viewed, which is reflected in the URL hash for easy sharing and navigation.

### Ontology Tree and DAG View
- The component provides two different visualizations for the ontology structure: a tree view and a directed acyclic graph (DAG) view. Users can switch between these views using tabs.

### Search Functionality
- The `searchWithFuse` function uses Fuse.js to perform a search on the ontology nodes based on the user's query.

### Comment Management
- The component allows users to add, edit, and delete comments on ontology nodes. It uses functions like `handleSendComment`, `deleteComment`, and `editComment` to manage comment interactions.

### Inheritance Updates
- The `updateInheritance` function recursively updates fields in the ontology hierarchy that are related to inheritance, ensuring that changes in parent nodes are reflected in child nodes.

### UI Components and Layout
- The component uses Material-UI components to create a responsive layout with a header, tabs, search bar, comment section, and markdown cheatsheet.
- It uses the `@column-resizer/react` library to allow users to resize sections of the layout.

### Effects and Callbacks
- The component uses `useEffect` hooks to handle side effects such as data fetching, URL hash changes, and Firestore subscriptions.
- Callback functions like `handleLinkNavigation`, `addNewNode`, and `saveChildNode` handle user interactions with the ontology structure.

### Higher-Order Component (HOC)
- The `withAuthUser` HOC is used to wrap the `Ontology` component, providing authentication checks and redirection logic.

### Return Statement
- The component conditionally renders the main content or a loading indicator based on whether the ontology nodes have been loaded.
- It returns a structured layout with a header, ontology visualizations, and a right panel for search and comments.

### Developer Comments
- Throughout the component, there are places where additional developer comments could be added to explain complex logic, the purpose of specific functions, and the reasoning behind certain design choices.

This component is a key part of the application, providing a rich interface for users to interact with ontological data. It demonstrates the use of React hooks, Firestore, and third-party libraries to create a dynamic and responsive user experience. */

import { Bar, Container, Resizer, Section } from "@column-resizer/react";
import SearchIcon from "@mui/icons-material/Search";
import SendIcon from "@mui/icons-material/Send";
import SettingsEthernetIcon from "@mui/icons-material/SettingsEthernet";
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Link,
  List,
  ListItem,
  Paper,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import Fuse from "fuse.js";
import moment from "moment";
import { createRef, useCallback, useEffect, useRef, useState } from "react";
import markdownContent from "../components/OntologyComponents/Markdown-Here-Cheatsheet.md";
import SneakMessage from " @components/components/OntologyComponents/SneakMessage";
import Node from " @components/components/OntologyComponents/Node";
import TreeViewSimplified from " @components/components/OntologyComponents/TreeViewSimplified";
import {
  ILockedNode,
  INode,
  INodePath,
  IChildNode,
  MainSpecializations,
  TreeVisual,
} from " @components/types/INode";
import { TabPanel, a11yProps } from " @components/lib/utils/TabPanel";
import MarkdownRender from " @components/components/Markdown/MarkdownRender";
import AppHeaderMemoized from " @components/components/Header/AppHeader";
import { newId } from " @components/lib/utils/newFirestoreId";
import { DESIGN_SYSTEM_COLORS } from " @components/lib/theme/colors";
import useConfirmDialog from " @components/lib/hooks/useConfirmDialog";
import withAuthUser from " @components/components/hoc/withAuthUser";
import { useAuth } from " @components/components/context/AuthContext";
import { useRouter } from "next/router";
import DAGGraph from " @components/components/OntologyComponents/DAGGraph";
import { formatFirestoreTimestampWithMoment } from " @components/lib/utils/utils";
import { NODES_TYPES } from " @components/lib/CONSTANTS";
import {
  LOCKS,
  LOGS,
  NODES,
  USERS,
} from " @components/lib/firestoreClient/collections";

const Ontology = () => {
  const db = getFirestore();
  const [{ emailVerified, user }] = useAuth();
  const router = useRouter();
  const isMobile = useMediaQuery("(max-width:599px)");

  const [nodes, setNodes] = useState<INode[]>([]);
  const [currentVisibleNode, setCurrentVisibleNode] = useState<any>(null);
  const [ontologyPath, setOntologyPath] = useState<INodePath[]>([]);
  const [snackbarMessage, setSnackbarMessage] = useState<string>("");
  const [treeVisualisation, setTreeVisualisation] = useState<TreeVisual>({});
  const [editNode, setEditNode] = useState<string>("");
  const [newComment, setNewComment] = useState("");
  const [updateComment, setUpdateComment] = useState("");
  const { confirmIt, ConfirmDialog } = useConfirmDialog();
  const [editingComment, setEditingComment] = useState("");
  const [lockedNodeFields, setlockedNodeFields] = useState<ILockedNode>({});
  const [value, setValue] = useState<number>(1);
  const [viewValue, setViewValue] = useState<number>(0);
  const [searchValue, setSearchValue] = useState("");
  const fuse = new Fuse(nodes, { keys: ["title"] });
  const headerRef = useRef<HTMLHeadElement | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [dagreZoomState, setDagreZoomState] = useState<any>(null);
  const [rightPanelVisible, setRightPanelVisible] = useState<any>(
    user?.rightPanel
  );
  const columnResizerRef = useRef<any>();
  useEffect(() => {
    // Check if a user is logged in
    if (user) {
      // Check if the user's email is verified
      if (!emailVerified) {
        // If the email is not verified, redirect to the sign-in page
        router.replace("/signin");
      }
    }
  }, [user, emailVerified]);

  /**
   * Constructs a path based on the provided array of ontology IDs.
   * @param newPath - An array of ontology IDs representing the desired path.
   * @returns An array containing objects with 'id' and 'title' properties, representing the ontology path.
   */
  const getPath = (newPath: string[]) => {
    // Initialize an empty array to store the constructed ontology path
    const ontologyPath = [];

    // Iterate through each ontology ID in the provided array
    for (let path of newPath) {
      // Find the index of the ontology with the current ID in the 'ontologies' array
      const nodeIdx = nodes.findIndex((onto: any) => onto.id === path);

      // Check if the ontology with the current ID was found
      if (nodeIdx !== -1) {
        // If found, add an object to the ontologyPath array with 'id' and 'title' properties
        ontologyPath.push({
          id: path,
          title: nodes[nodeIdx].plainText.title,
          category: nodes[nodeIdx].category,
        });
      }
      // If not found, the ontology with the current ID is skipped in the final path
    }

    // Return the constructed ontology path
    return ontologyPath;
  };

  // Function to generate a tree structure of specializations based on main ontologies
  const getSpecializationsTree = (_nodes: any, path: any) => {
    // Object to store the main specializations tree
    let newSpecializationsTree: any = {};
    // Iterate through each main nodes
    for (let node of _nodes) {
      const nodeTitle = node.plainText.title;
      // Create an entry for the current ontology in the main specializations tree
      newSpecializationsTree[nodeTitle] = {
        id: node.id,
        path: [...path, node.id],
        isCategory: !!node.category,
        title: nodeTitle,
        specializations: {},
      };

      // Iterate through each category in the Specializations sub-ontologies
      for (let category in node?.children?.Specializations) {
        // Filter ontologies based on the current category
        const specializations =
          nodes.filter((onto: any) => {
            const arrayNodes = node?.children?.Specializations[category].map(
              (o: any) => o.id
            );
            return arrayNodes.includes(onto.id);
          }) || [];

        // Check if the category is the main category
        if (category === "main") {
          // If main, update the main specializations entry with recursive call
          newSpecializationsTree[nodeTitle] = {
            id: node.id,
            path: [...path, node.id],
            isCategory: !!node.category,
            title: nodeTitle,
            specializations: {
              ...(newSpecializationsTree[nodeTitle]?.specializations || {}),
              ...getSpecializationsTree(specializations, [...path, node.id]),
            },
          };
        } else {
          // If not main, create a new entry for the category
          newSpecializationsTree[nodeTitle] = {
            id: node.id,
            path: [...path, node.id],
            title: nodeTitle,
            c: node.category,
            specializations: {
              ...(newSpecializationsTree[nodeTitle]?.specializations || {}),
              [category]: {
                isCategory: true,
                id: newId(db), // Assuming newId and db are defined elsewhere
                title: category,
                specializations: getSpecializationsTree(specializations, [
                  ...path,
                  node.id,
                ]),
              },
            },
          };
        }
      }
    }

    // Return the main specializations tree
    return newSpecializationsTree;
  };

  const recordLogs = async (logs: any) => {
    try {
      if (!user) return;
      const logRef = doc(collection(db, LOGS));
      await setDoc(logRef, {
        ...logs,
        createdAt: new Date(),
        doer: user?.uname,
      });
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    // Filter ontologies to get only those with a defined category
    const mainCategories = nodes.filter((node: any) => node.category);

    // Sort main ontologies based on a predefined order
    mainCategories.sort((nodeA: any, nodeB: any) => {
      const order = [
        "WHAT: Activities",
        "WHO: Actors",
        "HOW: Processes",
        "WHY: Evaluation",
      ];
      const nodeATitle = nodeA.plainText.title;
      const nodeBTitle = nodeA.plainText.title;
      return order.indexOf(nodeATitle) - order.indexOf(nodeBTitle);
    });
    // Generate a tree structure of specializations from the sorted main ontologies
    let treeOfSpecialisations = getSpecializationsTree(mainCategories, []);

    // Set the generated tree structure for visualization
    setTreeVisualisation(treeOfSpecialisations);
  }, [nodes]);
  const updateTheUrl = (path: INodePath[]) => {
    let newHash = "";
    path.forEach((p: any) => (newHash = newHash + `#${p.id.trim()}`));
    window.location.hash = newHash;
  };

  useEffect(() => {
    // Function to handle changes in the URL hash
    const handleHashChange = async () => {
      // Check if there is a hash in the URL
      if (window.location.hash) {
        // Call updateUserDoc with the hash split into an array
        updateUserDoc(window.location.hash.split("#"));
      }
    };

    // Add an event listener to the window for hash changes
    window.addEventListener("hashchange", handleHashChange);

    // Call handleHashChange immediately to handle any initial hash
    handleHashChange();

    // Clean up the event listener when the component is unmounted
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  useEffect(() => {
    // Check if user or ontologies are not available, then return early
    if (!user) return;
    if (!nodes.length) return;

    // Query the database for the user based on userId
    const userQuery = query(
      collection(db, USERS),
      where("userId", "==", user.userId)
    );

    // Set up a snapshot listener for changes in the user data
    const unsubscribeUser = onSnapshot(userQuery, (snapshot) => {
      // Get the first document change from the snapshot
      const docChange = snapshot.docChanges()[0];

      // Get the data from the document change
      const dataChange = docChange.doc.data();

      // Set the ontologyPath in the component state
      setOntologyPath(getPath(dataChange?.ontologyPath || []));

      // Update the URL based on the ontologyPath
      updateTheUrl(getPath(dataChange?.ontologyPath || []));

      // Get the last ontology in the ontologyPath or an empty string if none
      const lastOntology = dataChange?.ontologyPath?.reverse()[0] || "";

      // Find the index of the last ontology in the ontologies array
      const ontologyIdx = nodes.findIndex(
        (ontology: any) => ontology.id === lastOntology
      );

      // If the ontology is found, set it as the open ontology in the component state
      if (nodes[ontologyIdx]) setCurrentVisibleNode(nodes[ontologyIdx]);
    });

    // Cleanup function: Unsubscribe from the user data snapshot listener
    return () => unsubscribeUser();
  }, [db, user, nodes]);

  useEffect(() => {
    // Check if a user is logged in
    if (!user) return;
    setRightPanelVisible(!!user?.rightPanel);
    // Define the ontology query
    const ontologyQuery = query(
      collection(db, LOCKS),
      where("deleted", "==", false)
    );

    // Subscribe to changes in the ontologyLock collection
    const unsubscribeOntology = onSnapshot(ontologyQuery, (snapshot) => {
      // Get the document changes in the snapshot
      const docChanges = snapshot.docChanges();

      // Update the lockedOntology state based on the document changes
      setlockedNodeFields((lockedNode: ILockedNode) => {
        let _lockedNode = { ...lockedNode };

        // Iterate through each document change
        for (let change of docChanges) {
          const changeData: any = change.doc.data();

          // Handle removed documents
          if (
            change.type === "removed" &&
            _lockedNode.hasOwnProperty(changeData.ontology)
          ) {
            delete _lockedNode[changeData.ontology][changeData.field];
          }
          // Handle added documents
          else if (change.type === "added") {
            _lockedNode = {
              ..._lockedNode,
              [changeData.ontology]: {
                ..._lockedNode[changeData.ontology],
                [changeData.field]: {
                  id: change.doc.id,
                  ...changeData,
                },
              },
            };
          }
        }

        // Return the updated lockedOntology state
        return _lockedNode;
      });
    });

    // Unsubscribe from the ontologyLock collection when the component is unmounted
    return () => unsubscribeOntology();

    // Dependency array includes user and db, meaning the effect will re-run if user or db changes
  }, [user, db]);

  /* 
 // TO:DO: Load only the data that the user is currently navigating through, 
 to optimize for performance when the database get's larger
 */
  useEffect(() => {
    // Create a query for the NODES collection where "deleted" is false
    const ontologyQuery = query(
      collection(db, NODES),
      where("deleted", "==", false)
    );

    // Set up a snapshot listener to track changes in the ontology collection
    const unsubscribeOntology = onSnapshot(ontologyQuery, (snapshot) => {
      // Get the changes (added, modified, removed) in the snapshot
      const docChanges = snapshot.docChanges();

      // Update the state based on the changes in the ontology collection
      setNodes((nodes: INode[]) => {
        const _nodes = [...nodes];

        // Loop through each change in the snapshot
        for (let change of docChanges) {
          const changeData: any = change.doc.data();

          // Find the index of the document in the current state
          const previousIdx = _nodes.findIndex((d) => d.id === change.doc.id);

          // Check the type of change and update the state accordingly
          if (change.type === "removed" && previousIdx !== -1) {
            // If the document is removed, remove it from the state
            _nodes.splice(previousIdx, 1);
          } else if (previousIdx !== -1) {
            // If the document is modified, update its data in the state
            _nodes[previousIdx] = { id: change.doc.id, ...changeData };
          } else {
            // If the document is added, add it to the state
            _nodes.push({
              id: change.doc.id,
              ...changeData,
            });
          }
        }

        // Return the updated state
        return _nodes;
      });
    });

    // Unsubscribe from the snapshot listener when the component is unmounted
    return () => unsubscribeOntology();

    // TO:DO: Load only the data that the user is currently navigating through, optimize for performance
  }, [db]);

  // Function to get the parent ID based on the ontology type
  const getParent = (type: string) => {
    if (type === "Evaluation") {
      return treeVisualisation["WHY: Evaluation"].id;
    } else if (type === "Actor") {
      return treeVisualisation["WHO: Actors"].id;
    } else if (type === "Process") {
      return treeVisualisation["HOW: Processes"].id;
    }
  };

  // Callback function to handle navigation when a link is clicked
  const handleLinkNavigation = useCallback(
    async (path: { id: string; title: string }, type: string) => {
      try {
        // Check if user is logged in and ontology is open
        if (!user || !currentVisibleNode) return;

        // Check if the clicked ontology is already in the ontologies list
        if (
          nodes
            .filter((ontology: any) => ontology.category)
            .map((o: any) => o.title)
            .includes(path.title)
        )
          return;

        // Find index of the clicked ontology in the ontologies array
        const ontologyIndex = nodes.findIndex(
          (ontology: any) => ontology.id === path.id
        );

        // Update the open ontology or add a new ontology if not in the list
        if (ontologyIndex !== -1) {
          setCurrentVisibleNode(nodes[ontologyIndex]);
        } else {
          const parent = getParent(NODES_TYPES[type].nodeType);
          const parentSet: any = new Set([currentVisibleNode.id, parent]);
          const parents = [...parentSet];
          const newNode = NODES_TYPES[type];
          addNewNode({
            id: path.id,
            newNode: { parents, ...newNode },
          });
          setCurrentVisibleNode({ id: path.id, ...newNode, parents });
        }

        // Update ontology path and user document
        let _ontologyPath = [...ontologyPath];
        const pathIdx = _ontologyPath.findIndex((p: any) => p.id === path.id);
        if (pathIdx !== -1) {
          _ontologyPath = _ontologyPath.slice(0, pathIdx + 1);
        } else {
          _ontologyPath.push(path);
        }

        await updateUserDoc([..._ontologyPath.map((onto) => onto.id)]);
      } catch (error) {
        console.error(error);
      }
    },
    [nodes, ontologyPath]
  );

  // Function to update the user document with the current ontology path
  const updateUserDoc = async (ontologyPath: string[]) => {
    if (!user) return;

    // Query to get the user document
    const userQuery = query(
      collection(db, USERS),
      where("userId", "==", user.userId)
    );
    const userDocs = await getDocs(userQuery);
    const userDoc = userDocs.docs[0];

    // Update the user document with the ontology path
    await updateDoc(userDoc.ref, { ontologyPath });

    // Record logs if ontology path is not empty
    if (ontologyPath.length > 0) {
      await recordLogs({
        action: "Opened a page",
        page: ontologyPath[ontologyPath.length - 1],
      });
    }
  };

  // Callback function to add a new ontology to the database
  const addNewNode = useCallback(
    async ({ id, newNode }: { id: string; newNode: any }) => {
      try {
        // Reference to the new ontology document
        const newOntologyRef = doc(collection(db, NODES), id);
        // Set the document with the new ontology data
        await setDoc(newOntologyRef, {
          ...newNode,
          deleted: false,
          createdAt: new Date(),
        });

        // Record logs for the created ontology
        await recordLogs({
          action: "Created a field",
          field: newNode.nodeType,
        });

        // Set the newly created ontology as editable
        setEditNode(id);
      } catch (error) {
        console.error(error);
      }
    },
    [nodes]
  );

  // This function adds a sub-ontology to a parent ontology in a Firestore database.
  // It takes the type and id of the sub-ontology as parameters.

  const addChildToParentNode = async (type: string, id: string) => {
    // Get the ID of the parent ontology based on the provided type.
    const parentId = getParent(type);

    // Check if a parent ID exists.
    if (parentId) {
      // Find the parent ontology in the ontologies array.
      const parent: any = nodes.find((node: any) => node.id === parentId);

      // Get a reference to the parent ontology in Firestore.
      const nodeRef = doc(collection(db, NODES), parentId);

      // Extract the Specializations array from the parent ontology.
      const specializations = parent.children.Specializations;

      // Find the index of the sub-ontology in the Specializations array.
      const specializationIdx = parent.children.Specializations.findIndex(
        (spcial: any) => spcial.id === id
      );

      // If the sub-ontology is not already in the array, add it.
      if (specializationIdx === -1) {
        specializations.push({
          id,
          title: "",
        });
      }

      // Update the Specializations array in the parent ontology.
      parent.children.Specializations = specializations;

      // Update the parent ontology in Firestore with the modified data.
      await updateDoc(nodeRef, { ...parent, updatedAt: new Date() });
    }
  };

  // Define a callback function to handle the opening of the ontology DAGRE view.
  const onOpenOntologyDagre = useCallback(
    async (ontologyId: string) => {
      // Check if a user is logged in, if not, exit the function.
      if (!user) return;

      // Find the index of the ontology with the specified ID in the ontologies array.
      const nodeIdx = nodes.findIndex((onto: any) => onto.id === ontologyId);

      // Filter out main ontologies (ontologies with a category).
      const mainNodes = nodes.filter((node: any) => node.category);

      // Initialize an object to store the path of each ontology in the DAGRE view.
      let eachOntologyPath = findOntologyPath({
        mainNodes,
        path: [],
        eachOntologyPath: {},
      });

      // Check if the ontology with the specified ID exists and is not a main ontology (no category).
      if (nodeIdx !== -1 && !nodes[nodeIdx].category) {
        // Set the opened ontology as the currently selected ontology.
        setCurrentVisibleNode(nodes[nodeIdx]);

        // Record logs for the action of opening the DAGRE view for the ontology.
        await recordLogs({
          action: "opened dagre-view",
          itemClicked: nodes[nodeIdx].id,
        });

        // Update the user document with the ontology path.
        await updateUserDoc([
          ...(eachOntologyPath[ontologyId] || [ontologyId]),
        ]);
      }
    },
    // Dependency array includes ontologies and user, ensuring the function re-renders when these values change.
    [nodes, user]
  );

  // Function to handle opening ontology tree
  const onOpenOntologyTree = useCallback(
    async (ontologyId: string, path: string[]) => {
      // Check if user is logged in
      if (!user) return;
      //update the expanded state
      setExpandedNodes((prevExpanded: Set<string>) => {
        prevExpanded.add(ontologyId);
        return prevExpanded;
      });
      // Find the index of the ontology in the ontologies array
      const nodeIdx = nodes.findIndex((onto: any) => onto.id === ontologyId);

      // Check if ontology exists and has a category
      if (nodeIdx !== -1 && !nodes[nodeIdx].category) {
        // Set the currently open ontology
        setCurrentVisibleNode(nodes[nodeIdx]);

        // Record logs for the action of clicking the tree-view
        await recordLogs({
          action: "clicked tree-view",
          itemClicked: nodes[nodeIdx].id,
        });

        // Update user document with the path
        await updateUserDoc(path);
      }
    },
    [nodes, user]
  );

  // Function to order comments based on their creation timestamp
  const orderComments = () => {
    return (currentVisibleNode?.comments || []).sort((a: any, b: any) => {
      const timestampA: any = a.createdAt.toDate();
      const timestampB: any = b.createdAt.toDate();
      return timestampA - timestampB;
    });
  };

  // Function to retrieve main specializations from tree visualization data
  const getMainSpecialisations = (treeVisualisation: TreeVisual) => {
    let mainSpecializations: MainSpecializations = {};

    // Loop through categories in tree visualization
    for (let category in treeVisualisation) {
      mainSpecializations = {
        ...mainSpecializations,
        ...treeVisualisation[category].specializations,
      };
    }

    // Include specializations for "Actor" category
    mainSpecializations = {
      ...mainSpecializations,
      ...(mainSpecializations["Actor"]?.specializations || {}),
    };

    return mainSpecializations;
  };

  // Function to perform a search using Fuse.js library
  const searchWithFuse = (query: string): any => {
    // Return an empty array if the query is empty
    if (!query) {
      return [];
    }

    // Record logs for the search action
    recordLogs({
      action: "Searched",
      query,
    });

    // Perform search using Fuse.js, filter out deleted items
    return fuse
      .search(query)
      .map((result) => result.item)
      .filter((item: any) => !item.deleted);
  };

  // This function handles the process of sending a new comment to an ontology.
  const handleSendComment = async () => {
    try {
      // Check if user or openOntology is not available, exit the function.
      if (!user || !currentVisibleNode) return;

      // Retrieve the document for the current ontology using its ID.
      const ontologyDoc = await getDoc(
        doc(collection(db, NODES), currentVisibleNode.id)
      );
      // Extract existing ontology data or default to an empty object.
      const ontologyData = ontologyDoc.data();

      // Extract existing comments from the ontology data or initialize as an empty array.
      const comments = ontologyData?.comments || [];

      // Add a new comment to the comments array.
      comments.push({
        id: newId(db),
        content: newComment,
        sender: (user.fName || "") + " " + user.lName,
        senderImage: user.imageUrl,
        senderUname: user.uname,
        createdAt: new Date(),
      });

      // Update the ontology document with the new comments array.
      await updateDoc(ontologyDoc.ref, { comments });

      // Record the comment action in the application logs.
      await recordLogs({
        action: "Commented",
        comment: newComment,
        ontology: ontologyDoc.id,
      });

      // Clear the newComment state after successfully sending the comment.
      setNewComment("");
    } catch (error) {
      // Handle any errors that may occur during the process and log them.
      console.error(error);
    }
  };

  // Function to delete a comment by its ID
  const deleteComment = async (commentId: string) => {
    try {
      // Check if there is an open ontology
      if (!currentVisibleNode) return;

      // If the comment being edited matches the comment to delete, reset editing state and return
      if (editingComment === commentId) {
        setEditingComment("");
        setUpdateComment("");
        return;
      }

      // Confirm deletion with the user
      if (
        await confirmIt(
          "Are you sure you want to delete the comment?",
          "Delete Comment",
          "Keep Comment"
        )
      ) {
        // Retrieve the ontology document from the database
        const ontologyDoc = await getDoc(
          doc(collection(db, NODES), currentVisibleNode.id)
        );
        const ontologyData = ontologyDoc.data();

        // Retrieve and filter out the comment to be deleted
        let comments = ontologyData?.comments || [];
        const removedComment = comments.filter((c: any) => c.id === commentId);
        comments = comments.filter((c: any) => c.id !== commentId);

        // Update the ontology document with the modified comments
        await updateDoc(ontologyDoc.ref, { comments });

        // Record the deletion action in the logs
        await recordLogs({
          action: "Comment Deleted",
          comment: removedComment,
          ontology: currentVisibleNode.id,
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Function to edit a comment
  const editComment = async (comment: any) => {
    try {
      // Check if there is an open ontology and the comment matches the editing state
      if (comment.id === editingComment && currentVisibleNode) {
        // Retrieve the ontology document from the database
        const nodeDoc = await getDoc(
          doc(collection(db, NODES), currentVisibleNode.id)
        );
        const nodeData = nodeDoc.data();

        // Retrieve and update the comment content
        let comments = nodeData?.comments || [];
        const commentIdx = comments.findIndex((c: any) => c.id == comment.id);

        // Record the modification action in the logs
        recordLogs({
          action: "Comment Modified",
          previousValue: comments[commentIdx].content,
          newValue: updateComment,
        });

        // Update the comment content and reset the editing state
        comments[commentIdx].content = updateComment;
        setEditingComment("");
        await updateDoc(nodeDoc.ref, { comments });

        // Reset additional state variables
        setUpdateComment("");
        setNewComment("");
        return;
      }

      // If not in editing state, set the comment as the one being edited
      setEditingComment(comment.id);
      setUpdateComment(comment.content);
    } catch (error) {
      console.error(error);
    }
  };

  const handleChange = (event: any, newValue: number) => {
    setValue(newValue);
  };

  const handleViewChange = (event: any, newValue: number) => {
    setViewValue(newValue);
  };

  // This function finds the path of a node in a nested structure of mainNodes and their children.
  const findOntologyPath = useCallback(
    ({ mainNodes, path, currentPath }: any) => {
      // Loop through each main node
      for (let ontology of mainNodes) {
        // Update the path for the current node
        currentPath[ontology.id] = [...path, ontology.id];

        // Loop through categories in the children of the current ontology
        for (let category in ontology?.children?.Specializations) {
          // Filter ontologies based on their inclusion in the Specializations of the current category
          const specializations =
            nodes.filter((onto: any) => {
              const arrayOntologies = ontology?.children?.Specializations[
                category
              ].map((o: any) => o.id);
              return arrayOntologies.includes(onto.id);
            }) || [];

          // Recursively call the findOntologyPath function for the filtered specializations
          currentPath = findOntologyPath({
            mainNodes: specializations,
            path: [...path, ontology.id],
            currentPath,
          });
        }
      }

      // Return the accumulated ontology paths
      return currentPath;
    },
    [nodes]
  );

  // This function is called when a search result ontology is clicked.
  const openSearchOntology = (ontology: any) => {
    try {
      // Set the clicked ontology as the open ontology
      setCurrentVisibleNode(ontology);

      // Record the click action in logs
      recordLogs({
        action: "Search result clicked",
        clicked: ontology.id,
      });

      // Filter main ontologies based on the presence of a category
      const mainNodes = nodes.filter((ontology: any) => ontology.category);

      // Initialize eachOntologyPath with an empty object and find the ontology path
      let eachOntologyPath = findOntologyPath({
        mainNodes,
        path: [],
        eachOntologyPath: {},
      });

      // Update the user document with the ontology path
      updateUserDoc([...(eachOntologyPath[ontology.id] || [ontology.id])]);
    } catch (error) {
      console.error(error);
    }
  };

  /**
   * Recursively updates the inheritance-related fields in a hierarchy of ontologies.
   *
   * @param updatedNode - The root ontology that needs to be updated.
   * @param updatedField - The field that is being updated (e.g., "title", "description").
   * @param type - The type of ontology being updated ("children" or "plainText").
   * @param newValue - The new value for the specified field.
   * @param ancestorTitle - The new title for the ancestor ontology.
   */
  const updateInheritance = ({
    updatedNode,
    updatedField,
    type,
    newValue,
    ancestorTitle,
  }: {
    updatedNode: INode;
    updatedField: string;
    type: "children" | "plainText";
    newValue: any;
    ancestorTitle: string;
  }) => {
    // Get the ID of the current ontology and initialize an array to store child ontology IDs.
    const parentId = updatedNode.id;
    const children: string[] = Object.values(
      updatedNode.children.Specializations
    ).map((child: any) => child.id);

    // Loop through all the children and update the corresponding field.
    for (let childId of children) {
      const ontologyIdx = nodes.findIndex((o: INode) => o.id == childId);

      // Check if the child ontology exists in the ontologies array.
      if (ontologyIdx !== -1) {
        const currentNode: INode = nodes[ontologyIdx];
        const ontoRef = doc(collection(db, NODES), childId);

        // Check if the current ontology has inheritance information.
        if (currentNode.inheritance) {
          if (updatedField === "title") {
            // Update the ancestor title in the inheritance information.
            for (let inheritanceType in currentNode.inheritance) {
              const inheritanceFields =
                currentNode.inheritance[inheritanceType];
              for (let field in inheritanceFields) {
                const inheritance: { ref: string; title: string } =
                  inheritanceFields[field];
                if (inheritance.ref && inheritance.ref == parentId) {
                  inheritance.title = ancestorTitle;
                }
              }
            }
          } else {
            // Update the specified field in the inheritance information.
            const inheritance = currentNode.inheritance[type][updatedField];
            if (
              inheritance &&
              inheritance?.ref &&
              inheritance.ref == parentId
            ) {
              inheritance.title = ancestorTitle;
              currentNode[type][updatedField] = newValue;
            }
          }

          // Update the ontology document in the Firestore database.
          updateDoc(ontoRef, currentNode);

          // Recursive call to update the children of the current ontology.
          // It is safe to call this even if the current ontology doesn't have children.
          updateInheritance({
            updatedNode: currentNode,
            updatedField,
            type,
            newValue,
            ancestorTitle,
          });
        }
      }
    }
  };
  useEffect(() => {
    const controller = columnResizerRef.current;
    if (controller) {
      const resizer = controller.getResizer();
      resizer.resizeSection(2, { toSize: rightPanelVisible ? 400 : 0 });
      controller.applyResizer(resizer);
    }
  }, [rightPanelVisible, user]);
  return (
    <Box>
      {nodes.length > 0 ? (
        <Container
          style={{ marginTop: "80px" }}
          columnResizerRef={columnResizerRef}
        >
          {!isMobile && (
            <Section minSize={0} defaultSize={500}>
              <Tabs
                value={viewValue}
                onChange={handleViewChange}
                sx={{
                  width: "100%",
                  borderColor: "divider",
                  borderBottom: 1,
                  backgroundColor: (theme) =>
                    theme.palette.mode === "dark"
                      ? DESIGN_SYSTEM_COLORS.notebookG450
                      : DESIGN_SYSTEM_COLORS.gray300,
                }}
              >
                <Tab
                  label="Tree View"
                  {...a11yProps(0)}
                  sx={{ width: "50%" }}
                />
                <Tab label="DAG View" {...a11yProps(1)} sx={{ width: "50%" }} />
              </Tabs>
              <Box sx={{ overflow: "auto", height: "94vh" }}>
                <TabPanel value={viewValue} index={0} sx={{ mt: "5px" }}>
                  <TreeViewSimplified
                    treeVisualisation={treeVisualisation}
                    onOpenOntologyTree={onOpenOntologyTree}
                    expandedOntologies={expandedNodes}
                  />
                </TabPanel>
                <TabPanel value={viewValue} index={1}>
                  <DAGGraph
                    treeVisualisation={treeVisualisation}
                    setExpandedOntologies={setExpandedNodes}
                    expandedOntologies={expandedNodes}
                    setDagreZoomState={setDagreZoomState}
                    dagreZoomState={dagreZoomState}
                    onOpenOntologyDagre={onOpenOntologyDagre}
                  />
                </TabPanel>
              </Box>
            </Section>
          )}
          <Bar
            size={2}
            style={{
              background: "currentColor",
              cursor: "col-resize",
              position: "relative",
            }}
          >
            <SettingsEthernetIcon
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                color: "white",
              }}
            />
          </Bar>
          <Section minSize={0}>
            <Box
              sx={{
                backgroundColor: (theme) =>
                  theme.palette.mode === "dark"
                    ? theme.palette.common.notebookMainBlack
                    : theme.palette.common.gray50,
                p: "20px",
                overflow: "auto",
                height: "94vh",
              }}
            >
              <Breadcrumbs sx={{ ml: "40px" }}>
                {ontologyPath.map((path) => (
                  <Link
                    underline={path.category ? "none" : "hover"}
                    key={path.id}
                    onClick={() => {
                      if (!path.category) handleLinkNavigation(path, "");
                    }}
                    sx={{
                      cursor: !path.category ? "pointer" : "",
                      ":hover": {
                        cursor: !path.category ? "pointer" : "",
                      },
                    }}
                  >
                    {path.title.split(" ").splice(0, 3).join(" ") +
                      (path.title.split(" ").length > 3 ? "..." : "")}
                  </Link>
                ))}
              </Breadcrumbs>

              {currentVisibleNode && (
                <Node
                  currentVisibleNode={currentVisibleNode}
                  setCurrentVisibleNode={setCurrentVisibleNode}
                  handleLinkNavigation={handleLinkNavigation}
                  setOntologyPath={setOntologyPath}
                  ontologyPath={ontologyPath}
                  setSnackbarMessage={setSnackbarMessage}
                  updateUserDoc={updateUserDoc}
                  user={user}
                  mainSpecializations={getMainSpecialisations(
                    treeVisualisation
                  )}
                  nodes={nodes}
                  addNewNode={addNewNode}
                  NODES_TYPES={NODES_TYPES}
                  editNode={editNode}
                  setEditOntology={setEditNode}
                  lockedNodeFields={lockedNodeFields}
                  recordLogs={recordLogs}
                  updateInheritance={updateInheritance}
                />
              )}
            </Box>
          </Section>

          <Bar
            size={2}
            style={{
              background: "currentColor",
              cursor: "col-resize",
              position: "relative",
              display: rightPanelVisible ? "block" : "none",
            }}
          >
            <SettingsEthernetIcon
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                color: "white",
              }}
            />
          </Bar>

          {!isMobile && (
            <Section minSize={0} defaultSize={400}>
              <Box
                sx={{
                  borderBottom: 1,
                  borderColor: "divider",
                  position: "sticky",
                }}
              >
                <Tabs
                  value={value}
                  onChange={handleChange}
                  aria-label="basic tabs example"
                >
                  <Tab label="Search" {...a11yProps(1)} />
                  <Tab label="Comments" {...a11yProps(0)} />
                  <Tab label="Markdown Cheatsheet" {...a11yProps(2)} />
                </Tabs>
              </Box>
              <Box
                sx={{
                  padding: "10px",
                  height: "89vh",
                  overflow: "auto",
                  pb: "125px",
                }}
              >
                <TabPanel value={value} index={0}>
                  <Box sx={{ pl: "10px" }}>
                    <TextField
                      variant="standard"
                      placeholder="Search..."
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                      fullWidth
                      InputProps={{
                        startAdornment: (
                          <IconButton
                            sx={{ mr: "5px", cursor: "auto" }}
                            color="primary"
                            edge="end"
                          >
                            <SearchIcon />
                          </IconButton>
                        ),
                      }}
                      autoFocus
                      sx={{
                        p: "8px",
                        mt: "5px",
                      }}
                    />
                    <List>
                      {searchWithFuse(searchValue).map((ontology: any) => (
                        <ListItem
                          key={ontology.id}
                          onClick={() => openSearchOntology(ontology)}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            color: "white",
                            cursor: "pointer",
                            borderRadius: "4px",
                            padding: "8px",
                            transition: "background-color 0.3s",
                            // border: "1px solid #ccc",
                            mt: "5px",
                            "&:hover": {
                              backgroundColor: (theme) =>
                                theme.palette.mode === "dark"
                                  ? DESIGN_SYSTEM_COLORS.notebookG450
                                  : DESIGN_SYSTEM_COLORS.gray200,
                            },
                          }}
                        >
                          <Typography>{ontology.title}</Typography>
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                </TabPanel>
                <TabPanel value={value} index={1}>
                  <Box sx={{ display: "flex", flexDirection: "column" }}>
                    <Box>
                      {orderComments().map((comment: any) => (
                        <Paper
                          key={comment.id}
                          elevation={3}
                          sx={{ mt: "15px" }}
                        >
                          <Box
                            sx={{
                              // mb: "15px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              p: "18px",
                              pb: "0px",
                            }}
                          >
                            <Box sx={{ display: "flex", alignItems: "center" }}>
                              <Avatar src={comment.senderImage} />
                              <Box
                                sx={{
                                  display: "flex",
                                  flexDirection: "column",
                                  ml: "5px",
                                }}
                              >
                                <Typography
                                  sx={{ ml: "4px", fontSize: "14px" }}
                                >
                                  {comment.sender}
                                </Typography>
                                <Typography
                                  sx={{ ml: "4px", fontSize: "12px" }}
                                >
                                  {formatFirestoreTimestampWithMoment(
                                    comment.createdAt
                                  )}
                                </Typography>
                              </Box>
                            </Box>

                            {comment.senderUname === user?.uname && (
                              <Box
                                sx={{
                                  display: "flex",
                                  justifyContent: "flex-end",
                                }}
                              >
                                <Button onClick={() => editComment(comment)}>
                                  {comment.id === editingComment
                                    ? "Save"
                                    : "Edit"}
                                </Button>
                                <Button
                                  onClick={() => deleteComment(comment.id)}
                                >
                                  {" "}
                                  {comment.id === editingComment
                                    ? "Cancel"
                                    : "Delete"}
                                </Button>
                              </Box>
                            )}
                          </Box>
                          <Box>
                            {comment.id === editingComment ? (
                              <Box sx={{ pr: "12px", pl: "12px", pb: "18px" }}>
                                <TextField
                                  variant="outlined"
                                  multiline
                                  fullWidth
                                  value={updateComment}
                                  onChange={(e: any) => {
                                    setUpdateComment(e.target.value);
                                  }}
                                  autoFocus
                                />
                              </Box>
                            ) : (
                              <Box sx={{ p: "18px" }}>
                                <MarkdownRender text={comment.content} />
                              </Box>
                            )}
                          </Box>
                        </Paper>
                      ))}
                      <Paper elevation={3} sx={{ mt: "15px" }}>
                        <TextField
                          variant="outlined"
                          multiline
                          fullWidth
                          placeholder="Add a Comment..."
                          value={newComment}
                          onChange={(e: any) => {
                            setNewComment(e.target.value);
                          }}
                          InputProps={{
                            endAdornment: (
                              <Tooltip title={"Share"}>
                                <IconButton
                                  color="primary"
                                  onClick={handleSendComment}
                                  edge="end"
                                >
                                  <SendIcon />
                                </IconButton>
                              </Tooltip>
                            ),
                          }}
                          autoFocus
                          sx={{
                            p: "8px",
                            mt: "5px",
                          }}
                        />
                      </Paper>
                    </Box>{" "}
                  </Box>
                </TabPanel>
                <TabPanel value={value} index={2}>
                  <Box
                    sx={{
                      p: "18px",
                      backgroundColor: (theme) =>
                        theme.palette.mode === "dark" ? "" : "gray",
                    }}
                  >
                    <MarkdownRender text={markdownContent} />
                  </Box>
                </TabPanel>
              </Box>
            </Section>
          )}
          {ConfirmDialog}
          <SneakMessage
            newMessage={snackbarMessage}
            setNewMessage={setSnackbarMessage}
          />
        </Container>
      ) : (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
            flexDirection: "column",
          }}
        >
          <CircularProgress />
          {/* <br /> */}
          <Typography sx={{ mt: "5px" }}> Loading...</Typography>
        </Box>
      )}
      <Box sx={{ position: "absolute", top: 0, width: "100%" }}>
        <AppHeaderMemoized
          ref={headerRef}
          setRightPanelVisible={setRightPanelVisible}
          rightPanelVisible={rightPanelVisible}
          loading={nodes.length === 0}
          confirmIt={confirmIt}
        />
      </Box>
    </Box>
  );
};
export default withAuthUser({
  shouldRedirectToLogin: true,
  shouldRedirectToHomeIfAuthenticated: false,
})(Ontology);
