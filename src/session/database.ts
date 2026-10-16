/** One atomic record includes the home world and guest profile. Legacy storage remains intact. */
const DB = 'open-world:session:v1';
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('saves');
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export async function readSave<T>(): Promise<T | undefined> {
  const db = await database();
  try { return await new Promise<T | undefined>((resolve, reject) => {
    const tx = db.transaction('saves'), r = tx.objectStore('saves').get('current');
    r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
  }); } finally { db.close(); }
}
export async function writeSave(value: unknown): Promise<void> {
  const db = await database();
  try { await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('saves', 'readwrite');
    tx.objectStore('saves').put(value, 'current');
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
  }); } finally { db.close(); }
}
