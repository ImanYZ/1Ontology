import React, { useCallback, useEffect, useState } from "react";
import {
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Box,
  Typography,
  Paper,
} from "@mui/material";
import { INode, InheritanceType } from " @components/types/INode";
import { DISPLAY, SCROLL_BAR_STYLE } from " @components/lib/CONSTANTS";
import { capitalizeFirstLetter } from " @components/lib/utils/string.utils";
import { NODES } from " @components/lib/firestoreClient/collections";
import {
  collection,
  doc,
  getFirestore,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

type InheritanceProps = {
  selectedNode: INode;
  nodes: { [id: string]: INode };
};

const Inheritance: React.FC<InheritanceProps> = ({ selectedNode, nodes }) => {
  const [inheritanceState, setInheritanceState] = useState<{
    [key: string]: InheritanceType;
  }>(
    Object.keys(selectedNode.inheritance).reduce((acc: any, key) => {
      acc[key] = selectedNode.inheritance[key].inheritanceType;
      return acc;
    }, {} as { [key: string]: InheritanceType })
  );

  const db = getFirestore();

  useEffect(() => {
    setInheritanceState(
      Object.keys(selectedNode.inheritance).reduce((acc: any, key) => {
        acc[key] = selectedNode.inheritance[key].inheritanceType;
        return acc;
      }, {} as { [key: string]: InheritanceType })
    );
  }, [selectedNode]);

  const updateSpecializationsInheritance = async (
    specializations: { id: string }[],
    batch: any,
    property: string,
    newValue: string | InheritanceType,
    ref: string
  ) => {
    try {
      let newBatch = batch;
      for (let specialization of specializations) {
        const specializationData = nodes[specialization.id];
        const nodeRef = doc(collection(db, NODES), specialization.id);
        let objectUpdate: any = {
          [`inheritance.${property}.inheritanceType`]: newValue,
        };
        if (newValue === "neverInherit") {
          const referenceId = specializationData.inheritance[property].ref;
          objectUpdate = {
            ...objectUpdate,
            [`inheritance.${property}.ref`]: null,
          };
          if (referenceId && referenceId !== null) {
            const referenceValue = nodes[referenceId].properties[property];
            objectUpdate = {
              ...objectUpdate,
              [`properties.${property}`]: referenceValue,
              [`inheritance.${property}.ref`]: null,
            };
          }
        } else {
          objectUpdate = {
            ...objectUpdate,
            [`inheritance.${property}.ref`]: ref,
          };
        }

        if (newBatch._committed) {
          newBatch = writeBatch(db);
        }
        updateDoc(nodeRef, objectUpdate);

        if (newBatch._mutations.length > 498) {
          await newBatch.commit();
          newBatch = writeBatch(db);
        }

        newBatch = await updateSpecializationsInheritance(
          Object.values(nodes[specialization.id].specializations).flat(),
          newBatch,
          property,
          newValue,
          ref
        );
      }
      return newBatch;
    } catch (error) {
      console.error(error);
    }
  };

  const handleInheritanceChange = useCallback(
    async (property: string, event: any) => {
      const newInheritance = event.target.value as InheritanceType;
      const batch = writeBatch(db);

      const nodeRef = doc(collection(db, NODES), selectedNode.id);
      updateDoc(nodeRef, {
        [`inheritance.${property}.inheritanceType`]: newInheritance,
      });

      const newState = { ...inheritanceState };
      newState[property] = newInheritance;
      setInheritanceState(newState);
      await updateSpecializationsInheritance(
        Object.values(selectedNode.specializations).flat(),
        batch,
        property,
        newInheritance,
        selectedNode.id
      );

      await batch.commit();
    },
    [selectedNode]
  );

  return (
    <Box
      sx={{
        padding: 2,
        overflow: "auto",
        height: "100vh",
        width: "100%",
        ...SCROLL_BAR_STYLE,
      }}
    >
      {Object.entries(selectedNode.inheritance)
        .sort()
        .map(([key, inheritance]) => (
          <Paper key={key} sx={{ marginBottom: 3 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                backgroundColor: (theme) =>
                  theme.palette.mode === "dark" ? "#1f232f" : "#969faf",
                borderTopLeftRadius: "25px",
                borderTopRightRadius: "25px",
                m: 0,
                p: 2,
                gap: "10px",
                width: "100%",
              }}
            >
              <Typography sx={{ fontWeight: "bold" }}>
                {capitalizeFirstLetter(DISPLAY[key] ? DISPLAY[key] : key)}
              </Typography>
            </Box>
            <FormControl component="fieldset">
              <RadioGroup
                value={inheritanceState[key]}
                onChange={(e) => handleInheritanceChange(key, e)}
                sx={{ ml: "15px" }}
              >
                {[
                  { value: "neverInherit", label: "Never Inherit" },
                  { value: "alwaysInherit", label: "Always Inherit" },
                  {
                    value: "inheritUnlessAlreadyOverRidden",
                    label: "Inherit Unless Already Overridden",
                  },
                ].map(({ value, label }) => (
                  <FormControlLabel
                    key={value}
                    value={value}
                    control={<Radio />}
                    label={label}
                    id={value}
                  />
                ))}
              </RadioGroup>
            </FormControl>
          </Paper>
        ))}
    </Box>
  );
};

export default Inheritance;
