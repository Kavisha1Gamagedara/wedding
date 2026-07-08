import React, { useState, useEffect } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight, X } from 'lucide-react';

export default function Slideshow({ API_URL, onClose }) {
  const [photos, setPhotos] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [loading, setLoading] = useState(true);

  // Fetch approved photos
  const fetchPhotos = async () => {
    try {
      const res = await fetch(`${API_URL}/api/photos`);
      if (res.ok) {
        const data = await res.json();
        setPhotos(data);
      }
    } catch (err) {
      console.error('Failed to fetch photos for slideshow:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos();
    // Poll for new photos every 15 seconds
    const interval = setInterval(fetchPhotos, 15000);
    return () => clearInterval(interval);
  }, [API_URL]);

  // Slideshow cycle effect
  useEffect(() => {
    if (!isPlaying || photos.length === 0) return;

    const timer = setTimeout(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % photos.length);
    }, 5000); // Change image every 5 seconds

    return () => clearTimeout(timer);
  }, [currentIndex, isPlaying, photos]);

  const handleNext = () => {
    if (photos.length === 0) return;
    setCurrentIndex((prevIndex) => (prevIndex + 1) % photos.length);
  };

  const handlePrev = () => {
    if (photos.length === 0) return;
    setCurrentIndex((prevIndex) => (prevIndex - 1 + photos.length) % photos.length);
  };

  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#1c1517',
        color: 'var(--secondary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        fontFamily: 'var(--font-serif)',
        fontSize: '1.5rem'
      }}>
        Opening Magic Gallery...
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#1c1517',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
        zIndex: 1000
      }}>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', color: 'var(--secondary)' }}>
          No memories captured yet
        </p>
        <button className="btn btn-primary" onClick={onClose}>
          Go Back
        </button>
      </div>
    );
  }

  const currentPhoto = photos[currentIndex];
  const imageUrl = currentPhoto.filepath.startsWith('http') 
    ? currentPhoto.filepath 
    : `${API_URL}${currentPhoto.filepath}`;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: '#0c0809',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      userSelect: 'none'
    }}>
      {/* Background blur for atmosphere */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `url(${imageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: 'blur(30px) brightness(0.3)',
        transform: 'scale(1.1)',
        transition: 'background-image 1s ease-in-out',
        zIndex: 1
      }} />

      {/* Main Image Frame */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        maxWidth: '90%',
        maxHeight: '80%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid rgba(230,194,128,0.2)'
      }}>
        <img
          src={imageUrl}
          alt={`Wedding memory by ${currentPhoto.uploader_name}`}
          style={{
            maxWidth: '100%',
            maxHeight: '80vh',
            objectFit: 'contain',
            transition: 'all 1s ease-in-out',
          }}
        />
      </div>

      {/* Bottom Info Overlay */}
      <div style={{
        position: 'absolute',
        bottom: '40px',
        zIndex: 3,
        textAlign: 'center',
        color: '#fff',
        textShadow: '0 2px 4px rgba(0,0,0,0.6)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px'
      }}>
        <p style={{ 
          fontSize: '0.85rem', 
          textTransform: 'uppercase', 
          letterSpacing: '0.15em', 
          color: 'var(--secondary)' 
        }}>
          Captured by
        </p>
        <h3 style={{ fontSize: '1.8rem', fontFamily: 'var(--font-serif)' }}>
          {currentPhoto.uploader_name}
        </h3>
      </div>

      {/* Close Button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          zIndex: 4,
          background: 'rgba(255,255,255,0.1)',
          border: 'none',
          borderRadius: '50%',
          width: '44px',
          height: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          cursor: 'pointer',
          backdropFilter: 'blur(5px)'
        }}
      >
        <X size={20} />
      </button>

      {/* Control Buttons Overlay */}
      <div style={{
        position: 'absolute',
        bottom: '120px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 4,
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        background: 'rgba(0,0,0,0.4)',
        padding: '12px 24px',
        borderRadius: '40px',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <button onClick={handlePrev} style={controlBtnStyle}><ChevronLeft size={20} /></button>
        <button onClick={() => setIsPlaying(!isPlaying)} style={controlBtnStyle}>
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <button onClick={handleNext} style={controlBtnStyle}><ChevronRight size={20} /></button>
      </div>
    </div>
  );
}

const controlBtnStyle = {
  background: 'none',
  border: 'none',
  color: '#fff',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '4px'
};
