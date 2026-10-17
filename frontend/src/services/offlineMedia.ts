import { beApi } from "@/api/callApi";

const DB_NAME = "flowse_offline_media_db";
const DB_VERSION = 1;
const STORE_NAME = "offline_evidences";

export interface OfflineEvidenceItem {
  id: string;
  action_id: string;
  blob: Blob;
  file_name: string;
  created_at: string;
}

/**
 * Nén ảnh phía Client bằng Canvas để giảm kích thước từ 5-10MB xuống < 100KB
 */
export async function compressImage(
  file: File | Blob,
  maxWidth = 1280,
  maxHeight = 1280,
  quality = 0.75
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Nếu là file không phải ảnh thì giữ nguyên
    if (file.type && !file.type.startsWith("image/")) {
      return resolve(file);
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let width = img.width;
      let height = img.height;

      // Tính toán tỷ lệ co ảnh
      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return resolve(file);
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            resolve(file);
          }
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Không thể tải hình ảnh để nén"));
    };

    img.src = url;
  });
}

/**
 * Mở kết nối tới IndexedDB
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("Trình duyệt không hỗ trợ IndexedDB"));
    }

    const req = window.indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("action_id", "action_id", { unique: false });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Nén và lưu ảnh/bằng chứng ngoại tuyến vào IndexedDB (Hỗ trợ dung lượng lớn không sợ đầy LocalStorage)
 */
export async function saveOfflineEvidence(
  actionId: string,
  file: File | Blob,
  fileName = "evidence.jpg"
): Promise<{ id: string; localUrl: string }> {
  const compressedBlob = await compressImage(file);
  const id = `ev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const item: OfflineEvidenceItem = {
    id,
    action_id: actionId,
    blob: compressedBlob,
    file_name: fileName,
    created_at: new Date().toISOString(),
  };

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.add(item);

    req.onsuccess = () => {
      const localUrl = URL.createObjectURL(compressedBlob);
      resolve({ id, localUrl });
    };

    req.onerror = () => reject(req.error);
  });
}

/**
 * Lấy danh sách bằng chứng offline theo actionId
 */
export async function getOfflineEvidences(
  actionId: string
): Promise<Array<{ id: string; blob: Blob; fileName: string; localUrl: string }>> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("action_id");
    const req = index.getAll(actionId);

    req.onsuccess = () => {
      const list = (req.result as OfflineEvidenceItem[]).map((item) => ({
        id: item.id,
        blob: item.blob,
        fileName: item.file_name,
        localUrl: URL.createObjectURL(item.blob),
      }));
      resolve(list);
    };

    req.onerror = () => reject(req.error);
  });
}

/**
 * Xóa bằng chứng trong IndexedDB sau khi đã đồng bộ thành công
 */
export async function removeOfflineEvidences(actionId: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const index = store.index("action_id");
      const req = index.openCursor(IDBKeyRange.only(actionId));

      req.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };

      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[offlineMedia] Lỗi xóa bằng chứng IndexedDB:", err);
  }
}

/**
 * Tự động đẩy toàn bộ ảnh của action từ IndexedDB lên máy chủ khi có mạng lại
 */
export async function uploadOfflineEvidences(actionId: string): Promise<string[]> {
  const items = await getOfflineEvidences(actionId);
  if (items.length === 0) return [];

  const uploadedUrls: string[] = [];

  for (const item of items) {
    try {
      const formData = new FormData();
      const fileToUpload = new File([item.blob], item.fileName, { type: item.blob.type || "image/jpeg" });
      formData.append("file", fileToUpload);

      const res: any = await beApi.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const serverUrl = res?.file?.file_url || res?.data?.file?.file_url;
      if (serverUrl) {
        uploadedUrls.push(serverUrl);
      }
    } catch (err) {
      console.error(`[offlineMedia] Lỗi upload ảnh ${item.id}:`, err);
    }
  }

  // Nếu upload xong xuôi thì dọn dẹp IndexedDB
  if (uploadedUrls.length > 0) {
    await removeOfflineEvidences(actionId);
  }

  return uploadedUrls;
}
