import { ref, get, set, update, push } from "firebase/database";
import { rtdb } from "@/services/firebase";
import type { TelemetryData } from "@/types/yield";

export interface TreeData {
  id: string;
  label: string;
  latest: TelemetryData | null;
  history: Record<string, TreeHistoryRecord>;
}

export interface TreeHistoryRecord {
  date: string;
  timestamp: number;
  baseYield: number;
  reductionPercent: number;
  finalYield: number;
  npk: { n: number; p: number; k: number };
  ph: number;
  moisture: number;
  actualYield: number | null;
  disease: string | null;
}

export const fetchTreeData = async (farmId: string, treeId: string): Promise<TreeData | null> => {
  try {
    const snapshot = await get(ref(rtdb, `farms/${farmId}/trees/${treeId}`));
    if (snapshot.exists()) {
      return snapshot.val() as TreeData;
    }
    return null;
  } catch (error) {
    console.error("Error fetching tree data:", error);
    return null;
  }
};

export const fetchAllTrees = async (farmId: string): Promise<TreeData[]> => {
  try {
    const snapshot = await get(ref(rtdb, `farms/${farmId}/trees`));
    if (snapshot.exists()) {
      const treesObj = snapshot.val();
      return Object.values(treesObj) as TreeData[];
    }
    return [];
  } catch (error) {
    console.error("Error fetching all trees:", error);
    return [];
  }
};

export const initializeFarmTrees = async (farmId: string, treeCount: number) => {
  try {
    for (let i = 1; i <= treeCount; i++) {
      const treeRef = ref(rtdb, `farms/${farmId}/trees/${i}`);
      const snapshot = await get(treeRef);
      if (!snapshot.exists()) {
        await set(treeRef, {
          id: i.toString(),
          label: `Tree ${i}`,
          latest: null,
          history: {}
        });
      }
    }
  } catch (error) {
    console.error("Error initializing trees:", error);
  }
};

export const updateTreeLatestData = async (farmId: string, treeId: string, telemetry: TelemetryData) => {
  try {
    await update(ref(rtdb, `farms/${farmId}/trees/${treeId}`), {
      latest: telemetry
    });
  } catch (error) {
    console.error("Error updating tree telemetry:", error);
  }
};

export const saveTreeHistory = async (farmId: string, treeId: string, record: TreeHistoryRecord) => {
  try {
    const historyRef = ref(rtdb, `farms/${farmId}/trees/${treeId}/history`);
    const newRecordRef = push(historyRef);
    await set(newRecordRef, record);
    return newRecordRef.key;
  } catch (error) {
    console.error("Error saving tree history:", error);
    return null;
  }
};

export const updateTreeHistoryRecord = async (farmId: string, treeId: string, recordId: string, updates: Partial<TreeHistoryRecord>) => {
  try {
    await update(ref(rtdb, `farms/${farmId}/trees/${treeId}/history/${recordId}`), updates);
  } catch (error) {
    console.error("Error updating tree history record:", error);
  }
};
