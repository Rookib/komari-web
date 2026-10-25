import { quoteShellArg, quoteShellArgs } from "./shellQuote.ts";

export const SAFE_AGENT_INSTALL_URL =
  "https://raw.githubusercontent.com/Rookib/tcpping/main/install.sh";

// The reviewed release provides Linux amd64/arm64 binaries only. Do not fall
// back to the upstream installer or Docker image for unsupported platforms.
export function generateSafeAgentInstallCommand(args: string[], proxy = "") {
  const trimmedProxy = proxy.trim().replace(/\/+$/, "");
  const proxyUrl = /^https?:\/\//i.test(trimmedProxy)
    ? trimmedProxy
    : `https://${trimmedProxy}`;
  const scriptUrl = trimmedProxy
    ? `${proxyUrl}/${SAFE_AGENT_INSTALL_URL.replace(/^https?:\/\//, "")}`
    : SAFE_AGENT_INSTALL_URL;
  const safeArgs = [...args, "--disable-web-ssh", "--disable-auto-update"];
  return `curl -fsSL ${quoteShellArg(scriptUrl)} | sudo bash -s -- ${quoteShellArgs(safeArgs)}`;
}
