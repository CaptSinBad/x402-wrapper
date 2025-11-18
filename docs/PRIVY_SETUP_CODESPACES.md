# Privy Setup for Codespaces

## Problem
When accessing the app via Codespaces URL (`https://shiny-robot-r4qg5x5xqp9p3ww9r-3001.app.github.dev`), Privy throws an origin mismatch error:
```
origins don't match "https://auth.privy.io" "https://shiny-robot-r4qg5x5xqp9p3ww9r-3001.app.github.dev"
```

## Solution
You need to add your Codespaces URL as an allowed origin in your Privy app configuration.

### Steps to Configure Privy

1. **Go to Privy Console**
   - Navigate to https://console.privy.io
   - Sign in with your account

2. **Select Your App**
   - Find your app (App ID: `cmh80hanx04lrl50c7llxbrgy`)

3. **Add Allowed Origins**
   - Go to Settings → Allowed Origins
   - Add your Codespaces URL (e.g., `https://shiny-robot-r4qg5x5xqp9p3ww9r-3001.app.github.dev`)
   - Also ensure these are present:
     - `http://localhost:3000`
     - `http://localhost:3001`
     - `http://localhost:5173`
     - Any other development URLs you use

4. **Save Changes**
   - Click "Save" or "Update"
   - Changes typically take effect within a few seconds

### Codespaces URL Format
Codespaces URLs follow this pattern:
```
https://{owner}-{repo}-{hash}-{port}.app.github.dev
```

Each time your Codespace restarts or you create a new one, you'll get a new URL. You may need to update this each time.

### Alternative: Use Port Forwarding
If you don't want to constantly update the Privy configuration:
1. Use VS Code's port forwarding to access via `localhost`
2. Or use a custom domain that you control

### After Configuration
1. Refresh the page in your browser
2. Clear browser cache/cookies if needed
3. The wallet connection should now work

## Testing
Once configured, you should be able to:
1. Access the app via the Codespaces URL
2. Click "Connect Wallet"
3. See the Privy wallet selector without origin errors
