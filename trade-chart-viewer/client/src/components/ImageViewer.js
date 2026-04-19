import React, { useEffect, useCallback, useState } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, RefreshCcw, Hash, DollarSign, Calendar, Folder } from 'lucide-react';
import './ImageViewer.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function ImageViewer({ charts, currentIndex, onClose, onNavigate, defaultZoom = 75 }) {
  const defaultScale = Math.max(0.25, Math.min(2, defaultZoom / 100));
  const [scale, setScale] = useState(defaultScale);
  const [isLoading, setIsLoading] = useState(true);
  const currentChart = charts[currentIndex];

  const handleKeyDown = useCallback((e) => {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        onNavigate('prev');
        setScale(defaultScale);
        setIsLoading(true);
        break;
      case 'ArrowRight':
        e.preventDefault();
        onNavigate('next');
        setScale(defaultScale);
        setIsLoading(true);
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
      case '+':
      case '=':
        e.preventDefault();
        setScale(prev => Math.min(prev + 0.25, 3));
        break;
      case '-':
        e.preventDefault();
        setScale(prev => Math.max(prev - 0.25, 0.5));
        break;
      case '0':
        e.preventDefault();
        setScale(defaultScale);
        break;
      default:
        break;
    }
  }, [onNavigate, onClose, defaultScale]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [handleKeyDown]);

  useEffect(() => {
    setScale(defaultScale);
    setIsLoading(true);
  }, [currentIndex, defaultScale]);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setScale(defaultScale);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = `${API_URL}/api/image?path=${encodeURIComponent(currentChart.path)}`;
    link.download = currentChart.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!currentChart) return null;

  return (
    <div className="image-viewer-overlay" onClick={onClose}>
      <div className="image-viewer-container" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="viewer-header">
          <div className="viewer-info">
            <span className="counter">{currentIndex + 1} / {charts.length}</span>
            <div className="metadata">
              <span className="meta-item"><Hash size={14} /> {currentChart.tradeNumber}</span>
              <span className="meta-item ticker"><DollarSign size={14} /> {currentChart.ticker}</span>
              <span className="meta-item"><Calendar size={14} /> {currentChart.date}</span>
              <span className="meta-item category">{currentChart.category}</span>
            </div>
          </div>
          <div className="viewer-controls">
            <button className="control-btn" onClick={handleZoomOut} title="Zoom Out (-)">
              <ZoomOut size={20} />
            </button>
            <span className="zoom-level">{Math.round(scale * 100)}%</span>
            <button className="control-btn" onClick={handleZoomIn} title="Zoom In (+)">
              <ZoomIn size={20} />
            </button>
            <button className="control-btn" onClick={handleResetZoom} title="Reset Zoom to default">
              <RefreshCcw size={20} />
            </button>
            <button className="control-btn" onClick={handleDownload} title="Download">
              <Download size={20} />
            </button>
            <button className="control-btn close-btn" onClick={onClose} title="Close (Esc)">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Main Image Area */}
        <div className="viewer-content">
          <button 
            className="nav-btn prev-btn" 
            onClick={() => { onNavigate('prev'); setScale(defaultScale); setIsLoading(true); }}
            disabled={currentIndex === 0}
            title="Previous (←)"
          >
            <ChevronLeft size={32} />
          </button>

          <div className="image-container">
            {isLoading && (
              <div className="image-loader">
                <div className="loader-spinner"></div>
              </div>
            )}
            <img
              src={`${API_URL}/api/image?path=${encodeURIComponent(currentChart.path)}`}
              alt={currentChart.filename}
              className="viewer-image"
              style={{ 
                transform: `scale(${scale})`,
                opacity: isLoading ? 0 : 1
              }}
              onLoad={() => setIsLoading(false)}
              onClick={e => e.stopPropagation()}
            />
          </div>

          <button 
            className="nav-btn next-btn" 
            onClick={() => { onNavigate('next'); setScale(defaultScale); setIsLoading(true); }}
            disabled={currentIndex === charts.length - 1}
            title="Next (→)"
          >
            <ChevronRight size={32} />
          </button>
        </div>

        {/* Footer with Thumbnails */}
        <div className="viewer-footer">
          <div className="thumbnails-container">
            {charts.slice(Math.max(0, currentIndex - 5), Math.min(charts.length, currentIndex + 6)).map((chart, idx) => {
              const actualIndex = Math.max(0, currentIndex - 5) + idx;
              return (
                <button
                  key={`${chart.path}-${actualIndex}`}
                  className={`thumbnail ${actualIndex === currentIndex ? 'active' : ''}`}
                  onClick={() => { onNavigate(actualIndex - currentIndex); setScale(defaultScale); setIsLoading(true); }}
                >
                  <span className="thumb-label">{chart.ticker}</span>
                </button>
              );
            })}
          </div>
          <div className="keyboard-hints">
            <span>← → Navigate</span>
            <span>+/- Zoom</span>
            <span>Esc Close</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ImageViewer;