'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { Upload, X, Loader2, AlertCircle, AlertTriangle } from 'lucide-react';

type Props = {
  images: string[];
  onChange: (urls: string[]) => void;
};

const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
const SOFT_WARN_BYTES = 5 * 1024 * 1024; // 5 MB

const ACCEPT = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type ErrorEntry = {
  filename: string;
  message: string;
};

export const ImageUploader: React.FC<Props> = ({ images, onChange }) => {
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<ErrorEntry[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);

  const uploadFiles = useCallback(
    async (filesToUpload: File[]) => {
      setUploading(true);
      setErrors([]);
      setWarnings([]);
      setUploadProgress({ current: 0, total: filesToUpload.length });

      const uploadedUrls: string[] = [];
      const collectedErrors: ErrorEntry[] = [];
      const collectedWarnings: string[] = [];

      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        setUploadProgress({ current: i + 1, total: filesToUpload.length });

        try {
          const formData = new FormData();
          formData.append('file', file);
          const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          const data = await res.json().catch(() => ({}));

          if (!res.ok) {
            collectedErrors.push({
              filename: file.name,
              message: data.error || `HTTP ${res.status}`,
            });
            continue;
          }

          if (data.url) {
            uploadedUrls.push(data.url);
            if (data.warning) {
              collectedWarnings.push(`${file.name}: ${data.warning}`);
            }
          } else {
            collectedErrors.push({
              filename: file.name,
              message: 'Server returned no URL',
            });
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Network error';
          collectedErrors.push({
            filename: file.name,
            message: `Network error: ${msg}`,
          });
        }
      }

      if (uploadedUrls.length > 0) {
        onChange([...images, ...uploadedUrls]);
      }
      setErrors(collectedErrors);
      setWarnings(collectedWarnings);
      setPendingFiles([]);
      setShowConfirm(false);
      setUploading(false);
      setUploadProgress(null);
    },
    [images, onChange]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      // Surface rejections from react-dropzone (wrong type, too large)
      if (fileRejections.length > 0) {
        const rejErrs: ErrorEntry[] = fileRejections.map((rej) => {
          const reasons = rej.errors.map((e) => {
            if (e.code === 'file-too-large') {
              return `File is ${formatBytes(rej.file.size)} — max ${formatBytes(MAX_SIZE_BYTES)}`;
            }
            if (e.code === 'file-invalid-type') {
              return 'File type not allowed (PNG, JPG, GIF, WEBP only)';
            }
            return e.message;
          });
          return {
            filename: rej.file.name,
            message: reasons.join('; '),
          };
        });
        setErrors(rejErrs);
      } else {
        setErrors([]);
      }

      if (acceptedFiles.length === 0) return;

      // Soft warning for >5MB files
      const largeFiles = acceptedFiles.filter((f) => f.size > SOFT_WARN_BYTES);
      if (largeFiles.length > 0) {
        setPendingFiles(acceptedFiles);
        setShowConfirm(true);
        setWarnings([
          `${largeFiles.length} file(s) larger than 5MB: ${largeFiles
            .map((f) => `${f.name} (${formatBytes(f.size)})`)
            .join(', ')}`,
        ]);
      } else {
        uploadFiles(acceptedFiles);
      }
    },
    [uploadFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPT,
    maxSize: MAX_SIZE_BYTES,
    multiple: true,
  });

  const handleRemove = (url: string) => {
    onChange(images.filter((u) => u !== url));
  };

  const dismissErrors = () => setErrors([]);
  const dismissWarnings = () => setWarnings([]);

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition ${
          isDragActive ? 'border-marshall-gold bg-white/5' : 'border-white/20 hover:border-white/40'
        }`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="flex flex-col items-center justify-center gap-1.5 text-sm text-white/70">
            <Loader2 className="w-4 h-4 animate-spin" />
            <div>Uploading...</div>
            {uploadProgress && (
              <div className="text-xs text-white/50">
                {uploadProgress.current} of {uploadProgress.total}
              </div>
            )}
          </div>
        ) : (
          <>
            <Upload className="w-6 h-6 mx-auto mb-2 text-white/50" />
            <p className="text-sm text-white/70">
              {isDragActive ? 'Drop images here' : 'Drag & drop or click to upload'}
            </p>
            <p className="text-xs text-white/40 mt-1">
              PNG / JPG / GIF / WEBP · max 50MB · transparent backgrounds preferred
            </p>
          </>
        )}
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="text-xs bg-red-950/30 border border-red-900/50 rounded p-2.5 space-y-1.5">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
            <div className="flex-1 space-y-1">
              <div className="font-semibold text-red-300">
                {errors.length === 1 ? '1 file failed' : `${errors.length} files failed`}
              </div>
              {errors.map((e, i) => (
                <div key={i} className="text-red-200/80">
                  <span className="font-mono">{e.filename}</span>
                  <span className="text-red-300/60"> — {e.message}</span>
                </div>
              ))}
            </div>
            <button
              onClick={dismissErrors}
              className="text-red-300/60 hover:text-red-300"
              aria-label="Dismiss errors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Warnings (post-upload) */}
      {warnings.length > 0 && !showConfirm && (
        <div className="text-xs bg-amber-950/30 border border-amber-900/50 rounded p-2.5 space-y-1">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
            <div className="flex-1 space-y-1 text-amber-200/80">
              {warnings.map((w, i) => (
                <div key={i}>{w}</div>
              ))}
            </div>
            <button
              onClick={dismissWarnings}
              className="text-amber-300/60 hover:text-amber-300"
              aria-label="Dismiss warnings"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Confirm large file */}
      {showConfirm && (
        <div className="text-xs bg-amber-950/50 border border-amber-900 rounded p-3 space-y-2">
          <div className="flex gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-400 mt-0.5" />
            <div className="text-amber-200 space-y-1">
              {warnings.map((w, i) => (
                <div key={i}>{w}</div>
              ))}
              <div className="text-amber-300/60">Upload may take longer.</div>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => {
                setPendingFiles([]);
                setShowConfirm(false);
                setWarnings([]);
              }}
              className="px-3 py-1 text-xs rounded bg-white/10 hover:bg-white/20 text-white"
            >
              Cancel
            </button>
            <button
              onClick={() => uploadFiles(pendingFiles)}
              className="px-3 py-1 text-xs rounded bg-marshall-gold hover:bg-marshall-gold/90 text-black font-medium"
            >
              Upload anyway
            </button>
          </div>
        </div>
      )}

      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {images.map((url) => (
            <div key={url} className="relative group aspect-square bg-white/5 rounded overflow-hidden">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => handleRemove(url)}
                className="absolute top-1 right-1 p-1 bg-black/70 rounded opacity-0 group-hover:opacity-100 transition"
                aria-label="Remove image"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
