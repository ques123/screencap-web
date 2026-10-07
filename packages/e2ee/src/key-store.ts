const DB_NAME = "screencap-e2ee";
const STORE = "keys";

function openDb(): Promise<IDBDatabase | null> {
	return new Promise((resolve) => {
		try {
			if (typeof indexedDB === "undefined" || !indexedDB) {
				resolve(null);
				return;
			}
			const request = indexedDB.open(DB_NAME, 1);
			request.onupgradeneeded = () => {
				if (!request.result.objectStoreNames.contains(STORE)) {
					request.result.createObjectStore(STORE);
				}
			};
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => resolve(null);
			request.onblocked = () => resolve(null);
		} catch {
			resolve(null);
		}
	});
}

async function run<T>(
	mode: IDBTransactionMode,
	fallback: T,
	action: (store: IDBObjectStore) => IDBRequest,
): Promise<T> {
	const db = await openDb();
	if (!db) return fallback;
	return new Promise<T>((resolve) => {
		try {
			const tx = db.transaction(STORE, mode);
			const request = action(tx.objectStore(STORE));
			let result = fallback;
			request.onsuccess = () => {
				result = request.result ?? fallback;
			};
			tx.oncomplete = () => {
				db.close();
				resolve(result);
			};
			tx.onerror = tx.onabort = () => {
				db.close();
				resolve(fallback);
			};
		} catch {
			try {
				db.close();
			} catch {}
			resolve(fallback);
		}
	});
}

export const keyStore = {
	async get(videoId: string): Promise<Uint8Array | null> {
		const value = await run<unknown>("readonly", null, (s) => s.get(videoId));
		if (value instanceof Uint8Array) return value;
		if (value instanceof ArrayBuffer) return new Uint8Array(value);
		return null;
	},
	async put(videoId: string, key: Uint8Array): Promise<void> {
		await run<void>("readwrite", undefined, (s) => s.put(key, videoId));
	},
	async remove(videoId: string): Promise<void> {
		await run<void>("readwrite", undefined, (s) => s.delete(videoId));
	},
};
