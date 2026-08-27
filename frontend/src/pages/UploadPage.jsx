import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, CheckCircle, XCircle, CloudUpload } from 'lucide-react';
import { uploadApi } from '../api/client';
import './UploadPage.css';

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);  // { success, data/error }
  const inputRef = useRef();

  const selectFile = (f) => {
    if (!f) return;
    if (!f.name.endsWith('.pdf')) {
      setResult({ success: false, error: 'Only PDF files are accepted.' });
      return;
    }
    setFile(f);
    setResult(null);
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    selectFile(e.dataTransfer.files[0]);
  }, []);

  const onDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave = () => setDragOver(false);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    setResult(null);
    try {
      const { data } = await uploadApi.statement(file, (e) => {
        if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
      });
      setResult({ success: true, data });
      setFile(null);
    } catch (e) {
      setResult({ success: false, error: e.response?.data?.detail || 'Upload failed. Please try again.' });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const clear = () => { setFile(null); setResult(null); };

  return (
    <div className="upload-page animate-fade-in">
      <div className="page-header">
        <h1>Upload Statement</h1>
        <p>Import your bank statement PDF to sync transactions</p>
      </div>

      <div className="upload-layout">
        {/* Drop zone */}
        <div className="card upload-card">
          <div
            id="drop-zone"
            className={`drop-zone ${dragOver ? 'drop-zone-active' : ''} ${file ? 'drop-zone-has-file' : ''}`}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => !file && inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              id="file-input"
              type="file"
              accept=".pdf"
              style={{ display: 'none' }}
              onChange={e => selectFile(e.target.files[0])}
            />

            {!file ? (
              <div className="drop-content">
                <div className="drop-icon">
                  <CloudUpload size={40} />
                </div>
                <h3>Drop your PDF here</h3>
                <p className="text-secondary">or click to browse files</p>
                <span className="drop-hint">Supports: .pdf bank statements</span>
              </div>
            ) : (
              <div className="file-selected">
                <div className="file-icon">
                  <FileText size={28} />
                </div>
                <div className="file-details">
                  <span className="file-name">{file.name}</span>
                  <span className="file-size text-muted">{(file.size / 1024).toFixed(1)} KB</span>
                </div>
                <button id="remove-file-btn" className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); clear(); }}>
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* Progress */}
          {uploading && (
            <div className="upload-progress">
              <div className="upload-progress-header">
                <span className="text-secondary" style={{ fontSize: 13 }}>Uploading…</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{progress}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="upload-actions">
            <button
              id="upload-btn"
              className="btn btn-primary btn-lg"
              onClick={handleUpload}
              disabled={!file || uploading}
            >
              {uploading ? (
                <><span className="btn-spinner" /> Processing…</>
              ) : (
                <><Upload size={16} /> Upload Statement</>
              )}
            </button>
          </div>

          {/* Result */}
          {result && (
            <div className={`alert ${result.success ? 'alert-success' : 'alert-error'} animate-fade-in`}>
              {result.success
                ? <CheckCircle size={16} />
                : <XCircle size={16} />
              }
              {result.success
                ? `✅ Imported ${result.data.inserted} new transactions (${result.data.skipped} duplicates skipped)`
                : result.error
              }
            </div>
          )}
        </div>

        {/* Info panel */}
        <div className="upload-info">
          <div className="card info-card">
            <h3>How it works</h3>
            <div className="info-steps">
              <div className="info-step">
                <div className="step-num">1</div>
                <div>
                  <strong>Select your PDF</strong>
                  <p className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>Drag and drop or click to browse</p>
                </div>
              </div>
              <div className="info-step">
                <div className="step-num">2</div>
                <div>
                  <strong>Auto-parsed</strong>
                  <p className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>Our parser extracts transactions, dates, and amounts</p>
                </div>
              </div>
              <div className="info-step">
                <div className="step-num">3</div>
                <div>
                  <strong>AI categorized</strong>
                  <p className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>Transactions are classified by category automatically</p>
                </div>
              </div>
              <div className="info-step">
                <div className="step-num">4</div>
                <div>
                  <strong>Deduplication</strong>
                  <p className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>Existing transactions won't be imported twice</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card info-card info-note">
            <h4>Supported Formats</h4>
            <p className="text-secondary" style={{ fontSize: 13, marginTop: 8 }}>
              Currently supports UPI transaction PDFs from Indian banks. The parser extracts UPI reference numbers, merchants, amounts, and dates.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
