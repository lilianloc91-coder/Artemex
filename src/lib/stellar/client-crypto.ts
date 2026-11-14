async function blobToArrayBuffer(file: Blob): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === "function") {
    return file.arrayBuffer();
  }
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to read file as ArrayBuffer"));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("FileReader error"));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Computes the real SHA-256 cryptographic digest of a File or Blob in the browser
 * using the standard Web Crypto API. The original file bytes stay in memory.
 */
export async function computeFileSha256(file: Blob): Promise<string> {
  const buffer = await blobToArrayBuffer(file);
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Computes the real SHA-256 cryptographic digest of a text/string
 */
export async function computeTextSha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export interface SealedEvidenceFile {
  name: string;
  size: number;
  type: string;
  sha256: string;
  file?: File;
}

/**
 * Computes the composite SHA-256 hash of a cultural work dossier:
 * If a single evidence file is uploaded, uses its exact binary SHA-256 hash so
 * direct file-upload verification in `/verificar` matches 1:1 with the file bytes.
 * Otherwise hashes the canonical JSON of metadata + file hashes.
 */
export async function computeDossierSha256(
  metadata: {
    title: string;
    artisan: string;
    category: string;
    technique: string;
    materials: string;
    priceMxn: string;
  },
  files: SealedEvidenceFile[],
): Promise<string> {
  if (files.length === 1 && files[0]?.sha256) {
    return files[0].sha256;
  }
  return computeTextSha256(
    JSON.stringify({
      metadata,
      files: files.map((f) => ({ name: f.name, size: f.size, sha256: f.sha256 })),
    }),
  );
}

