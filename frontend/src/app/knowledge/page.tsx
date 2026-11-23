"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  FileText,
  Upload,
  Search,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  Database,
  Layers,
  Sparkles,
  RefreshCw,
  FileCode,
  FileSpreadsheet,
  X,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { api } from "@/lib/api";
import { DocumentItem, DocumentDetail, DocumentSearchResult } from "@/types";

export default function KnowledgeBasePage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDescription, setFileDescription] = useState<string>("");

  // Inspect Modal
  const [activeDocDetail, setActiveDocDetail] = useState<DocumentDetail | null>(null);
  const [inspectLoading, setInspectLoading] = useState<boolean>(false);

  // Vector Search Playground
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchTopK, setSearchTopK] = useState<number>(3);
  const [selectedSearchDocId, setSelectedSearchDocId] = useState<number | undefined>(undefined);
  const [searchResults, setSearchResults] = useState<DocumentSearchResult[] | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const docs = await api.getDocuments();
      setDocuments(docs);
    } catch (err: any) {
      console.error("Failed to load documents", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 15 * 1024 * 1024) {
        setUploadError("File exceeds maximum allowed size (15 MB).");
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setUploadError(null);
      setUploadSuccess(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    try {
      setUploading(true);
      setUploadError(null);
      setUploadSuccess(null);

      const res = await api.uploadDocument(selectedFile, fileDescription);
      setUploadSuccess(`Successfully indexed "${res.filename}" into ${res.chunk_count} vector chunks!`);
      setSelectedFile(null);
      setFileDescription("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadDocuments();
    } catch (err: any) {
      setUploadError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: number, filename: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${filename}" and its vector chunks?`)) {
      return;
    }
    try {
      await api.deleteDocument(docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      if (activeDocDetail?.id === docId) {
        setActiveDocDetail(null);
      }
      if (searchResults) {
        setSearchResults((prev) => (prev ? prev.filter((r) => r.document_id !== docId) : null));
      }
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleInspect = async (docId: number) => {
    try {
      setInspectLoading(true);
      const detail = await api.getDocument(docId);
      setActiveDocDetail(detail);
    } catch (err: any) {
      alert(`Failed to load document chunks: ${err.message}`);
    } finally {
      setInspectLoading(false);
    }
  };

  const handleVectorSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setIsSearching(true);
      setSearchError(null);
      const res = await api.searchDocuments(searchQuery.trim(), searchTopK, selectedSearchDocId);
      setSearchResults(res);
    } catch (err: any) {
      setSearchError(err.message || "Search failed");
      setSearchResults(null);
    } finally {
      setIsSearching(false);
    }
  };

  const totalChunks = documents.reduce((sum, d) => sum + d.chunk_count, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Knowledge Base & Vector RAG
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
              768-dim Embeddings
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Secure document ingestion, semantic chunking, and dual-backend vector search (SQLite Local / PostgreSQL pgvector).
          </p>
        </div>
        <button
          onClick={loadDocuments}
          disabled={loading}
          className="inline-flex items-center space-x-2 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 focus:outline-none transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Metrics Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-2 text-slate-500 text-xs font-medium">
            <FileText className="w-4 h-4 text-indigo-600" />
            <span>Indexed Documents</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{documents.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-2 text-slate-500 text-xs font-medium">
            <Layers className="w-4 h-4 text-emerald-600" />
            <span>Vector Chunks</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{totalChunks}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-2 text-slate-500 text-xs font-medium">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Embedding Model</span>
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-800 truncate" title="text-embedding-004">
            text-embedding-004
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-2 text-slate-500 text-xs font-medium">
            <Database className="w-4 h-4 text-blue-600" />
            <span>Vector Index</span>
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-800">
            Cosine Similarity (768D)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Card */}
        <div className="lg:col-span-1 bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900 flex items-center space-x-2">
              <Upload className="w-4 h-4 text-indigo-600" />
              <span>Ingest Document</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Supports <strong>PDF, TXT, and DOCX</strong> up to 15MB. Content is validated, normalized, chunked, and embedded into vector storage.
            </p>

            <form onSubmit={handleUpload} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Select File
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf,.txt,.docx"
                  onChange={handleFileChange}
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer border border-slate-200 rounded-lg p-1"
                />
                {selectedFile && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Selected: <span className="font-medium text-slate-700">{selectedFile.name}</span> ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Document Description (Optional)
                </label>
                <input
                  type="text"
                  value={fileDescription}
                  onChange={(e) => setFileDescription(e.target.value)}
                  placeholder="e.g. 2026 Corporate Travel Policy"
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {uploadError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start space-x-2 text-rose-700 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{uploadError}</span>
                </div>
              )}

              {uploadSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start space-x-2 text-emerald-700 text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{uploadSuccess}</span>
                </div>
              )}

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-500 space-y-1">
                <div className="flex items-center space-x-1.5 font-medium text-slate-700">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                  <span>Enterprise Guardrails</span>
                </div>
                <p>• Magic byte verification prevents disguised executables.</p>
                <p>• Scanned PDFs without extractable text trigger OCR notices.</p>
                <p>• SHA-256 deduplication rejects redundant copies.</p>
              </div>

              <button
                type="submit"
                disabled={!selectedFile || uploading}
                className="w-full inline-flex items-center justify-center space-x-2 py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-medium shadow-sm transition-colors"
              >
                {uploading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Chunking & Embedding...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload & Index Document</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Semantic Search Playground */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 flex items-center space-x-2">
              <Search className="w-4 h-4 text-indigo-600" />
              <span>Vector Semantic Search Inspector</span>
            </h2>
            <span className="text-xs text-slate-400">RAG Simulator</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Test natural language queries against your vector embeddings to inspect chunk similarity scores and retrieved citations.
          </p>

          <form onSubmit={handleVectorSearch} className="mt-4 space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g. What is the company policy for software purchases over $10,000?"
                className="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={!searchQuery.trim() || isSearching}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-medium rounded-lg flex items-center space-x-1.5 transition-colors"
              >
                {isSearching ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                <span>Search</span>
              </button>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-600">
              <div className="flex items-center space-x-2">
                <span>Top Results:</span>
                <select
                  value={searchTopK}
                  onChange={(e) => setSearchTopK(Number(e.target.value))}
                  className="px-2 py-1 text-xs border border-slate-200 rounded-md bg-white"
                >
                  <option value={1}>Top 1</option>
                  <option value={3}>Top 3</option>
                  <option value={5}>Top 5</option>
                  <option value={10}>Top 10</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <span>Scope:</span>
                <select
                  value={selectedSearchDocId || ""}
                  onChange={(e) =>
                    setSelectedSearchDocId(e.target.value ? Number(e.target.value) : undefined)
                  }
                  className="px-2 py-1 text-xs border border-slate-200 rounded-md bg-white max-w-[200px] truncate"
                >
                  <option value="">All Documents</option>
                  {documents.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.filename}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </form>

          {searchError && (
            <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
              {searchError}
            </div>
          )}

          {/* Search Results Display */}
          <div className="mt-4 flex-1 overflow-y-auto max-h-[300px] space-y-3">
            {searchResults === null ? (
              <div className="h-44 border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-400 text-xs">
                <Search className="w-6 h-6 mb-2 text-slate-300" />
                <span>Enter a query to inspect semantic chunks and similarity rankings</span>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
                No matching chunks found above the similarity threshold (0.20).
              </div>
            ) : (
              searchResults.map((res, i) => (
                <div
                  key={i}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs hover:border-indigo-300 transition-colors"
                >
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 mb-1.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-slate-800">{res.document_filename}</span>
                      <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-medium text-[10px]">
                        Page {res.page_number}
                      </span>
                      <span className="text-slate-400 text-[10px]">Chunk #{res.chunk_index}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-slate-500 text-[10px]">Score:</span>
                      <span
                        className={`font-mono text-[11px] font-bold ${
                          res.similarity_score >= 0.7
                            ? "text-emerald-600"
                            : res.similarity_score >= 0.4
                            ? "text-indigo-600"
                            : "text-amber-600"
                        }`}
                      >
                        {(res.similarity_score * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <p className="text-slate-700 leading-relaxed font-sans">{res.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Indexed Document Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Document Repository</h2>
          <span className="text-xs text-slate-500">{documents.length} registered document(s)</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
            Loading document repository...
          </div>
        ) : documents.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No documents uploaded yet. Use the upload form above to index your first document.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Document</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Chunks</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">SHA-256 Hash</th>
                  <th className="py-3 px-4">Indexed At</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{doc.filename}</div>
                      {doc.description && (
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">{doc.description}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 uppercase">
                        {doc.file_type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800">{doc.chunk_count}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {(doc.file_size_bytes / 1024).toFixed(1)} KB
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          doc.status === "indexed"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : doc.status === "processing"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            doc.status === "indexed"
                              ? "bg-emerald-500"
                              : doc.status === "processing"
                              ? "bg-amber-500"
                              : "bg-rose-500"
                          }`}
                        />
                        <span className="capitalize">{doc.status}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-400">
                      {doc.content_hash.slice(0, 12)}...
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleInspect(doc.id)}
                        className="inline-flex items-center space-x-1 text-indigo-600 hover:text-indigo-800 font-medium text-[11px]"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect Chunks</span>
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id, doc.filename)}
                        className="inline-flex items-center space-x-1 text-rose-600 hover:text-rose-800 font-medium text-[11px]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Chunks Inspector Modal */}
      {activeDocDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">
                  {activeDocDetail.filename}
                </h3>
                <p className="text-xs text-slate-500">
                  {activeDocDetail.chunk_count} chunk(s) • Embedded with {activeDocDetail.embedding_model}
                </p>
              </div>
              <button
                onClick={() => setActiveDocDetail(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {activeDocDetail.chunks.map((ch) => (
                <div key={ch.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <div className="flex items-center justify-between font-semibold text-slate-700 pb-1.5 border-b border-slate-200 mb-1.5">
                    <span className="flex items-center space-x-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[10px]">
                        Page {ch.page_number}
                      </span>
                      <span>Chunk #{ch.chunk_index}</span>
                    </span>
                    <span className="text-slate-400 font-mono text-[10px]">{ch.token_count} words/tokens</span>
                  </div>
                  <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">{ch.content}</p>
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setActiveDocDetail(null)}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

