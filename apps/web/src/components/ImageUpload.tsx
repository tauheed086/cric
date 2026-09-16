import React, { useRef, useState } from 'react';

export function processImageFile(file: File, maxWidth = 256, maxHeight = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Selected file is not an image'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL(file.type.includes('png') ? 'image/png' : 'image/jpeg', 0.9);
        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function ImageUpload({
  value,
  onChange,
  label = 'Upload Team Logo',
}: {
  value?: string | null;
  onChange: (base64Url: string) => void;
  label?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, SVG, WebP)');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const dataUrl = await processImageFile(file);
      onChange(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error processing image');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) {
      void handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="image-upload-wrapper">
      <label className="image-upload-label">{label}</label>
      <div
        className="image-upload-dropzone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files?.[0]) {
              void handleFile(e.target.files[0]);
            }
          }}
        />
        {value ? (
          <div className="image-upload-preview">
            <img src={value} alt="Logo preview" className="image-upload-thumbnail" />
            <div className="image-upload-actions">
              <span className="image-upload-change-text">Logo ready to save in DB</span>
              <span style={{ fontSize: 11, color: 'var(--text-soft)' }}>Click or drop to replace image</span>
              <button
                type="button"
                className="image-upload-remove-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('');
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              >
                Remove image
              </button>
            </div>
          </div>
        ) : (
          <div className="image-upload-empty">
            <span className="image-upload-icon">📷</span>
            <span className="image-upload-text">
              {loading ? 'Processing image...' : 'Click to browse or drag & drop team logo'}
            </span>
            <span className="image-upload-hint">Upload PNG, JPG, or WebP. Resized & saved directly into database.</span>
          </div>
        )}
      </div>
      {error && <small style={{ color: 'var(--danger)', marginTop: 4, display: 'block' }}>{error}</small>}
    </div>
  );
}
