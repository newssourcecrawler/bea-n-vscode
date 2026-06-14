# bea-n

bea-n is a local VS Code wrapper for the `bea-n` CLI.

It reads selected editor text, sends that text to the local `bea-n` binary, and shows a small case report for path, message, and device failure evidence.

It is built for noisy developer environments where logs mention Kafka, MQTT, HTTP, DNS, TLS, Bluetooth, IoT devices, or generic path failures.

## What it does

- Reads selected text from the active editor.
- Runs the local `bea-n` CLI in read-only mode.
- Shows a readable case report in a VS Code panel.
- Copies a bounded prompt packet for assistant handoff.

## What it does not do

bea-n does not connect to brokers, networks, DNS, Bluetooth devices, infrastructure, or services.

It does not collect credentials, rewrite code, rewrite configuration, apply fixes, or perform admin actions.

## CLI requirement

This extension requires the local `bea-n` CLI to be installed separately.

On macOS, install with Homebrew:

```sh
brew tap newssourcecrawler/tap
brew trust newssourcecrawler/tap
brew install bea-n
```

The extension looks for the CLI at:

```text
~/.local/bin/bea-n
/opt/homebrew/bin/bea-n
/usr/local/bin/bea-n
```

You can also set a custom path with:

```json
"beaN.binaryPath": "/path/to/bea-n"
```

The extension does not download or run remote code automatically.

## Usage

1. Open a file containing failure evidence.
2. Select the relevant log or error text.
3. Run `Bea-N: Read Selected Text` from the Command Palette.
4. Review the case report.
5. Use `Copy Prompt Packet` if you want to hand the bounded evidence to an assistant.

## Example

Selected text:

```text
TLS handshake failed: certificate verify failed: unknown CA
```

Example report:

```text
Bea-N case report
Source: selected text only
Mode: local read-only case formation

Family: tls
Failure layer: tls_handshake
Formed status: enough
Next move: settle

Primary signal:
TLS handshake failed: certificate verify failed: unknown CA

Blocked move:
changing application protocol code before confirming certificate trust, hostname, and TLS boundary

Evidence:
- TLS handshake failed: certificate verify failed: unknown CA
```

## Supported evidence areas

bea-n can form cases for evidence involving:

- Kafka
- MQTT
- HTTP
- DNS
- TLS
- Bluetooth
- IoT device and gateway paths
- Generic path failures

## Boundary

bea-n is a simplifier for noisy evidence. It does not solve the issue for you, change your project, or touch your infrastructure.

Its job is to help identify the failed path layer and the next verification boundary before a developer spends time in the wrong place.
