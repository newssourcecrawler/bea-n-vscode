import * as vscode from "vscode";
import { spawn } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand("bean.readSelectedText", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showInformationMessage("Open a file and select bea-n evidence text first.");
      return;
    }

    const selectedText = editor.document.getText(editor.selection);
    if (!selectedText.trim()) {
      vscode.window.showInformationMessage("Select bea-n evidence text first.");
      return;
    }

    const binaryPath = resolveBinaryPath();
    if (!binaryPath) {
      vscode.window.showErrorMessage(
        "bea-n CLI is not installed. Install it with Homebrew or set beaN.binaryPath."
      );
      return;
    }

    try {
      const output = await runBeaN(binaryPath, selectedText);
      const parsed = parseBeaNOutput(output);
      showReport(parsed.reportText, parsed.promptPacket);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`bea-n failed: ${message}`);
    }
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}

function resolveBinaryPath(): string | undefined {
  const configured = vscode.workspace.getConfiguration("beaN").get<string>("binaryPath")?.trim();
  const candidates = [
    configured,
    path.join(os.homedir(), ".local", "bin", "bea-n"),
    "/opt/homebrew/bin/bea-n",
    "/usr/local/bin/bea-n",
  ].filter((candidate): candidate is string => Boolean(candidate));

  return candidates.find((candidate) => {
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      return true;
    } catch {
      return false;
    }
  });
}

function runBeaN(binaryPath: string, evidenceText: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(binaryPath, ["read", "auto", "--format", "json"], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });

    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });

    child.on("error", reject);

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `bea-n exited with code ${code}`));
        return;
      }
      resolve(stdout.trim());
    });

    child.stdin.write(evidenceText);
    child.stdin.end();
  });
}

interface ParsedBeaNOutput {
  reportText: string;
  promptPacket: string;
}

function parseBeaNOutput(output: string): ParsedBeaNOutput {
  try {
    const root = JSON.parse(output);
    const failureCase = root.case ?? {};
    const evidenceLines = Array.isArray(failureCase.evidence_lines)
      ? failureCase.evidence_lines.map((line: unknown) => `- ${String(line)}`).join("\n")
      : "-";

    const reportText = [
      "Bea-N case report",
      "Source: selected text only",
      "Mode: local read-only case formation",
      "",
      `Family: ${failureCase.family ?? "-"}`,
      `Failure layer: ${failureCase.layer ?? "-"}`,
      `Formed status: ${failureCase.formed_status ?? "-"}`,
      `Next move: ${failureCase.next_move ?? "-"}`,
      "",
      "Primary signal:",
      String(failureCase.primary_signal ?? "-"),
      "",
      "Blocked move:",
      String(failureCase.blocked_move ?? "-"),
      "",
      "Evidence:",
      evidenceLines,
    ].join("\n");

    return {
      reportText,
      promptPacket: typeof root.prompt_packet === "string" ? root.prompt_packet : output,
    };
  } catch {
    return {
      reportText: output,
      promptPacket: output,
    };
  }
}

function showReport(reportText: string, promptPacket: string) {
  const panel = vscode.window.createWebviewPanel(
    "beaNReport",
    "bea-n case report",
    vscode.ViewColumn.Beside,
    { enableScripts: true }
  );

  panel.webview.html = renderReportHtml(reportText, promptPacket);

  panel.webview.onDidReceiveMessage(async (message) => {
    if (message?.type === "copyPromptPacket") {
      await vscode.env.clipboard.writeText(promptPacket);
      vscode.window.showInformationMessage("bea-n prompt packet copied.");
    }
  });
}

function renderReportHtml(reportText: string, promptPacket: string): string {
  const escapedReport = escapeHtml(reportText);
  const escapedPromptPacket = escapeHtml(promptPacket);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>bea-n case report</title>
    <style>
      body { font-family: var(--vscode-font-family); padding: 16px; }
      pre { white-space: pre-wrap; line-height: 1.45; }
      button { margin-top: 12px; }
    </style>
  </head>
  <body>
    <pre>${escapedReport}</pre>
    <button id="copy">Copy Prompt Packet</button>
    <script>
      const vscode = acquireVsCodeApi();
      document.getElementById('copy').addEventListener('click', () => {
        vscode.postMessage({ type: 'copyPromptPacket', promptPacket: ${JSON.stringify(escapedPromptPacket)} });
      });
    </script>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
