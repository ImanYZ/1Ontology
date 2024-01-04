import { Timestamp } from "firebase/firestore";

export type ISubOntology = {
  title: string;
  id: string;
  category?: string;
  editMode?: boolean;
  new?: boolean;
};

export type ISubOntologyCategory = {
  [category: string]: { ontologies: ISubOntology[] };
};

export type IOntologyTypes =
  | "activity"
  | "actor"
  | "processe"
  | "role"
  | "evaluation"
  | "role"
  | "incentive"
  | "reward";

export type IOntologyPath = {
  id: string;
  title: string;
};
export type InheritanceType = {
  [key: string]: { ref: string; title: string };
};

export type OntologyInheritance = {
  inheritance: {
    [type: string]: InheritanceType;
  };
};
export type IOntology = {
  deleted: boolean;
  id: string;
  node?: string | null;
  title: string;
  description: string;
  comments: { message: string; sender: string; editMode?: boolean }[];
  editMode?: boolean;
  parents?: string[];
  type?: IOntologyTypes;
  plainText: { [key: string]: string };
  subOntologies: { [key: string]: any };
  ontologyType?: string;
  locked?: boolean;
  category?: boolean;
} & OntologyInheritance;

export type IOntologyCommon = {
  title: string;
  description: string;
  ontologyType: string;
  locked?: boolean;
};

export type IActivity = IOntologyCommon & {
  plainText: {
    Preconditions: string;
    Postconditions: string;
    notes: string;
  };
  subOntologies: {
    Actor: ISubOntologyCategory;
    Process: ISubOntologyCategory;
    Specializations: ISubOntologyCategory;
    "Evaluation Dimension": ISubOntologyCategory;
  };
};

export type IActor = IOntologyCommon & {
  plainText: {
    "Type of actor": string;
    Abilities: string;
    notes: string;
  };
  subOntologies: {
    Specializations: ISubOntologyCategory;
  };
};

export type IProcess = IOntologyCommon & {
  plainText: {
    "Type of Process": string;
    Subactivities: string;
    Dependencies: string;
    "Performance prediction models": string;
    notes: string;
  };
  subOntologies: {
    Role: ISubOntologyCategory;
    Specializations: ISubOntologyCategory;
  };
};

export type IEvaluation = IOntologyCommon & {
  plainText: {
    "Evaluation type": string;
    "Measurement units": string;
    "Direction of desirability": string;
    "Criteria for acceptability": string;
    notes: string;
  };
  subOntologies: {
    Specializations: ISubOntologyCategory;
  };
};

export type IRole = IOntologyCommon & {
  plainText: {
    "Role type": string;
    Units: string;
    "Capabilities required": string;
    notes: string;
  };
  subOntologies: {
    Specializations: ISubOntologyCategory;
    Incentive: ISubOntologyCategory;
    Actor: ISubOntologyCategory;
  };
};

export type IIncentive = IOntologyCommon & {
  plainText: {
    "Reward function": string;
    "Capabilities required": string;
    notes: string;
  };
  subOntologies: {
    "Evaluation Dimension": ISubOntologyCategory;
    Specializations: ISubOntologyCategory;
    Reward: ISubOntologyCategory;
  };
};

export type IReward = IOntologyCommon & {
  plainText: {
    "Reward type": string;
    Units: string;
  };
  subOntologies: {
    Specializations: ISubOntologyCategory;
  };
};
export type IGroup = IOntologyCommon & {
  plainText: {
    "Type of actor": string;
    Abilities: string;
    "List of individuals in group": string;
    "Number of individuals in group": string;
    notes: string;
  };
  subOntologies: {
    Specializations: ISubOntologyCategory;
    Individual: ISubOntologyCategory;
  };
};
export type IUserOntology = {
  id: string;
  uname: string;
  ontology: string;
  field: string;
  previous: string;
  new: string;
  correct: boolean;
  wrong: boolean;
  visible: boolean;
};
export type IOntologyLock = {
  uname: string;
  ontology: string;
  field: string;
};

export type TreeVisual = {
  [key: string]: {
    id: string;
    isCategory: boolean;
    path: string[];
    title: string;
    specializations: TreeVisual;
  };
};

export type ILockedOntology = {
  [id: string]: {
    [field: string]: {
      id: string;
      uname: string;
      ontology: string;
      field: string;
      deleted: boolean;
      createdAt: Timestamp;
    };
  };
};

export type MainSpecializations = {
  [key: string]: {
    id: string;
    path: string[];
    title: string;
    specializations: MainSpecializations;
  };
};
