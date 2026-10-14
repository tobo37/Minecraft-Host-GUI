/**
 * Kill a process together with all of its descendants.
 *
 * Servers are launched through a wrapper (`bash -c ... start.sh` or
 * `cmd /c call start.bat`), so killing only the wrapper leaves the Java
 * process running as an orphan that still holds the world's session.lock.
 */

import { readdir, readFile } from "fs/promises";
import { logger } from "@/lib/logger";

/**
 * Collect all descendant PIDs of `rootPid` (children before their parents)
 */
async function findDescendantPids(rootPid: number): Promise<number[]> {
  const childrenByParent = new Map<number, number[]>();

  if (process.platform === "linux") {
    const entries = await readdir("/proc");
    for (const entry of entries) {
      if (!/^\d+$/.test(entry)) continue;
      try {
        // Format: "pid (comm) state ppid ..."; comm may contain spaces,
        // so parse from the last closing parenthesis.
        const stat = await readFile(`/proc/${entry}/stat`, "utf8");
        const fields = stat.slice(stat.lastIndexOf(")") + 2).split(" ");
        const ppid = Number(fields[1]);
        const siblings = childrenByParent.get(ppid) || [];
        siblings.push(Number(entry));
        childrenByParent.set(ppid, siblings);
      } catch {
        // Process exited while scanning
      }
    }
  } else {
    // macOS and other Unix systems without /proc
    const ps = Bun.spawn(["ps", "-A", "-o", "pid=,ppid="], { stdout: "pipe" });
    const output = await new Response(ps.stdout).text();
    for (const line of output.split("\n")) {
      const [pid, ppid] = line.trim().split(/\s+/).map(Number);
      if (!pid || ppid === undefined) continue;
      const siblings = childrenByParent.get(ppid) || [];
      siblings.push(pid);
      childrenByParent.set(ppid, siblings);
    }
  }

  const result: number[] = [];
  const visit = (pid: number) => {
    for (const child of childrenByParent.get(pid) || []) {
      visit(child);
      result.push(child);
    }
  };
  visit(rootPid);
  return result;
}

/**
 * Forcefully kill a process and its whole process tree
 */
export async function killProcessTree(rootPid: number): Promise<void> {
  if (process.platform === "win32") {
    await Bun.spawn(["taskkill", "/PID", String(rootPid), "/T", "/F"], {
      stdout: "ignore",
      stderr: "ignore",
    }).exited;
    return;
  }

  let pids: number[] = [];
  try {
    pids = await findDescendantPids(rootPid);
  } catch (error) {
    logger.warn(`Could not list child processes of ${rootPid}: ${error}`);
  }

  for (const pid of [...pids, rootPid]) {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // Already gone
    }
  }
}
