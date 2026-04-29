/**
 * Web file-download helper.
 *
 * Uses the standard browser pattern: fetch into a Blob, create an
 * object URL, click an invisible <a download> to trigger the
 * browser's "Save As" dialog. This is the only way to deliver a file
 * to the user's filesystem from a browser; expo-file-system's web
 * variant (IndexedDB-backed) is not visible to the user.
 */

export interface DownloadResult {
  /** The blob: object URL — already revoked by the time this returns. */
  uri: string;
}

export async function downloadFile(
  url: string,
  filename: string,
): Promise<DownloadResult> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed: HTTP ${response.status}`);
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
  return { uri: objectUrl };
}
