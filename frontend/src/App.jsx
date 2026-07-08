import React, { useState } from 'react';
import { Camera, Shield, Play, Heart } from 'lucide-react';
import UploadForm from './components/UploadForm';
import Slideshow from './components/Slideshow';
import AdminDashboard from './components/AdminDashboard';
import './App.css';

const API_URL = (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL !== 'undefined')
  ? import.meta.env.VITE_API_URL
  : 'http://localhost:5000';

function App() {
  const [view, setView] = useState('upload'); // 'upload', 'admin', 'slideshow'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Premium Header */}
      {view !== 'slideshow' && (
        <header style={{
          padding: '24px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '1200px',
          width: '100%',
          margin: '0 auto',
          position: 'relative',
          zIndex: 10
        }}>
          {/* Logo Brand */}
          <div 
            onClick={() => setView('upload')}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            <div style={{
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
              color: 'white',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(183, 110, 121, 0.2)'
            }}>
              <Heart size={20} fill="white" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-serif)', color: 'var(--dark)' }}>
                Ishini & Lakshan
              </h2>
              <p style={{ fontSize: '0.65rem', letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase' }}>
                July 15, 2026
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <button 
              onClick={() => setView('upload')}
              className="btn btn-secondary"
              style={{ 
                padding: '8px 16px', 
                fontSize: '0.85rem',
                border: view === 'upload' ? '1px solid var(--primary)' : '1px solid rgba(230, 194, 128, 0.4)',
                color: view === 'upload' ? 'var(--primary)' : 'var(--dark)',
                backgroundColor: view === 'upload' ? 'rgba(183, 110, 121, 0.05)' : 'transparent'
              }}
            >
              <Camera size={14} />
              <span className="hide-mobile">Upload</span>
            </button>
            
            <button 
              onClick={() => setView('slideshow')}
              className="btn btn-secondary"
              style={{ 
                padding: '8px 16px', 
                fontSize: '0.85rem',
                border: '1px solid rgba(230, 194, 128, 0.4)'
              }}
            >
              <Play size={14} />
              <span className="hide-mobile">Slideshow</span>
            </button>

            <button 
              onClick={() => setView('admin')}
              className="btn btn-secondary"
              style={{ 
                padding: '8px 16px', 
                fontSize: '0.85rem',
                border: view === 'admin' ? '1px solid var(--primary)' : '1px solid rgba(230, 194, 128, 0.4)',
                color: view === 'admin' ? 'var(--primary)' : 'var(--dark)',
                backgroundColor: view === 'admin' ? 'rgba(183, 110, 121, 0.05)' : 'transparent'
              }}
            >
              <Shield size={14} />
              <span className="hide-mobile">Admin</span>
            </button>
          </nav>
        </header>
      )}

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: view === 'slideshow' ? 0 : '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {view === 'upload' && (
          <div style={{ padding: '20px 0' }}>
            <UploadForm API_URL={API_URL} />
          </div>
        )}
        
        {view === 'admin' && (
          <AdminDashboard API_URL={API_URL} onLogout={() => setView('upload')} />
        )}

        {view === 'slideshow' && (
          <Slideshow API_URL={API_URL} onClose={() => setView('upload')} />
        )}
      </main>

      {/* Footer */}
      {view !== 'slideshow' && (
        <footer style={{
          textAlign: 'center',
          padding: '24px',
          color: 'var(--muted)',
          fontSize: '0.8rem',
          borderTop: '1px solid rgba(230,194,128,0.15)',
          maxWidth: '1200px',
          width: '100%',
          margin: '40px auto 0 auto'
        }}>
          <p>Made with love for the happy couple • Ishini & Lakshan © 2026</p>
        </footer>
      )}

      {/* Mobile-only hide styles utility */}
      <style>{`
        @media (max-width: 576px) {
          .hide-mobile {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

export default App;
