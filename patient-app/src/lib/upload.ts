import { Platform } from 'react-native';
import { FileSystemUploadType, uploadAsync } from 'expo-file-system/legacy';

/**
 * Send a file the phone holds (a recording, a photo) to the server.
 *
 * React Native no longer accepts the old `{ uri, name, type }` shape inside
 * FormData — it throws "Unsupported FormDataPart implementation" — so on a
 * phone the upload goes through expo-file-system, which streams the file
 * straight from disk. The browser build still uses FormData with a real blob.
 */
export async function uploadFile<T>(
  url: string,
  file: { uri: string; name: string; type: string },
  opts: { field?: string; fields?: Record<string, string>; headers?: Record<string, string> } = {},
): Promise<T> {
  const { field = 'file', fields = {}, headers = {} } = opts;

  if (Platform.OS === 'web') {
    const form = new FormData();
    const blob = await (await fetch(file.uri)).blob();
    form.append(field, blob, file.name);
    for (const [k, v] of Object.entries(fields)) form.append(k, v);
    const res = await fetch(url, { method: 'POST', body: form, headers });
    return parse<T>(res.status, await res.text());
  }

  const res = await uploadAsync(url, file.uri, {
    httpMethod: 'POST',
    uploadType: FileSystemUploadType.MULTIPART,
    fieldName: field,
    mimeType: file.type,
    parameters: fields,
    headers,
  });
  return parse<T>(res.status, res.body);
}

function parse<T>(status: number, body: string): T {
  let data: any = {};
  try {
    data = JSON.parse(body);
  } catch {
    // a proxy or crash page — keep the raw text for the message below
  }
  if (status < 200 || status >= 300) {
    const detail =
      typeof data?.detail === 'string'
        ? data.detail
        : Array.isArray(data?.detail)
          ? data.detail[0]?.msg
          : body?.slice(0, 120);
    throw new Error(detail || `Upload failed (${status}).`);
  }
  return data as T;
}
