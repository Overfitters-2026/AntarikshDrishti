import React, { useState, useRef } from 'react';

const PRESET_SAMPLES = [
  { id: 'sample-water', name: 'Water Body Expansion', tag: 'water-change', color: '#4ea5ff', icon: '💧' },
  { id: 'sample-urban', name: 'Urban / Construction Area', tag: 'construction', color: '#ff7f6a', icon: '🏗️' },
  { id: 'sample-forest', name: 'Forest / Clearance Zone', tag: 'clearance', color: '#f5a524', icon: '🌲' },
  { id: 'sample-road', name: 'Road / Linear Infrastructure', tag: 'road', color: '#a778f2', icon: '🛣️' },
];

export default function ImageSearchModal({ isOpen, onClose, onImageSearch }) {
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setSelectedPreset(null);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSelectPreset = (preset) => {
    setSelectedPreset(preset);
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleExecute = () => {
    if (selectedFile) {
      onImageSearch({ type: 'file', file: selectedFile, label: selectedFile.name });
      onClose();
    } else if (selectedPreset) {
      onImageSearch({ type: 'preset', tag: selectedPreset.tag, label: selectedPreset.name });
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="image-search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <span className="modal-icon">📷</span>
            <span>IMAGE-TO-IMAGE VISUAL SIMILARITY SEARCH</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <p className="modal-description">
            Query satellite tiles across India using visual feature embeddings. Upload an optical crop (.tif, .png, .jpg) or select a reference benchmark pattern:
          </p>

          <div className="upload-dropzone" onClick={() => fileInputRef.current?.click()}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*,.tif,.tiff"
              style={{ display: 'none' }}
            />
            {previewUrl ? (
              <div className="preview-container">
                <img src={previewUrl} alt="Upload preview" className="crop-preview" />
                <span className="file-info">{selectedFile?.name} ({(selectedFile?.size / 1024).toFixed(1)} KB)</span>
              </div>
            ) : (
              <div className="dropzone-prompt">
                <span className="drop-icon">⬆</span>
                <span className="drop-text">Click to browse or drop reference satellite image</span>
                <span className="drop-sub">Supported: GeoTIFF, PNG, JPEG (auto-cropped to 256x256)</span>
              </div>
            )}
          </div>

          <div className="preset-section-title">OR SELECT REFERENCE BENCHMARK TILE:</div>
          <div className="preset-tiles-grid">
            {PRESET_SAMPLES.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`preset-tile-card ${selectedPreset?.id === preset.id ? 'active' : ''}`}
                style={{ borderColor: selectedPreset?.id === preset.id ? preset.color : undefined }}
                onClick={() => handleSelectPreset(preset)}
              >
                <span className="preset-icon" style={{ background: `${preset.color}22`, color: preset.color }}>
                  {preset.icon}
                </span>
                <div className="preset-meta">
                  <span className="preset-name">{preset.name}</span>
                  <span className="preset-tag" style={{ color: preset.color }}>{preset.tag}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="btn-primary"
            disabled={!selectedFile && !selectedPreset}
            onClick={handleExecute}
          >
            Execute Visual Similarity Search
          </button>
        </div>
      </div>
    </div>
  );
}
