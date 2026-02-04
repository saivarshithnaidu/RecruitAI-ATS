# n8n Authentication Integration

RecruitAI uses a shared secret mechanism to authenticate n8n automation workflows safely without exposing public routes.

## Configuration
- **Environment Variable**: `INTERNAL_AUTOMATION_SECRET` (Must be set in `.env` / `.env.local`)
- **Header**: `Authorization: Bearer <INTERNAL_AUTOMATION_SECRET>`

## Protected Endpoints
The following paths are protected by this secret and bypass standard user authentication:
- `/api/automation/*`
- `/api/internal/*`

## How to use in n8n
1. Create a "Header Auth" Credential in n8n.
2. Name: `Authorization`
3. Value: `Bearer <your-secret-value>` (Use an expression to pull from env if possible, or paste the secret from 1Password/Vault).

## Testing
You can test the connection using curl:

```bash
curl -H "Authorization: Bearer <INTERNAL_AUTOMATION_SECRET>" http://localhost:3000/api/automation/test
```

Expected Response:
```json
{
  "message": "Automation connection successful",
  "timestamp": "..."
}
```
