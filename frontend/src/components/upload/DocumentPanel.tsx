"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Trash2, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  listDocuments,
  uploadDocument,
  deleteDocument,
  type Document,
} from "@/lib/api";

interface DocumentPanelProps {
  onDocumentsChange?: (docs: Document[]) => void;
}

export function DocumentPanel({ onDocumentsChange }: DocumentPanelProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      const docs = await listDocuments();
      setDocuments(docs);
      onDocumentsChange?.(docs);
    } catch (err) {
      console.error("Failed to load documents:", err);
    } finally {
      setLoading(false);
    }
  }, [onDocumentsChange]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files);
      for (const file of arr) {
        try {
          setUploading(true);
          const result = await uploadDocument(file);
          toast.success(`Uploaded ${result.document.name}`, {
            description: `${result.document.pages_parsed} pages · ${result.document.chunks_added} chunks`,
          });
        } catch (err) {
          toast.error(`Failed: ${file.name}`, {
            description: err instanceof Error ? err.message : "Unknown error",
          });
        } finally {
          setUploading(false);
        }
      }
      await refresh();
    },
    [refresh]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleDelete = useCallback(
    async (id: string, name: string) => {
      try {
        await deleteDocument(id);
        toast.success(`Removed ${name}`);
        await refresh();
      } catch {
        toast.error("Delete failed");
      }
    },
    [refresh]
  );

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-3 text-center transition-all ${
          isDragging
            ? "border-cyan-400 bg-cyan-400/10"
            : "border-cyan-400/20 hover:border-cyan-400/40 hover:bg-cyan-400/5"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt,.md,.csv,.xlsx,.xls,.json"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
        />
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-xs text-cyan-300">
            <Loader2 size={14} className="animate-spin" />
            Uploading...
          </div>
        ) : (
          <>
            <Upload size={16} className="mx-auto mb-1 text-cyan-400" />
            <p className="text-xs text-slate-400">
              Drop files or <span className="text-cyan-400">browse</span>
            </p>
            <p className="mt-0.5 text-[10px] text-slate-500">
              PDF · DOCX · TXT · CSV · XLSX
            </p>
          </>
        )}
      </div>

      {loading ? (
        <div className="px-3 py-2 text-xs text-slate-500">Loading...</div>
      ) : documents.length === 0 ? (
        <p className="px-3 py-2 text-xs text-slate-500">
          No documents yet.
        </p>
      ) : (
        <div className="space-y-1">
          {documents.map((doc) => (
            <div
              key={doc.document_id}
              className="group flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-400 hover:bg-white/5"
            >
              <FileText size={14} className="shrink-0 text-cyan-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-slate-300">{doc.name}</p>
                <p className="text-[10px] text-slate-500">{doc.chunks} chunks</p>
              </div>
              <button
                onClick={() => handleDelete(doc.document_id, doc.name)}
                className="rounded p-1 opacity-0 transition-opacity hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                aria-label={`Delete ${doc.name}`}
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}