import api from "@/services/api";
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

export const fetchTreeData = async (uid: string, farmId: string, treeId: string): Promise<TreeData | null> => {
  try {
    const res = await api.get(`/yield/farms/${farmId}/trees/${treeId}`, { params: { uid } });
    return res.data?.tree || null;
  } catch (error: any) {
    console.error("Error fetching tree data:", error.message);
    return null;
  }
};

export const fetchAllTrees = async (uid: string, farmId: string): Promise<TreeData[]> => {
  try {
    const res = await api.get(`/yield/farms/${farmId}/trees`, { params: { uid } });
    if (res.data?.trees) {
      return Object.values(res.data.trees) as TreeData[];
    }
    return [];
  } catch (error: any) {
    console.error("Error fetching all trees:", error.message);
    return [];
  }
};

export const initializeFarmTrees = async (uid: string, farmId: string, treeCount: number) => {
  try {
    const existing = await fetchAllTrees(uid, farmId);
    if (existing.length === 0) {
      for (let i = 1; i <= treeCount; i++) {
        await api.put(`/yield/farms/${farmId}/trees/${i}`, {
          uid,
          tree: {
            id: i.toString(),
            label: `Tree ${i}`,
            latest: null,
            history: {},
          },
        });
      }
    }
  } catch (error: any) {
    console.error("Error initializing trees:", error.message);
  }
};

export const updateTreeLatestData = async (uid: string, farmId: string, treeId: string, telemetry: TelemetryData) => {
  try {
    await api.put(`/yield/farms/${farmId}/trees/${treeId}`, {
      uid,
      patch: { latest: telemetry },
    });
  } catch (error: any) {
    console.error("Error updating tree telemetry:", error.message);
  }
};

export const saveTreeHistory = async (uid: string, farmId: string, treeId: string, record: TreeHistoryRecord) => {
  try {
    const res = await api.post(`/yield/farms/${farmId}/trees/${treeId}/history`, {
      uid,
      record,
    });
    return res.data?.key || `rec_${Date.now()}`;
  } catch (error: any) {
    console.error("Error saving tree history:", error.message);
    return null;
  }
};

export const updateTreeHistoryRecord = async (uid: string, farmId: string, treeId: string, recordId: string, updates: Partial<TreeHistoryRecord>) => {
  try {
    await api.put(`/yield/farms/${farmId}/trees/${treeId}`, {
      uid,
      patch: { [`history/${recordId}`]: updates },
    });
  } catch (error: any) {
    console.error("Error updating tree history record:", error.message);
  }
};
