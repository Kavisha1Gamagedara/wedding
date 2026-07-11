import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Trash2, LogOut, Check, X, Shield, Download, Grid, Image as ImageIcon, QrCode } from 'lucide-react';

export default function AdminDashboard({ API_URL, onLogout }) {
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(localStorage.getItem('adminToken') || '');
  const [photos, setPhotos] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'approved', 'pending'

  useEffect(() => {
    if (token) {
      fetchPhotos();
    }
  }, [token]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      
      localStorage.setItem('adminToken', data.token);
      setToken(data.token);
    } catch (err) {
      setError(err.message || 'Incorrect password.');
    }
  };

  const fetchPhotos = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/photos?admin=true`, {
        headers: { 'Authorization': token }
      });
      if (res.ok) {
        const data = await res.json();
        setPhotos(data);
      } else {
        // Expired/invalid token
        handleLogoutClick();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleApprove = async (id, currentApproved) => {
    try {
      const newApproved = currentApproved === 1 ? 0 : 1;
      const res = await fetch(`${API_URL}/api/photos/${id}/approve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({ approved: newApproved }),
      });

      if (res.ok) {
        setPhotos(photos.map(p => p.id === id ? { ...p, approved: newApproved } : p));
      }
    } catch (err) {
      console.error('Failed to toggle approval', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this photo forever?')) return;
    try {
      const res = await fetch(`${API_URL}/api/photos/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': token }
      });

      if (res.ok) {
        setPhotos(photos.filter(p => p.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete photo', err);
    }
  };

  const handleLogoutClick = () => {
    localStorage.removeItem('adminToken');
    setToken('');
    if (onLogout) onLogout();
  };

  // Generate downloadable QR Code link
  const frontendUrl = window.location.origin;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&color=2c2224&bgcolor=fffdfa&data=${encodeURIComponent(frontendUrl)}`;

  const filteredPhotos = photos.filter(photo => {
    if (filter === 'approved') return photo.approved === 1;
    if (filter === 'pending') return photo.approved === 0;
    return true;
  });

  // Login view if not authenticated
  if (!token) {
    return (
      <div className="card animate-fade-in" style={{ maxWidth: '400px', margin: '40px auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Shield size={40} style={{ color: '#8a434d', marginBottom: '12px', filter: 'drop-shadow(0 2px 8px rgba(255, 253, 250, 0.95))' }} />
          <h2 style={{ fontSize: '1.9rem', color: '#8a434d', fontWeight: '600', textShadow: '0 2px 8px rgba(255, 253, 250, 0.95)', marginBottom: '8px' }}>Couple's Dashboard</h2>
          <p style={{ color: 'var(--dark)', fontWeight: '600', textShadow: '0 1px 6px rgba(255, 253, 250, 0.95)', fontSize: '0.95rem' }}>Enter password to manage photos.</p>
        </div>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(230, 194, 128, 0.4)',
              backgroundColor: 'rgba(255, 255, 255, 0.6)',
              fontSize: '1rem',
              outline: 'none'
            }}
          />
          {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem', textAlign: 'center' }}>{error}</p>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            Access Dashboard
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      {/* Top Admin Header */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '32px',
        borderBottom: '1px solid rgba(230,194,128,0.2)',
        paddingBottom: '20px'
      }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', color: 'var(--primary)' }}>Wedding Gallery Manager</h1>
          <p style={{ color: 'var(--muted)' }}>Manage, approve, or delete guest uploads.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={fetchPhotos}>
            Refresh
          </button>
          <button className="btn btn-primary" onClick={handleLogoutClick}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>

      {/* Stats and QR code setup */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '24px',
        marginBottom: '32px'
      }}>
        {/* Statistics Card */}
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--primary)' }}>Gallery Stats</h3>
          <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
            <div>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>{photos.length}</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Total Photos</p>
            </div>
            <div>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)' }}>
                {photos.filter(p => p.approved === 1).length}
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Live/Approved</p>
            </div>
            <div>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--muted)' }}>
                {photos.filter(p => p.approved === 0).length}
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Hidden</p>
            </div>
          </div>
        </div>

        {/* QR Code Sharing Card */}
        <div className="card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <img 
            src={qrCodeUrl} 
            alt="QR Code" 
            style={{ width: '80px', height: '80px', borderRadius: '8px', border: '1px solid rgba(230,194,128,0.3)' }}
          />
          <div>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--primary)', marginBottom: '4px' }}>Event QR Code</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '8px' }}>
              Guests can scan this to instantly upload photos.
            </p>
            <a 
              href={qrCodeUrl} 
              target="_blank" 
              rel="noreferrer" 
              className="btn btn-secondary" 
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              download="wedding-qr-code.png"
            >
              <Download size={14} /> Download High-Res
            </a>
          </div>
        </div>
      </div>

      {/* Filter Options */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '20px',
        borderBottom: '1px solid rgba(230,194,128,0.1)',
        paddingBottom: '12px'
      }}>
        {['all', 'approved', 'pending'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 16px',
              borderRadius: '20px',
              border: 'none',
              background: filter === f ? 'var(--primary)' : 'rgba(230,194,128,0.15)',
              color: filter === f ? 'white' : 'var(--dark)',
              cursor: 'pointer',
              textTransform: 'capitalize',
              fontWeight: '500',
              fontSize: '0.85rem'
            }}
          >
            {f} ({
              f === 'all' ? photos.length :
              f === 'approved' ? photos.filter(p => p.approved === 1).length :
              photos.filter(p => p.approved === 0).length
            })
          </button>
        ))}
      </div>

      {/* Photos Masonry / Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>Loading photos...</div>
      ) : filteredPhotos.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
          <ImageIcon size={40} style={{ color: 'var(--secondary)', marginBottom: '12px' }} />
          <h3 style={{ color: 'var(--muted)' }}>No photos match your filter</h3>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '20px'
        }}>
          {filteredPhotos.map((photo) => (
            <div 
              key={photo.id} 
              className="card" 
              style={{ 
                padding: '10px', 
                borderRadius: 'var(--radius-md)', 
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                border: photo.approved === 0 ? '1px dashed var(--muted)' : '1px solid rgba(230,194,128,0.3)'
              }}
            >
              {/* Photo Frame */}
              <div style={{ position: 'relative', height: '200px', borderRadius: '8px', overflow: 'hidden' }}>
                <img 
                  src={photo.filepath.startsWith('http') ? photo.filepath : `${API_URL}${photo.filepath}`} 
                  alt="Guest upload"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                
                {/* Status indicator on top corner */}
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  left: '8px',
                  backgroundColor: photo.approved === 1 ? 'var(--success)' : 'var(--danger)',
                  color: 'white',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  fontSize: '0.7rem',
                  fontWeight: '600'
                }}>
                  {photo.approved === 1 ? 'Approved' : 'Hidden'}
                </div>
              </div>

              {/* Uploader name & details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <p style={{ fontWeight: '600', fontSize: '0.9rem' }}>{photo.uploader_name}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                  {new Date(photo.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                <button
                  onClick={() => handleToggleApprove(photo.id, photo.approved)}
                  className="btn"
                  style={{
                    flex: 1,
                    padding: '8px',
                    fontSize: '0.8rem',
                    backgroundColor: photo.approved === 1 ? 'rgba(44,34,36,0.05)' : 'rgba(110,141,114,0.15)',
                    color: photo.approved === 1 ? 'var(--dark)' : 'var(--success)'
                  }}
                  title={photo.approved === 1 ? 'Hide photo' : 'Approve photo'}
                >
                  {photo.approved === 1 ? <EyeOff size={16} /> : <Eye size={16} />}
                  <span>{photo.approved === 1 ? 'Hide' : 'Approve'}</span>
                </button>
                
                <a 
                  href={photo.filepath.startsWith('http') ? photo.filepath : `${API_URL}${photo.filepath}`}
                  download={photo.filename}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary"
                  style={{ padding: '8px', borderRadius: 'var(--radius-md)' }}
                  title="Download Photo"
                >
                  <Download size={16} />
                </a>

                <button
                  onClick={() => handleDelete(photo.id)}
                  className="btn"
                  style={{
                    padding: '8px',
                    backgroundColor: 'rgba(185, 93, 93, 0.1)',
                    color: 'var(--danger)'
                  }}
                  title="Delete Photo"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
