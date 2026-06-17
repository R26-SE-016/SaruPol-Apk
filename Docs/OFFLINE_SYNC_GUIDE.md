# SaruPol — Offline Synchronization & Caching Architecture

This guide explains how offline support is implemented in the SaruPol mobile application and how to scale this synchronization system going forward for real-world deployments in rural coconut plantations with low connectivity.

---

## 1. Current Architecture

SaruPol uses a hybrid offline caching approach powered by two mechanisms:
1. **Network Status Detection**: Leveraging `@react-native-community/netinfo` to observe real-time internet connectivity status.
2. **Local Persisted State Storage**: Powered by `Zustand` with `AsyncStorage` serialization to cache inputs, predictions, and analysis histories on the user's mobile device.

### Caching Flow Diagram

```
[User Action: Scan / Predict / Soil Test]
                  │
                  ▼
         [Check Connectivity]
         /                 \
     (Online)           (Offline)
       /                     \
      ▼                       ▼
[Call API Gateway]     [Retrieve Fallback Mock]
      │                       │
      ├───────────────────────┘
      ▼
[Write to Local History (Zustand/AsyncStorage)]
      │
      ├──> If online: Mark as Synced (synced=true)
      └──> If offline: Mark as Pending (synced=false)
```

---

## 2. Moving Forward: Scaling Offline Sync for Production

In rural plantation environments, internet connections are often intermittent (spotty 3G/EDGE or temporary disconnection). To scale the mock/basic sync layer into a production-grade system, implement the following steps:

### Step A: Migrate to SQLite for Local Storage
While `AsyncStorage` is great for simple lists, a production-grade app with thousands of historical records and offline-captured image base64 blocks should migrate to `expo-sqlite` or `WatermelonDB` for faster indexing and query capabilities.

#### Proposed Schema for Offline Logs Table:
```sql
CREATE TABLE IF NOT EXISTS offline_sync_queue (
  id TEXT PRIMARY KEY,
  feature TEXT NOT NULL,       -- 'yield' | 'pathology' | 'soil'
  endpoint TEXT NOT NULL,      -- '/api/predict' etc.
  payload TEXT NOT NULL,       -- JSON request parameters
  image_path TEXT,             -- Local file URI of captured photos
  attempts INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Step B: Offline Image Queueing Strategy
Instead of storing base64 strings directly in memory (which causes heap crashes), save captured disease images locally to the device's filesystem using `expo-file-system`.
1. Capture photo → Save to `file:///data/user/0/.../cache/disease_image_xyz.png`.
2. Add an item to the SQLite sync queue pointing to that local image path.
3. Once internet is restored, a background task uploads the image file via `multipart/form-data` to the API gateway.

### Step C: Background Sync Worker
To ensure sync occurs even if the user closes the app, configure a background task using `expo-background-fetch` and `expo-task-manager`.

#### Implementation Blueprint (`src/utils/syncWorker.ts`):
```typescript
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import NetInfo from '@react-native-community/netinfo';

const BACKGROUND_SYNC_TASK = 'SARUPOL_BACKGROUND_SYNC';

TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  const state = await NetInfo.fetch();
  if (!state.isConnected) {
    return BackgroundFetch.BackgroundFetchResult.NoData;
  }

  try {
    // 1. Fetch pending items from local database
    // 2. Upload them sequentially to API Gateway
    // 3. Delete from local queue upon successful HTTP 201/200
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (err) {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerSyncWorker() {
  return BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
    minimumInterval: 15 * 60, // 15 minutes
    stopOnTerminate: false,
    startOnResume: true,
  });
}
```

### Step D: Database Synchronization Protocols
When implementing server-side synchronization databases:
- **Conflict Resolution**: Use "Last-Write-Wins" using timestamp fields or standard Vector Clocks.
- **Incremental Sync**: Only pull records updated since the user's last sync timestamp (`last_synced_at`) to minimize bandwidth usage.
- **Compression**: Gzip/Deflate JSON requests when uploading large batches of historical soil analyses or yield records.
