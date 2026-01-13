# RecruitAI

## Permissions Note
The Google Drive folder and Google Sheet MUST be shared with the service account email as Editor:
`recruitai-sheets@recruit-ai-ata.iam.gserviceaccount.com`

Without this, uploads will fail even if APIs are enabled.

## Configuration
Ensure `.env` contains:
- `GOOGLE_SHEETS_CREDENTIALS_PATH`: Path to JSON credentials.
- `GOOGLE_SHEETS_SPREADSHEET_ID`: The ID of the Google Sheet (not the URL).
- `GOOGLE_DRIVE_FOLDER_ID`: The ID of the Drive Folder (not the URL).
