# CS2 Skin Studio Desktop Application

A Tauri-based desktop application for CS2 Skin Studio with native file system access, local database storage, and Steam authentication.

## Features

- Custom window frame with minimize, maximize, and close buttons
- Local SQLite database for settings and project storage
- Steam authentication integration via website
- Native file system access for fast rendering
- Cross-platform support (Windows, macOS, Linux)

## Project Structure

```
desktop-app/
├── src-tauri/
│   ├── src/
│   │   ├── main.rs       # Tauri application entry point
│   │   ├── commands.rs   # Tauri commands for frontend
│   │   ├── database.rs   # SQLite database operations
│   │   └── auth.rs       # Steam authentication
│   ├── Cargo.toml        # Rust dependencies
│   ├── tauri.conf.json   # Tauri configuration
│   └── build.rs          # Build script
└── README.md
```

## Prerequisites

### Windows
- [Microsoft Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
- [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (usually pre-installed on Windows 10/11)

### macOS
- Xcode Command Line Tools
```bash
xcode-select --install
```

### Linux (Debian/Ubuntu)
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libssl-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  libglib2.0-dev \
  libcairo2-dev \
  libpango1.0-dev \
  libgdk-pixbuf2.0-dev \
  libatk1.0-dev
```

### Linux (Fedora)
```bash
sudo dnf install webkit2gtk4.1-devel \
  openssl-devel \
  curl \
  wget \
  file \
  gtk3-devel \
  libappindicator-gtk3-devel \
  librsvg2-devel \
  glib2-devel \
  cairo-devel \
  pango-devel \
  gdk-pixbuf2-devel \
  atk-devel
```

## Setup

1. Install Rust:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

2. Install Tauri CLI:
```bash
cargo install tauri-cli
```

3. Build the frontend:
```bash
cd ../frontend
npm install
npm run build
cp -r .next/static ../desktop-app/frontend-dist
```

4. Build the desktop app:
```bash
cd ../desktop-app/src-tauri
cargo tauri build
```

## Development

Run in development mode:
```bash
# Terminal 1: Start the frontend
cd frontend
npm run dev

# Terminal 2: Start Tauri dev mode
cd desktop-app/src-tauri
cargo tauri dev
```

## Configuration

The app stores data in:
- **Windows**: `%APPDATA%\com.cs2skinstudio.app\`
- **macOS**: `~/Library/Application Support/com.cs2skinstudio.app/`
- **Linux**: `~/.local/share/com.cs2skinstudio.app/`

## Tauri Commands

Available commands from the frontend:

### Window Controls
- `minimize_window` - Minimize the window
- `maximize_window` - Maximize/restore the window
- `close_window` - Close the window
- `toggle_fullscreen` - Toggle fullscreen mode

### File System
- `read_file(path)` - Read file contents
- `write_file(path, contents)` - Write to file
- `list_directory(path)` - List directory contents
- `create_directory(path)` - Create a directory
- `delete_file(path)` - Delete a file or directory
- `file_exists(path)` - Check if file exists
- `get_file_info(path)` - Get file metadata

### Project Management
- `save_project(id, name, data, thumbnail)` - Save a project
- `load_project(id)` - Load a project
- `list_projects()` - List all projects
- `delete_project(id)` - Delete a project
- `export_image(path, data, format)` - Export an image

### Authentication
- `get_steam_auth_url()` - Get Steam login URL
- `handle_steam_callback(params)` - Handle Steam callback
- `get_user_info()` - Get current user info
- `logout()` - Log out user
- `is_authenticated()` - Check if authenticated

### Settings
- `get_settings()` - Get app settings
- `save_settings(settings)` - Save app settings

### System
- `get_system_info()` - Get system information
- `check_gpu_support()` - Check GPU acceleration support

## Frontend Integration

Use the `TauriAPI` helper from `@/components/studio/window-frame.tsx`:

```typescript
import { TauriAPI, WindowFrame } from '@/components/studio/window-frame';

// Wrap your app with WindowFrame for custom title bar
function App() {
  return (
    <WindowFrame title="CS2 Skin Studio">
      <YourContent />
    </WindowFrame>
  );
}

// Use TauriAPI for native operations
async function saveProject() {
  if (TauriAPI.isAvailable) {
    await TauriAPI.saveProject('id', 'name', JSON.stringify(data), thumbnail);
  }
}
```

## Building for Production

```bash
cd src-tauri
cargo tauri build
```

The built application will be in `src-tauri/target/release/bundle/`.
