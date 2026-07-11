import React, { useState, useRef, useEffect } from 'react';
import { Camera, Image as ImageIcon, Send, Sparkles, User, CheckCircle, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import imageCompression from 'browser-image-compression';

export default function UploadForm({ API_URL }) {
  const [name, setName] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null); // 'success', 'error', null
  const [errorMessage, setErrorMessage] = useState('');
  const [config, setConfig] = useState({ cloudinaryCloudName: null, cloudinaryUploadPreset: null });
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetch(`${API_URL}/api/config`)
      .then(res => res.json())
      .then(data => setConfig(data))
      .catch(err => console.error('Failed to load server configurations:', err));
  }, [API_URL]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && !file.name.toLowerCase().endsWith('.heic')) {
      setUploadStatus('error');
      setErrorMessage('Please select a valid image file.');
      return;
    }

    setUploadStatus(null);
    setIsCompressing(true);
    
    // Create preview url for original image
    setPreviewUrl(URL.createObjectURL(file));

    try {
      const compressed = await compressImage(file);
      setSelectedImage(compressed);
      // Update preview to compressed version
      setPreviewUrl(URL.createObjectURL(compressed));
    } catch (err) {
      console.error('Compression failed:', err);
      setSelectedImage(file); // fallback to original file
    } finally {
      setIsCompressing(false);
    }
  };

  const compressImage = async (file) => {
    const options = {
      maxSizeMB: 4,             // Target a max size of 4MB for high-quality prints
      maxWidthOrHeight: 4000,   // Preserves full 12MP smartphone resolution
      useWebWorker: true,
      fileType: 'image/jpeg'    // Standardizes HEIC (iPhone) files to JPEG
    };
    return await imageCompression(file, options);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedImage) return;

    setIsUploading(true);
    setUploadStatus(null);
    const uploaderName = isAnonymous ? 'Anonymous Guest' : name.trim() || 'Anonymous Guest';

    try {
      let uploadPayload;
      let headers = {};

      // Direct-to-Cloudinary Upload if configured
      if (config.cloudinaryCloudName && config.cloudinaryUploadPreset) {
        const cloudData = new FormData();
        cloudData.append('file', selectedImage);
        cloudData.append('upload_preset', config.cloudinaryUploadPreset);

        const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudinaryCloudName}/image/upload`, {
          method: 'POST',
          body: cloudData
        });

        const cloudResData = await cloudRes.json();
        if (!cloudRes.ok) {
          throw new Error(cloudResData.error?.message || 'Failed to upload photo to Cloudinary.');
        }

        uploadPayload = JSON.stringify({
          uploader_name: uploaderName,
          filepath: cloudResData.secure_url,
          cloudinary_public_id: cloudResData.public_id
        });
        headers['Content-Type'] = 'application/json';
      } else {
        // Fallback: Local Server Upload
        const formData = new FormData();
        formData.append('photo', selectedImage);
        formData.append('uploader_name', uploaderName);
        uploadPayload = formData;
      }

      const res = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        headers: headers,
        body: uploadPayload,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload registration failed');

      setUploadStatus('success');
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#b76e79', '#e6c280', '#fffdfa']
      });

      // Reset Form
      setSelectedImage(null);
      setPreviewUrl('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setUploadStatus('error');
      setErrorMessage(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="card animate-fade-in" style={{ maxWidth: '480px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '2.1rem', color: '#8a434d', fontWeight: '600', textShadow: '0 2px 8px rgba(255, 253, 250, 0.95)', marginBottom: '8px' }}>Capture the Love</h2>
        <p style={{ color: 'var(--dark)', fontWeight: '600', textShadow: '0 1px 6px rgba(255, 253, 250, 0.95)', fontSize: '0.98rem', lineHeight: '1.4' }}>
          Share your beautiful moments from our special day with us.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--dark)' }}>
            Your Name
          </label>
          <div style={{ position: 'relative' }}>
            <User 
              size={18} 
              style={{ 
                position: 'absolute', 
                left: '12px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                color: 'var(--muted)' 
              }} 
            />
            <input
              type="text"
              placeholder="e.g., Sarah & John"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isAnonymous || isUploading}
              style={{
                width: '100%',
                padding: '12px 12px 12px 40px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(230, 194, 128, 0.4)',
                backgroundColor: 'rgba(255, 255, 255, 0.6)',
                fontSize: '1rem',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', marginTop: '4px' }}>
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              disabled={isUploading}
              style={{ accentColor: 'var(--primary)' }}
            />
            <span>Upload anonymously</span>
          </label>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--dark)' }}>
            Select Photo
          </label>
          
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            ref={fileInputRef}
            style={{ display: 'none' }}
          />

          {!previewUrl ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed rgba(230, 194, 128, 0.6)',
                borderRadius: 'var(--radius-lg)',
                padding: '40px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: 'rgba(230, 194, 128, 0.03)',
                transition: 'all 0.2s ease',
              }}
            >
              <Camera size={36} style={{ color: 'var(--primary)', marginBottom: '12px' }} />
              <p style={{ fontWeight: '500', fontSize: '0.95rem' }}>Take Photo or Choose File</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '4px' }}>
                Supports JPEG, PNG, HEIC up to 15MB
              </p>
            </div>
          ) : (
            <div style={{ position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <img 
                src={previewUrl} 
                alt="Preview" 
                style={{ width: '100%', maxHeight: '300px', objectFit: 'cover', display: 'block' }}
              />
              {isCompressing && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(44, 34, 36, 0.7)',
                  color: 'white',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px'
                }}>
                  <Sparkles size={24} className="animate-spin" style={{ color: 'var(--secondary)' }} />
                  <span>Optimizing photo size...</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setSelectedImage(null);
                  setPreviewUrl('');
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  backgroundColor: 'rgba(44, 34, 36, 0.8)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.9rem'
                }}
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {uploadStatus === 'success' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: 'rgba(110, 141, 114, 0.1)',
            border: '1px solid var(--success)',
            color: 'var(--success)',
            padding: '12px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.9rem'
          }}>
            <CheckCircle size={20} />
            <span>Thank you! Your photo was uploaded beautifully.</span>
          </div>
        )}

        {uploadStatus === 'error' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: 'rgba(185, 93, 93, 0.1)',
            border: '1px solid var(--danger)',
            color: 'var(--danger)',
            padding: '12px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.9rem'
          }}>
            <AlertCircle size={20} />
            <span>{errorMessage}</span>
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={!selectedImage || isUploading || isCompressing}
          style={{ width: '100%' }}
        >
          {isUploading ? (
            <>Uploading Momement...</>
          ) : (
            <>
              <Send size={18} />
              Share Photo
            </>
          )}
        </button>
      </form>
    </div>
  );
}
