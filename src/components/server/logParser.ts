export function parseLogLineClassName(line: string): string {
  const checks = {
    isCritical: /Server stopped|exit code:|Stopping server/.test(line),
    isError: /\[ERROR\]|ERROR:|Exception|java\.lang\.|Caused by:/.test(line),
    isWarning: /\[WARN\]|WARN:|WARNING/.test(line),
    isPlayerJoin: /joined the game|left the game/.test(line),
    isServerMessage: /Server thread\/|\[Server thread\]/.test(line),
    isInfo: /\[INFO\]|INFO:/.test(line),
  };

  let className = "whitespace-pre-wrap font-mono text-sm";

  if (checks.isCritical) {
    className += " text-red-400 font-semibold";
  } else if (checks.isError) {
    className += " text-red-300";
  } else if (checks.isWarning) {
    className += " text-yellow-400";
  } else if (checks.isPlayerJoin) {
    className += " text-blue-300";
  } else if (checks.isServerMessage) {
    className += " text-green-300";
  } else if (checks.isInfo) {
    className += " text-gray-300";
  } else {
    className += " text-green-400";
  }

  return className;
}
