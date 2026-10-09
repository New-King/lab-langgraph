export function languageFromPath(path?: string): string {
  if (!path || path === "终端") return "bash";
  if (path.endsWith(".tsx")) return "tsx";
  if (path.endsWith(".ts")) return "typescript";
  if (path.endsWith(".json")) return "json";
  if (path.endsWith(".md")) return "markdown";
  if (path.endsWith(".env.local") || path.endsWith(".env")) return "plaintext";
  return "typescript";
}
