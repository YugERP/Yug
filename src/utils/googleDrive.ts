// Google Drive Direct Upload Utility
// Supports Google Identity Services (GSI) OAuth Token Flow & Google Drive REST API v3

import { OAUTH_CLIENT_ID } from '../firebase';

export interface DriveUploadResult {
  fileId: string;
  fileName: string;
  webViewLink?: string;
  webContentLink?: string;
  folderId?: string;
}

const DRIVE_SCOPES = 'https://www.googleapis.com/auth/drive.file';

declare global {
  interface Window {
    google?: any;
    gapi?: any;
  }
}

/**
 * Requests an access token from Google Identity Services
 */
export async function getGoogleDriveAccessToken(clientId?: string, hintEmail?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Check if token already valid in localStorage
    const savedToken = localStorage.getItem('gdrive_access_token');
    const tokenExpiry = localStorage.getItem('gdrive_token_expiry');
    if (savedToken && tokenExpiry && Date.now() < Number(tokenExpiry)) {
      return resolve(savedToken);
    }

    if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
      // If script is loading, wait a moment
      let retries = 0;
      const interval = setInterval(() => {
        retries++;
        if (window.google?.accounts?.oauth2) {
          clearInterval(interval);
          initTokenFlow();
        } else if (retries > 20) {
          clearInterval(interval);
          reject(new Error("Google Identity Services script (accounts.google.com/gsi/client) is not loaded. Please check your internet connection."));
        }
      }, 200);
      return;
    }

    initTokenFlow();

    function initTokenFlow() {
      try {
        // Fallback default or configured OAuth Client ID
        const resolvedClientId = clientId || OAUTH_CLIENT_ID || (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '25154024645-1a4i4ngql1h7rpcf32a7djdg8t5k00r4.apps.googleusercontent.com';

        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: resolvedClientId,
          scope: DRIVE_SCOPES,
          hint: hintEmail || 'shankaldeep4@gmail.com',
          prompt: '',
          callback: (response: any) => {
            if (response.error) {
              reject(new Error(`Google Authentication Error: ${response.error} - ${response.error_description || ''}`));
              return;
            }
            if (response.access_token) {
              const expiresInMs = (Number(response.expires_in) || 3500) * 1000;
              localStorage.setItem('gdrive_access_token', response.access_token);
              localStorage.setItem('gdrive_token_expiry', String(Date.now() + expiresInMs - 60000));
              resolve(response.access_token);
            } else {
              reject(new Error("No access token returned from Google."));
            }
          },
          error_callback: (err: any) => {
            reject(new Error(`Google OAuth initialization error: ${err?.message || JSON.stringify(err)}`));
          }
        });

        tokenClient.requestAccessToken({ prompt: '' });
      } catch (err: any) {
        reject(err);
      }
    }
  });
}

/**
 * Searches for or creates a folder in Google Drive
 */
export async function getOrCreateDriveFolder(accessToken: string, folderName: string): Promise<string> {
  // 1. Search for existing folder
  const query = `mimeType='application/vnd.google-apps.folder' and name='${folderName.replace(/'/g, "\\'")}' and trashed=false`;
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&spaces=drive`;

  const searchRes = await fetch(searchUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!searchRes.ok) {
    const errJson = await searchRes.json().catch(() => ({}));
    throw new Error(`Failed to search Drive folders: ${errJson.error?.message || searchRes.statusText}`);
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // 2. Create folder if not found
  const createUrl = 'https://www.googleapis.com/drive/v3/files';
  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  if (!createRes.ok) {
    const errJson = await createRes.json().catch(() => ({}));
    throw new Error(`Failed to create Drive folder: ${errJson.error?.message || createRes.statusText}`);
  }

  const folderData = await createRes.json();
  return folderData.id;
}

/**
 * Uploads a JSON backup package directly to Google Drive via multipart upload
 */
export async function uploadBackupToGoogleDrive(
  jsonData: any,
  fileName: string,
  folderName: string = 'EduManage School Backups',
  onProgress?: (msg: string) => void
): Promise<DriveUploadResult> {
  onProgress?.('Authenticating with Google Drive (कृपया गूगल अकाउंट की अनुमति दें)...');
  
  // 1. Acquire Access Token
  const accessToken = await getGoogleDriveAccessToken();

  onProgress?.(`Locating or creating destination folder "${folderName}" in Google Drive...`);
  
  // 2. Get/Create Folder
  let parentFolderId: string | undefined;
  try {
    parentFolderId = await getOrCreateDriveFolder(accessToken, folderName);
  } catch (fErr) {
    console.warn("Could not create specific folder, uploading to Drive root:", fErr);
  }

  onProgress?.(`Uploading ${fileName} directly to your Google Drive account...`);

  // 3. Prepare Multipart Body
  const metadata: any = {
    name: fileName,
    mimeType: 'application/json',
    description: `EduManage Automatic Backup created on ${new Date().toLocaleString('en-IN')}`,
  };

  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }

  const jsonString = typeof jsonData === 'string' ? jsonData : JSON.stringify(jsonData, null, 2);
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    jsonString +
    closeDelimiter;

  // 4. Send Upload Request
  const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink';
  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!uploadRes.ok) {
    const errJson = await uploadRes.json().catch(() => ({}));
    throw new Error(`Google Drive Upload Failed: ${errJson.error?.message || uploadRes.statusText}`);
  }

  const uploadedFile = await uploadRes.json();

  onProgress?.(`File successfully uploaded to Google Drive! File ID: ${uploadedFile.id}`);

  return {
    fileId: uploadedFile.id,
    fileName: uploadedFile.name,
    webViewLink: uploadedFile.webViewLink,
    webContentLink: uploadedFile.webContentLink,
    folderId: parentFolderId
  };
}
