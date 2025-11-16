import { useState } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DirectoryNode } from "@/services/directoryBrowserClient";

interface DirectoryTreeProps {
  nodes: DirectoryNode[];
  selectedPath: string;
  onSelectPath: (path: string) => void;
  level?: number;
}

interface TreeNodeProps {
  node: DirectoryNode;
  selectedPath: string;
  onSelectPath: (path: string) => void;
  level: number;
}

function TreeNode({ node, selectedPath, onSelectPath, level }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(level === 0);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedPath === node.relativePath;
  const hasServerFiles = node.hasServerFiles || false;

  const handleClick = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
    onSelectPath(node.relativePath);
  };

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 py-2 px-3 rounded-md cursor-pointer hover:bg-accent transition-colors",
          isSelected && "bg-primary/10 border border-primary/20",
          hasServerFiles && "bg-green-50 dark:bg-green-950/20"
        )}
        style={{ paddingLeft: `${level * 1.5 + 0.75}rem` }}
        onClick={handleClick}
      >
        {hasChildren ? (
          <button
            className="p-0 hover:bg-transparent"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        ) : (
          <div className="w-4" />
        )}

        {isExpanded ? (
          <FolderOpen
            className={cn(
              "h-4 w-4",
              hasServerFiles ? "text-green-600" : "text-blue-500"
            )}
          />
        ) : (
          <Folder
            className={cn(
              "h-4 w-4",
              hasServerFiles ? "text-green-600" : "text-blue-500"
            )}
          />
        )}

        <span className="text-sm font-medium flex-1">{node.name}</span>

        {hasServerFiles && (
          <span
            className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full"
            title={
              node.serverFiles
                ? `Found: ${node.serverFiles.join(", ")}`
                : "Contains server files"
            }
          >
            ✓ Server files
          </span>
        )}
      </div>

      {isExpanded && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              selectedPath={selectedPath}
              onSelectPath={onSelectPath}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function DirectoryTree({
  nodes,
  selectedPath,
  onSelectPath,
  level = 0,
}: DirectoryTreeProps) {
  if (nodes.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-4 text-center">
        Keine Unterordner gefunden
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {nodes.map((node) => (
        <TreeNode
          key={node.path}
          node={node}
          selectedPath={selectedPath}
          onSelectPath={onSelectPath}
          level={level}
        />
      ))}
    </div>
  );
}
