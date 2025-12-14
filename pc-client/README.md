# Alice PC Client

A Rust application that connects to the bgalin.ru server and receives commands from the Alice Smart Home system.

## Features

- Polls the server for pending commands
- Executes commands locally on your PC
- Reports results back to the server
- Cross-platform support (Windows, Linux, macOS)

## Supported Commands

| Command | Description |
|---------|-------------|
| `Shutdown` | Shuts down the PC |
| `Restart` | Restarts the PC |
| `Lock` | Locks the workstation |
| `Notification` | Shows a desktop notification |
| `OpenUrl` | Opens a URL in the default browser |
| `Volume` | Control system volume (mute/set) |
| `Screenshot` | Takes a screenshot |
| `RunCommand` | Runs a custom command (with safety checks) |
| `Custom` | Custom extensible commands |

## Installation

### From Source

```bash
cd pc-client
cargo build --release
```

The binary will be at `target/release/alice-pc-client` (or `.exe` on Windows).

## Configuration

### Command Line Arguments

```
Usage: alice-pc-client [OPTIONS]

Options:
  -s, --server <SERVER>      Server URL [default: https://bgalin.ru]
  -a, --api-key <API_KEY>    API key for authentication [env: ALICE_PC_API_KEY]
  -c, --config <CONFIG>      Config file path
  -i, --interval <INTERVAL>  Poll interval in seconds [default: 5]
      --once                 Run once and exit (don't loop)
  -v, --verbose              Verbose output
  -h, --help                 Print help
  -V, --version              Print version
```

### Config File

Create a config file at `~/.config/alice-pc-client/config.toml`:

```toml
server = "https://bgalin.ru"
api_key = "your_api_key_here"
interval = 5
```

### Environment Variable

You can also set the API key via environment variable:

```bash
export ALICE_PC_API_KEY="your_api_key_here"
```

## Getting an API Key

1. Log in to the admin panel at https://bgalin.ru/admin/alice
2. Go to "PC Clients" section
3. Click "Register New Client"
4. Enter a name for your PC
5. Copy the generated API key

## Running

### Basic Usage

```bash
# With API key as argument
./alice-pc-client --api-key "pc_xxxxxxxxxxxxx"

# With environment variable
export ALICE_PC_API_KEY="pc_xxxxxxxxxxxxx"
./alice-pc-client

# With verbose output
./alice-pc-client -v

# Custom poll interval (10 seconds)
./alice-pc-client -i 10
```

### Running as a Service (Linux)

Create `/etc/systemd/system/alice-pc-client.service`:

```ini
[Unit]
Description=Alice PC Client
After=network.target

[Service]
Type=simple
User=your_username
Environment=ALICE_PC_API_KEY=your_api_key
ExecStart=/usr/local/bin/alice-pc-client
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable alice-pc-client
sudo systemctl start alice-pc-client
```

### Running on Startup (Windows)

1. Create a shortcut to `alice-pc-client.exe`
2. Press Win+R, type `shell:startup`
3. Move the shortcut to the Startup folder
4. Edit the shortcut target to include your API key:
   ```
   "C:\path\to\alice-pc-client.exe" --api-key "your_key"
   ```

## API Endpoints

The client communicates with these server endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/alice/pc/poll` | GET | Poll for pending commands |
| `/api/alice/pc/result` | POST | Report command result |
| `/api/alice/pc/heartbeat` | POST | Send heartbeat |

## Security

- All communication is over HTTPS
- API key authentication required
- Dangerous commands (rm, del, format, etc.) are blocked
- Commands are validated before execution

## Troubleshooting

### Connection Issues

- Check your internet connection
- Verify the API key is correct
- Ensure the server is accessible

### Permission Issues

- Some commands (shutdown, restart) may require admin/root privileges
- On Linux, you may need to add your user to the appropriate groups

### Logs

Run with `-v` flag for verbose output to debug issues.

## License

MIT
