# D-Bus Notification Daemon - Windows Setup Specification

## Objective
Enable `notify-send` commands from SSH session on EC2 server to create native Windows 10/11 toast notifications on the Windows laptop.

## Requirements

### 1. D-Bus Session Bus
- Install D-Bus daemon on Windows (options: MSYS2, Git for Windows bundled version, or standalone from freedesktop.org)
- Configure D-Bus to listen on **TCP socket** (not just Unix socket)
- D-Bus must accept connections from localhost or from SSH forwarded port
- Set authentication to allow the SSH user session to connect

### 2. Notification Bridge
Install a tool that listens to D-Bus notification signals and creates Windows toast notifications:
- **Option A**: `snoretoast` (https://github.com/KDE/snoretoast) - C++ tool, reliable
- **Option B**: Custom Python script using `win10toast` library
- **Option C**: `wsl-notify-send` (if using WSL integration)

The bridge must:
- Listen to D-Bus session bus for `org.freedesktop.Notifications` signals
- Translate D-Bus notification parameters (summary, body, icon, urgency) into Windows toast notifications
- Run automatically when Windows starts (or when X server starts)

### 3. Network Configuration
- If D-Bus listens on TCP port (e.g., 55555), ensure Windows Firewall allows localhost connections
- **OR** Set up SSH local port forwarding to tunnel D-Bus socket

### 4. Environment Variable Delivery
The Windows setup must provide the **D-Bus session bus address** that I need to set on the server side.

Example formats:
- `DBUS_SESSION_BUS_ADDRESS=tcp:host=localhost,port=55555`
- `DBUS_SESSION_BUS_ADDRESS=tcp:host=127.0.0.1,port=55555,family=ipv4`

This address will be:
- Set in my `~/.bashrc` or SSH environment
- **OR** Forwarded through SSH (e.g., `ssh -R 55555:localhost:55555`)

### 5. Testing/Validation
The deliverable should include a test command I can run from the server to verify it works:

```bash
# From EC2 server after SSH connection:
notify-send "Test Notification" "If you see this as a Windows toast, it works!"
```

Should produce a native Windows notification in the bottom-right corner (or wherever Windows notifications appear).

### 6. Auto-start Configuration
The D-Bus daemon and notification bridge should start automatically either:
- When Windows boots
- When VcXsrv starts
- When SSH connection is established

## Deliverables Needed From Them

1. **D-Bus address string** (the `DBUS_SESSION_BUS_ADDRESS` value)
2. **SSH port forwarding command** (if needed) - e.g., `ssh -R 55555:localhost:55555 user@host`
3. **Confirmation that test notification works** from server to Windows
4. **Documentation** of what they installed and how to restart it if it breaks

## What I'll Do On Server Side

Once they provide the D-Bus address, I'll:
1. Set `DBUS_SESSION_BUS_ADDRESS` in SSH environment
2. Configure hooks to use `notify-send` instead of xmessage
3. Test with actual PM2 restart events

---

**Bottom line:** They need to get D-Bus running on Windows, install a notification bridge (snoretoast recommended), and give you the connection string so `notify-send` commands from the server create Windows toasts.
