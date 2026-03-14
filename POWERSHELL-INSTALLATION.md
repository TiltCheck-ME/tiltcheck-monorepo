<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-03-14 -->

# PowerShell 7 Installation Guide for Windows

## Quick Install (Recommended)

### Method 1: Using Windows Package Manager (Fastest)

If you have Windows 10/11 with winget installed:

```batch
winget install Microsoft.PowerShell
```

Then verify installation:

```batch
pwsh --version
```

Should output: `PowerShell 7.x.x`

---

### Method 2: Using Chocolatey

If you have Chocolatey installed:

```batch
choco install powershell-core
```

Then verify:

```batch
pwsh --version
```

---

### Method 3: Direct Download from Microsoft (Most Reliable)

1. **Download the MSI installer:**
   - Go to https://github.com/PowerShell/PowerShell/releases
   - Download the latest stable release (look for `PowerShell-7.x.x-win-x64.msi`)
   - Current stable: PowerShell 7.4.1

2. **Install the MSI file:**
   - Double-click the downloaded `.msi` file
   - Follow the installer wizard
   - **IMPORTANT:** During installation, check the box for "Add PowerShell to PATH"
   - Complete the installation

3. **Verify Installation:**
   
   Open a NEW Command Prompt (important - new window!) and type:
   
   ```batch
   pwsh --version
   ```
   
   Should output:
   ```
   PowerShell 7.4.1
   Copyright (c) Microsoft Corporation.
   
   https://aka.ms/powershell
   ```

---

## Detailed Steps (Method 3 - Most Reliable)

### Step 1: Download PowerShell 7

Open your browser and go to:
```
https://github.com/PowerShell/PowerShell/releases
```

Look for the latest release (e.g., "v7.4.1") and download:
- **File name:** `PowerShell-7.x.x-win-x64.msi` (64-bit, recommended)
- Or `PowerShell-7.x.x-win-x86.msi` (32-bit, if your Windows is 32-bit)

This will download to your Downloads folder.

### Step 2: Run the Installer

1. Open File Explorer
2. Navigate to your Downloads folder
3. Double-click `PowerShell-7.x.x-win-x64.msi`
4. Windows will ask "Do you want to allow this app to make changes?" → Click **Yes**

### Step 3: Follow the Installer Wizard

1. **Welcome Page** → Click **Next**
2. **License Agreement** → Check "I accept the terms" → Click **Next**
3. **Installation Options** → LEAVE DEFAULTS (don't need to customize)
   - Just click **Next**
4. **Add PowerShell to PATH** → ✅ Make sure this is CHECKED
   - This is critical for the Copilot CLI to find pwsh
   - Click **Next**
5. **Ready to Install** → Click **Install**
6. **Installation Complete** → Click **Finish**

### Step 4: Verify Installation (IMPORTANT - Open NEW Command Prompt)

Close any Command Prompt windows you currently have open, then:

1. **Press Windows key + R**
2. Type `cmd.exe` and press Enter (opens a NEW command prompt)
3. Type this command:

```batch
pwsh --version
```

**Expected output:**
```
PowerShell 7.4.1
Copyright (c) Microsoft Corporation.

https://aka.ms/powershell
```

If you see this, PowerShell is correctly installed and in PATH. ✅

If you get `'pwsh' is not recognized...`, then:
- The PATH setting wasn't applied
- Try adding it manually (see below)

---

## Manual PATH Configuration (If Needed)

If `pwsh --version` doesn't work after installation:

### Option A: Add to PATH via GUI

1. **Press Windows key + R**
2. Type `sysdm.cpl` and press Enter
3. Click **Environment Variables** button (bottom right)
4. Under "System variables", find `Path` and click **Edit**
5. Click **New** and add:
   ```
   C:\Program Files\PowerShell\7
   ```
6. Click **OK** three times
7. Close and restart Command Prompt

### Option B: Add to PATH via Command Prompt (Admin)

Open Command Prompt as Administrator and run:

```batch
setx PATH "%PATH%;C:\Program Files\PowerShell\7"
```

Then restart Command Prompt and test:

```batch
pwsh --version
```

---

## Verify PATH is Set Correctly

In Command Prompt, run:

```batch
where pwsh
```

Should output:
```
C:\Program Files\PowerShell\7\pwsh.exe
```

If it outputs the path, you're good to go. ✅

---

## Quick Checklist

- [ ] Downloaded PowerShell 7 MSI from GitHub
- [ ] Ran the installer
- [ ] Checked "Add PowerShell to PATH" during installation
- [ ] Opened a NEW Command Prompt window
- [ ] Ran `pwsh --version` and saw version 7.x.x
- [ ] Ran `where pwsh` and saw the installation path

Once all checkboxes are ✅, PowerShell is ready for the Copilot CLI to use.

---

## Troubleshooting

**Problem:** `pwsh' is not recognized as an internal or external command`

**Solution:**
1. Ensure you opened a NEW Command Prompt after installation (not the old window)
2. Verify installation path exists: Open File Explorer and navigate to `C:\Program Files\PowerShell\7`
3. If folder exists, manually add to PATH (see Manual PATH Configuration above)
4. If folder doesn't exist, reinstall with the MSI and make sure to check "Add to PATH"

**Problem:** Installation fails with "Access Denied"

**Solution:**
1. Right-click the `.msi` file
2. Select "Run as administrator"
3. Complete the installation

**Problem:** Multiple PowerShell versions installed

**Solution:** Don't worry - having PowerShell 5 (built-in) and PowerShell 7 (new install) coexist is fine. The Copilot CLI will find PowerShell 7 first since it should be in PATH.

---

## After Installation

Once PowerShell 7 is installed and in PATH, come back here and I can execute all the git commands automatically.

**Made for Degens. By Degens.**

© 2024–2026 TiltCheck Ecosystem. All Rights Reserved.
