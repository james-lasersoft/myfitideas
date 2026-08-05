export type WorkspaceId = "personal" | "organization" | "operations";

interface WorkspaceSelection {
  workspace: WorkspaceId;
  selectedOn: string;
}

const STORAGE_KEY = "myfitideas.workspace.selection";

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function readWorkspaceSelection(): WorkspaceSelection | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<WorkspaceSelection>;
    if ((value.workspace !== "personal" && value.workspace !== "organization" && value.workspace !== "operations") || typeof value.selectedOn !== "string") return null;
    return { workspace: value.workspace, selectedOn: value.selectedOn };
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function rememberWorkspace(workspace: WorkspaceId): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ workspace, selectedOn: localDateKey() }));
}

export function requiresDailyChoice(hasOrganizationWorkspace: boolean): boolean {
  if (!hasOrganizationWorkspace) return false;
  return readWorkspaceSelection()?.selectedOn !== localDateKey();
}

export function workspacePath(workspace: WorkspaceId): string {
  if (workspace === "operations") return "/system-operations";
  return workspace === "organization" ? "/admin" : "/dashboard";
}
