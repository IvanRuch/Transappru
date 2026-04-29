/**
 * Native (iOS / Android) file-download helper.
 *
 * Uses expo-file-system's new File-based API (SDK 54+). The legacy
 * `FileSystem.downloadAsync` was deprecated in expo-file-system v19 and
 * throws at runtime; `File.downloadFileAsync` is the supported path.
 *
 * Web platform has its own implementation in `fileDownload.web.ts`
 * (browser <a download> trick); Metro picks the .web.ts variant
 * automatically when `Platform.OS === 'web'`.
 */
import { File, Paths } from 'expo-file-system';

export interface DownloadResult {
  /** Local file:// URI of the downloaded file (or object URL on web). */
  uri: string;
}

/**
 * Download a file from `url` and save it under `filename` in the app's
 * document directory. Idempotent — re-downloading the same filename
 * overwrites the previous copy instead of throwing.
 */
export async function downloadFile(
  url: string,
  filename: string,
): Promise<DownloadResult> {
  const destination = new File(Paths.document, filename);
  const result = await File.downloadFileAsync(url, destination, {
    idempotent: true,
  });
  return { uri: result.uri };
}
