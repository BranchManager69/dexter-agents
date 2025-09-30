### What “adding CDP” means
- CDP = Chrome DevTools Protocol. It exposes a WebSocket endpoint from a running Chrome. A client (Playwright) connects to that endpoint and remotely drives the already-running Chrome.
- Result: You can run the harness on EC2, but the browser actually running (and visible for PAT) is your Windows Chrome.

### The moving parts
- **Windows (your Chrome)**: Start Chrome with a debug port so it exposes CDP on `localhost:9222`.
- **Tunnel Windows→EC2**: Create a secure path so EC2 can reach that CDP socket. Easiest: SSH reverse tunnel.
- **EC2 (the harness)**: Connect to that CDP WebSocket and drive your Windows Chrome instead of launching local Chromium.

### One-time Windows setup
- **Start Chrome with CDP enabled (headful)**
```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  --remote-debugging-port=9222 `
  --user-data-dir="$env:LOCALAPPDATA\DexterChromeDebug" `
  --no-first-run --no-default-browser-check
```
- Leave this window open; sign in, pass Cloudflare once, etc.

### Create the secure path (Windows→EC2)
- Use an SSH reverse tunnel so EC2 can reach your `localhost:9222` on Windows:
```powershell
ssh -N -R 9223:127.0.0.1:9222 branchmanager@<EC2_PUBLIC_IP> -i <PATH_TO_YOUR_SSH_KEY>
```
- As long as this stays running, EC2 can access your Chrome CDP at `localhost:9223`.

### Confirm the CDP endpoint from EC2
- On EC2:
```bash
curl -s http://localhost:9223/json/version
# Look for "webSocketDebuggerUrl": "ws://127.0.0.1:9223/devtools/browser/<id>"
```
- That `ws://.../devtools/browser/<id>` is the CDP URL the harness will use.

### How the harness will use CDP
- We’ll add a small toggle so when `HARNESS_CDP_ENDPOINT` is set, the harness uses `chromium.connectOverCDP(wsEndpoint)` instead of launching Chromium locally. The rest of the flow (contexts, page navigation, storage state) stays the same, and it’s visibly happening in your Windows Chrome.

### Typical run (after we add the CDP flag)
- On EC2:
```bash
export HARNESS_CDP_ENDPOINT="ws://127.0.0.1:9223/devtools/browser/<id>"
export HARNESS_AUTHORIZATION="Bearer <ACCESS_TOKEN>"

cd /home/branchmanager/websites/dexter-agents
npm run dexchat -- --prompt "Provide latest pump streams intel: top streams, tokens, momentum, viewer counts" \
  --url https://beta.dexter.cash --wait 60000 --json \
  --storage /home/branchmanager/websites/dexter-mcp/state.json
```
- You’ll see tabs opening in your Windows Chrome. If PAT appears, solve it there; the harness will proceed once the page is usable.

### Security notes
- Exposing CDP is powerful; avoid exposing it to the public internet.
- The SSH reverse tunnel keeps it local to the EC2 box (`localhost:9223`), which is safe if you trust that host.
- Close the tunnel and the CDP Chrome instance when done.

### Alternatives
- If SSH reverse tunnel is inconvenient, we can use Cloudflare Tunnel or ngrok to expose 9222 as a `wss://` URL. It’s simpler but you must safeguard access; CDP grants full browser control.

If you want me to proceed, I’ll add the `HARNESS_CDP_ENDPOINT` support and give you the exact commands tailored to your EC2 IP and your preferred method (SSH reverse tunnel or Cloudflare).