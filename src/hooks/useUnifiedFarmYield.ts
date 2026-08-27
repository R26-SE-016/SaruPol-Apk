import { useState, useEffect, useMemo } from 'react';
import { predictDashboardYield } from '@/services/yieldService';
import { fetchTrees, fetchHarvestLogs } from '@/services/yieldFarmDb';
import type { Farm } from '@/types/yield';

export function useUnifiedFarmYield(userUid: string | undefined, farms: Farm[], externalLogsMap?: Record<string, any[]>, refreshTrigger?: number) {
  const [basePredictions, setBasePredictions] = useState<Record<string, any>>({});
  const [farmTrees, setFarmTrees] = useState<Record<string, Record<string, any>>>({});
  const [isPredicting, setIsPredicting] = useState<boolean>(true);

  useEffect(() => {
    if (!userUid || farms.length === 0) {
      setIsPredicting(false);
      return;
    }

    let isMounted = true;
    setIsPredicting(true);

    const fetchAll = async () => {
      const newPredictions: Record<string, any> = {};
      
      for (const farm of farms) {
        try {
          let farmLogs = externalLogsMap ? (externalLogsMap[farm.id] || []) : [];
          if (!externalLogsMap) {
            const rawLogs = await fetchHarvestLogs(userUid, farm.id);
            farmLogs = rawLogs.map((l: any) => ({
              id: l.id,
              date: l.date || l.timestamp,
              actual_yield_nuts: l.nutCount || l.actual_yield_nuts || (l.gradeA || 0) + (l.gradeB || 0) + (l.gradeC || 0) || 0,
              predicted_yield_nuts: l.predicted_yield_nuts || 0 
            }));
            farmLogs.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
          }

          const reqBody = {
            uid: userUid,
            farm_id: farm.id,
            estate: farm.locationName || 'Colombo',
            trees_count: farm.totalTrees || 40,
            last_harvest_yield: farm.lastHarvestYield || null,
            actual_harvest_logs: farmLogs
          };
          const data = await predictDashboardYield(reqBody);
          if (data && data.predicted_next_pick_yield_nuts !== undefined) {
            newPredictions[farm.id] = data;
          }
        } catch (e) {
          console.warn(`Failed to predict for farm ${farm.id}`);
        }
      }

      if (isMounted) {
        setBasePredictions(prev => ({ ...prev, ...newPredictions }));
        setIsPredicting(false);
      }
    };

    fetchAll();

    return () => { isMounted = false; };
  }, [userUid, farms.map(f => f.id).join(','), externalLogsMap, refreshTrigger]);

  useEffect(() => {
    if (!userUid || farms.length === 0) return;
    let isMounted = true;

    const loadAllTrees = async () => {
      const loaded: Record<string, Record<string, any>> = {};
      for (const farm of farms) {
        const trees = await fetchTrees(userUid, farm.id);
        loaded[farm.id] = trees;
      }
      if (isMounted) {
        setFarmTrees(loaded);
      }
    };

    loadAllTrees();
    return () => { isMounted = false; };
  }, [userUid, farms.map(f => f.id).join(','), refreshTrigger]);

  const unifiedYields = useMemo(() => {
    const result: Record<string, number> = {};
    const basePredictionObj: Record<string, any> = {};

    farms.forEach(farm => {
      const totalTrees = farm.totalTrees || 0;
      const basePred = basePredictions[farm.id];
      const baseTotalNuts = basePred?.predicted_next_pick_yield_nuts || 0;
      const avgBasePerTree = totalTrees > 0 ? (baseTotalNuts / totalTrees) : 0;
      
      basePredictionObj[farm.id] = basePred;
      const trees = farmTrees[farm.id] || {};
      let sum = 0;
      let knownCount = 0;
      
      Object.values(trees).forEach((t: any) => {
        const fy = t?.latest?.finalYield;
        if (fy !== undefined && fy !== null) {
          sum += fy;
          knownCount++;
        }
      });

      const unknownCount = Math.max(0, totalTrees - knownCount);
      sum += (unknownCount * avgBasePerTree);
      
      result[farm.id] = Math.round(sum);
    });
    return { unifiedYields: result, basePredictions: basePredictionObj };
  }, [farms, basePredictions, farmTrees]);

  return { 
    unifiedYields: unifiedYields.unifiedYields, 
    basePredictions: unifiedYields.basePredictions, 
    isPredicting 
  };
}
