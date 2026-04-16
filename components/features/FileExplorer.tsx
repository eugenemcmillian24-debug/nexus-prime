"use client";

import { useState, useCallback } from "react";
import {
  Folder,
  FileCode,
  FilePlus,
  FolderPlus,
  Trash2,
  PencilLine,
  ChevronRight,
  ChevronDown,
  FileJson,
  FileType,
  Braces,
  File,
} from "lucide-react";

interface FileNode {
  name: string;
  path: string;
  type: "file" | "folder";
  children?: FileNode[];
  language?: string;
}

interface FileExplorerProps {
  files: { path: string; content: string; language?: string }[];
  activeFile: string;
  onSelectFile: (path: string) => void;
  onCreateFile: (path: string) => void;
  onDeleteFile: (path: string) => void;
  onRenameFile: (oldPath: string, newPath: string) => void;
  readOnly?: boolean;
}

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "ts":
    case "tsx":
      return <FileCode size={14} className="text-blue-400" />;
    case "js":
    case "jsx":
      return <FileCode size={14} className="text-yellow-400" />;
    case "json":
      return <FileJson size={14} className="text-green-400" />;
    case "css":
    case "scss":
      return <FileType size={14} className="text-purple-400" />;
    case "html":
      return <Braces size={14} className="text-orange-400" />;
    default:
      return <File size={14} className="text-[#555]" />;
  }
}

function buildTree(files: { path: string }[]): FileNode[] {
  const root: FileNode[] = [];
  const folderMap = new Map<string, FileNode>();

  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path));

  for (const file of sorted) {
    const parts = file.path.split("/");
    let currentPath = "";

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (i === parts.length - 1) {
        // File
        const node: FileNode = { name: part, path: file.path, type: "file" };
        if (parentPath && folderMap.has(parentPath)) {
          folderMap.get(parentPath)!.children!.push(node);
        } else {
          root.push(node);
        }
      } else {
        // Folder
        if (!folderMap.has(currentPath)) {
          const folder: FileNode = {
            name: part,
            path: currentPath,
            type: "folder",
            children: [],
          };
          folderMap.set(currentPath, folder);
          if (parentPath && folderMap.has(parentPath)) {
            folderMap.get(parentPath)!.children!.push(folder);
          } else {
            root.push(folder);
          }
        }
      }
    }
  }

  return root;
}

function TreeNode({
  node,
  depth,
  activeFile,
  onSelectFile,
  onDeleteFile,
  onRenameFile,
  readOnly,
}: {
  node: FileNode;
  depth: number;
  activeFile: string;
  onSelectFile: (path: string) => void;
  onDeleteFile: (path: string) => void;
  onRenameFile: (oldPath: string, newPath: string) => void;
  readOnly?: boolean;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(node.name);
  const [showActions, setShowActions] = useState(false);
  const isActive = node.type === "file" && node.path === activeFile;

  const handleRename = () => {
    if (newName && newName !== node.name) {
      const parentPath = node.path.split("/").slice(0, -1).join("/");
      const newPath = parentPath ? `${parentPath}/${newName}` : newName;
      onRenameFile(node.path, newPath);
    }
    setIsRenaming(false);
  };

  return (
    <div>
      <div
        className={`flex items-center gap-1 px-2 py-1 cursor-pointer group transition-colors ${
          isActive
            ? "bg-[#00ff8815] text-[#00ff88]"
            : "text-[#888] hover:text-white hover:bg-[#ffffff08]"
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
        onClick={() => {
          if (node.type === "folder") setExpanded(!expanded);
          else onSelectFile(node.path);
        }}
      >
        {node.type === "folder" ? (
          expanded ? (
            <ChevronDown size={12} />
          ) : (
            <ChevronRight size={12} />
          )
        ) : null}
        {node.type === "folder" ? (
          <Folder size={14} className="text-[#00ff88]/60" />
        ) : (
          getFileIcon(node.name)
        )}
        {isRenaming ? (
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
              if (e.key === "Escape") setIsRenaming(false);
            }}
            className="bg-[#1a1a1a] text-white text-xs px-1 py-0.5 rounded border border-[#333] outline-none flex-1"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="text-xs truncate flex-1">{node.name}</span>
        )}
        {showActions && !readOnly && !isRenaming && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsRenaming(true);
                setNewName(node.name);
              }}
              className="hover:text-[#00ff88] p-0.5"
            >
              <PencilLine size={10} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteFile(node.path);
              }}
              className="hover:text-red-400 p-0.5"
            >
              <Trash2 size={10} />
            </button>
          </div>
        )}
      </div>
      {node.type === "folder" && expanded && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              activeFile={activeFile}
              onSelectFile={onSelectFile}
              onDeleteFile={onDeleteFile}
              onRenameFile={onRenameFile}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FileExplorer({
  files,
  activeFile,
  onSelectFile,
  onCreateFile,
  onDeleteFile,
  onRenameFile,
  readOnly,
}: FileExplorerProps) {
  const [showNewFile, setShowNewFile] = useState(false);
  const [newFilePath, setNewFilePath] = useState("");

  const tree = buildTree(files);

  const handleCreateFile = () => {
    if (newFilePath.trim()) {
      onCreateFile(newFilePath.trim());
      setNewFilePath("");
      setShowNewFile(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a] border-r border-[#1a1a1a]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1a1a1a]">
        <span className="text-[10px] uppercase font-bold tracking-widest text-[#555]">
          Explorer
        </span>
        {!readOnly && (
          <div className="flex gap-1">
            <button
              onClick={() => setShowNewFile(true)}
              className="text-[#555] hover:text-[#00ff88] p-1 transition-colors"
              title="New File"
            >
              <FilePlus size={14} />
            </button>
          </div>
        )}
      </div>

      {/* New file input */}
      {showNewFile && (
        <div className="px-2 py-2 border-b border-[#1a1a1a]">
          <input
            value={newFilePath}
            onChange={(e) => setNewFilePath(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateFile();
              if (e.key === "Escape") setShowNewFile(false);
            }}
            placeholder="path/to/file.tsx"
            className="w-full bg-[#111] text-white text-xs px-2 py-1.5 rounded border border-[#333] outline-none focus:border-[#00ff88]/50 placeholder-[#333]"
            autoFocus
          />
        </div>
      )}

      {/* File tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {tree.map((node) => (
          <TreeNode
            key={node.path}
            node={node}
            depth={0}
            activeFile={activeFile}
            onSelectFile={onSelectFile}
            onDeleteFile={onDeleteFile}
            onRenameFile={onRenameFile}
            readOnly={readOnly}
          />
        ))}
        {files.length === 0 && (
          <div className="text-[#333] text-xs text-center py-8">
            No files yet
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="px-3 py-2 border-t border-[#1a1a1a] text-[10px] text-[#333]">
        {files.length} file{files.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
