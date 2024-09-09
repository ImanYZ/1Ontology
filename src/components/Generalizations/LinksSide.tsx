import React from "react";
import {
  Box,
  Button,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  Tooltip,
  Paper,
} from "@mui/material";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { capitalizeFirstLetter } from " @components/lib/utils/string.utils";
import { INode } from " @components/types/INode";
import ChildNode from "../OntologyComponents/ChildNode";
import { DESIGN_SYSTEM_COLORS } from " @components/lib/theme/colors";

type ILinksSideProps = {
  properties: { [key: string]: any };
  currentVisibleNode: INode;
  showList: any;
  setOpenAddCategory: any;
  setType: any;
  handleSorting: any;
  handleEditCategory: any;
  deleteCategory: any;
  navigateToNode: any;
  recordLogs: any;
  setSnackbarMessage: any;
  setCurrentVisibleNode: any;
  updateInheritance: any;
  relationType: "generalizations" | "specializations";
  nodes: INode[];
};

const LinksSide = ({
  currentVisibleNode,
  showList,
  setOpenAddCategory,
  setType,
  handleSorting,
  handleEditCategory,
  deleteCategory,
  navigateToNode,
  recordLogs,
  setSnackbarMessage,
  setCurrentVisibleNode,
  updateInheritance,
  relationType,
  nodes,
}: ILinksSideProps) => {
  const properties = currentVisibleNode[relationType];
  const getNumOfGeneralizations = (id: string) => {
    const index = nodes.findIndex((d) => d.id === id);
    return index !== -1
      ? Object.values(nodes[index]?.generalizations || {}).flat().length
      : 0;
  };
  return (
    <Box sx={{ p: "13px", width: "500px" /* , height: "100vh" */ }}>
      <Box>
        <Box
          sx={{
            alignItems: "center",
            display: "flex",
            gap: "15px",
          }}
        >
          <Button
            onClick={() => showList(relationType, "main")}
            sx={{ px: 1, py: 0 }}
            variant="outlined"
          >
            {"Add "}
            {capitalizeFirstLetter(relationType)}
          </Button>

          <Button
            onClick={() => {
              setOpenAddCategory(true);
              setType(relationType);
            }}
            sx={{ px: 1, py: 0 }}
            variant="outlined"
          >
            Add Category
          </Button>
        </Box>

        {/* List of categories within the property */}
        <DragDropContext onDragEnd={(e) => handleSorting(e, relationType)}>
          <ul style={{ padding: "15px", paddingTop: 0 }}>
            {Object.keys(properties)
              .sort((a, b) =>
                a === "main" ? -1 : b === "main" ? 1 : a.localeCompare(b)
              )
              .map((category: string, index: number) => {
                const children: {
                  id: string;
                  title: string;
                }[] = properties[category] || [];
                const showGap =
                  Object.keys(properties).filter(
                    (c) => (properties[c] || []).length > 0 && c !== "main"
                  ).length > 0;
                return (
                  <Box key={category} id={category}>
                    {category !== "main" && (
                      <li>
                        <Box
                          sx={
                            {
                              /*    display: "flex",
                            alignItems: "center", */
                            }
                          }
                        >
                          <Typography
                            sx={{
                              fontWeight: "bold",
                              pt: index !== 0 ? "25px" : "",
                            }}
                          >
                            {category} :
                          </Typography>{" "}
                          <Button
                            onClick={() => showList(relationType, category)}
                          >
                            {"Select"} {relationType}
                          </Button>
                          <Button
                            onClick={() =>
                              handleEditCategory(relationType, category)
                            }
                          >
                            Edit
                          </Button>
                          <Button
                            onClick={() =>
                              deleteCategory(relationType, category)
                            }
                          >
                            Delete
                          </Button>
                        </Box>
                      </li>
                    )}

                    {(children.length > 0 || showGap) && (
                      <List sx={{ p: 0 }}>
                        <Droppable droppableId={category} type="CATEGORY">
                          {(provided, snapshot) => (
                            <Box
                              {...provided.droppableProps}
                              ref={provided.innerRef}
                              sx={{
                                backgroundColor: (theme) =>
                                  theme.palette.mode === "dark"
                                    ? snapshot.isDraggingOver
                                      ? DESIGN_SYSTEM_COLORS.notebookG450
                                      : ""
                                    : snapshot.isDraggingOver
                                    ? DESIGN_SYSTEM_COLORS.gray250
                                    : "",
                                borderRadius: "25px",
                                userSelect: "none",
                                p: 0.3,
                              }}
                            >
                              {children.map((child, index) => (
                                <Draggable
                                  key={child.id}
                                  draggableId={child.id}
                                  index={index}
                                >
                                  {(provided) => (
                                    <ListItem
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      sx={{ m: 0, p: 0, mt: "14px" }}
                                    >
                                      <ListItemIcon sx={{ minWidth: 0 }}>
                                        <DragIndicatorIcon />
                                      </ListItemIcon>
                                      <ChildNode
                                        navigateToNode={navigateToNode}
                                        recordLogs={recordLogs}
                                        setSnackbarMessage={setSnackbarMessage}
                                        currentVisibleNode={currentVisibleNode}
                                        setCurrentVisibleNode={
                                          setCurrentVisibleNode
                                        }
                                        sx={{}}
                                        child={child}
                                        type={relationType}
                                        category={category}
                                        updateInheritance={updateInheritance}
                                        deleteVisible={
                                          relationType !== "generalizations" &&
                                          Object.values(properties).flat()
                                            .length !== 1 &&
                                          relationType === "specializations" &&
                                          getNumOfGeneralizations(child.id) !==
                                            1
                                        }
                                      />
                                    </ListItem>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </Box>
                          )}
                        </Droppable>
                      </List>
                    )}
                  </Box>
                );
              })}
          </ul>
        </DragDropContext>
      </Box>
    </Box>
  );
};

export default LinksSide;
