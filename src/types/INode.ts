/**/

import { Timestamp } from "firebase/firestore";

export type IChildNode = {
  title: string;
  id: string;
  category?: string;
  editMode?: boolean;
  new?: boolean;
};

export type IChildCategory = {
  [category: string]: { id: string; title: string }[];
};

export type INodeTypes =
  | "activity"
  | "actor"
  | "processe"
  | "role"
  | "evaluation"
  | "role"
  | "incentive"
  | "reward";

export type INodePath = {
  id: string;
  title: string;
  category?: boolean;
};
export type InheritanceType = {
  [key: string]: { ref: string; title: string };
};

export type OntologyInheritance = {
  inheritance: {
    [type: string]: InheritanceType;
  };
};
export type INode = {
  deleted: boolean;
  id: string;
  node?: string | null;
  title: string;
  description: string;
  comments: { message: string; sender: string; editMode?: boolean }[];
  editMode?: boolean;
  parents?: string[];
  type?: INodeTypes;
  plainText: { [key: string]: string };
  children: { [key: string]: any };
  nodeType?: string;
  locked?: boolean;
  category?: boolean;
} & OntologyInheritance;

export type INodeCommon = {
  title: string;
  description: string;
  nodeType: string;
  locked?: boolean;
};

export type IActivity = INodeCommon & {
  plainText: {
    Preconditions: string;
    Postconditions: string;
    notes: string;
  };
  children: {
    Actor: IChildCategory;
    Process: IChildCategory;
    Specializations: IChildCategory;
    "Evaluation Dimension": IChildCategory;
  };
};

export type IActor = INodeCommon & {
  plainText: {
    "Type of actor": string;
    Abilities: string;
    notes: string;
  };
  children: {
    Specializations: IChildCategory;
  };
};

export type IProcess = INodeCommon & {
  plainText: {
    "Type of Process": string;
    Subactivities: string;
    Dependencies: string;
    "Performance prediction models": string;
    notes: string;
  };
  children: {
    Role: IChildCategory;
    Specializations: IChildCategory;
  };
};

export type IEvaluation = INodeCommon & {
  plainText: {
    "Evaluation type": string;
    "Measurement units": string;
    "Direction of desirability": string;
    "Criteria for acceptability": string;
    notes: string;
  };
  children: {
    Specializations: IChildCategory;
  };
};

export type IRole = INodeCommon & {
  plainText: {
    "Role type": string;
    Units: string;
    "Capabilities required": string;
    notes: string;
  };
  children: {
    Specializations: IChildCategory;
    Incentive: IChildCategory;
    Actor: IChildCategory;
  };
};

export type IIncentive = INodeCommon & {
  plainText: {
    "Reward function": string;
    "Capabilities required": string;
    notes: string;
  };
  children: {
    "Evaluation Dimension": IChildCategory;
    Specializations: IChildCategory;
    Reward: IChildCategory;
  };
};

export type IReward = INodeCommon & {
  plainText: {
    "Reward type": string;
    Units: string;
  };
  children: {
    Specializations: IChildCategory;
  };
};
export type IGroup = INodeCommon & {
  plainText: {
    "Type of actor": string;
    Abilities: string;
    "List of individuals in group": string;
    "Number of individuals in group": string;
    notes: string;
  };
  children: {
    Specializations: IChildCategory;
    Individual: IChildCategory;
  };
};
export type IUserNode = {
  id: string;
  uname: string;
  node: string;
  field: string;
  previous: string;
  new: string;
  correct: boolean;
  wrong: boolean;
  visible: boolean;
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

export type ILockedNode = {
  [id: string]: {
    [field: string]: {
      id: string;
      uname: string;
      node: string;
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
