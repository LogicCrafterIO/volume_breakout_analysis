import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Calendar, TrendingUp, TrendingDown, HelpCircle, Hash, DollarSign } from 'lucide-react';
import './Gallery.css';

const categoryConfig = {
  Winners: { icon: TrendingUp, color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' },
  Losers: { icon: TrendingDown, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
  Unknown: { icon: HelpCircle, color: '#64748b', bg: 'rgba(100, 116, 139, 0.1)' }
};

const monthOrder = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function LazyImage({ src, alt, className }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '100px', threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} className={`lazy-image-container ${className}`}>
      {!isLoaded && (
        <div className="image-placeholder">
          <div className="placeholder-spinner"></div>
        </div>
      )}
      {isInView && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          className={`gallery-image ${isLoaded ? 'loaded' : ''}`}
        />
      )}
    </div>
  );
}

function Gallery({ 
  view, 
  structure, 
  charts, 
  selectedYear, 
  selectedMonth, 
  selectedCategories, 
  onYearSelect, 
  onMonthSelect, 
  onCategorySelect,
  onChartClick,
  searchQuery,
  onViewCharts
}) {
  const renderYears = () => {
    const years = Object.keys(structure).sort((a, b) => parseInt(b) - parseInt(a));

    return (
      <div className="grid years-grid">
        {years.map(year => {
          const data = structure[year];
          let winners = 0, losers = 0, unknown = 0;
          Object.values(data.months || {}).forEach(m => {
            Object.entries(m.categories || {}).forEach(([cat, c]) => {
              if (cat === 'Winners') winners += c.count;
              else if (cat === 'Losers') losers += c.count;
              else unknown += c.count;
            });
          });

          return (
            <button key={year} className="card year-card" onClick={() => onYearSelect(year)}>
              <div className="card-header">
                <Calendar size={24} color="#60a5fa" />
                <h3>{year}</h3>
              </div>
              <div className="card-stats">
                <span className="stat total">{data.totalCharts} charts</span>
                <div className="stat-breakdown">
                  <span style={{ color: '#22c55e' }}>{winners} W</span>
                  <span style={{ color: '#ef4444' }}>{losers} L</span>
                  <span style={{ color: '#64748b' }}>{unknown} U</span>
                </div>
              </div>
              <div className="card-footer">
                {Object.keys(data.months || {}).length} months
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  const renderMonths = () => {
    const months = Object.keys(structure[selectedYear]?.months || {})
      .sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b));

    return (
      <div className="grid months-grid">
        {months.map(month => {
          const data = structure[selectedYear].months[month];
          let winners = 0, losers = 0, unknown = 0;
          Object.entries(data.categories || {}).forEach(([cat, c]) => {
            if (cat === 'Winners') winners += c.count;
            else if (cat === 'Losers') losers += c.count;
            else unknown += c.count;
          });

          return (
            <button key={month} className="card month-card" onClick={() => onMonthSelect(month)}>
              <div className="card-header">
                <Calendar size={20} color="#a78bfa" />
                <h3>{month}</h3>
              </div>
              <div className="card-stats">
                <span className="stat total">{data.totalCharts} charts</span>
                <div className="stat-breakdown">
                  <span style={{ color: '#22c55e' }}>{winners} W</span>
                  <span style={{ color: '#ef4444' }}>{losers} L</span>
                  <span style={{ color: '#64748b' }}>{unknown} U</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  const renderCategories = () => {
    const categories = ['Winners', 'Losers', 'Unknown'];

    return (
      <>
        <div className="grid categories-grid">
          {categories.map(category => {
            const count = structure[selectedYear]?.months?.[selectedMonth]?.categories?.[category]?.count || 0;
            const config = categoryConfig[category];
            const Icon = config.icon;
            const isSelected = selectedCategories.includes(category);

            return (
              <button 
                key={category} 
                className={`card category-card ${isSelected ? 'selected' : ''}`}
                style={{ '--category-color': config.color, '--category-bg': config.bg }}
                onClick={() => onCategorySelect(category)}
              >
                <div className="card-icon" style={{ background: config.bg }}>
                  <Icon size={32} color={config.color} />
                </div>
                <h3 style={{ color: config.color }}>{category}</h3>
                <span className="category-count">{count} charts</span>
                {isSelected && <span className="selected-label">Selected</span>}
              </button>
            );
          })}
        </div>
        {selectedCategories.length > 0 && (
          <div className="view-charts-section">
            <button className="view-charts-btn" onClick={onViewCharts}>
              View {selectedCategories.length === 1 ? selectedCategories[0] : `${selectedCategories.length} Categories`} Charts
            </button>
          </div>
        )}
      </>
    );
  };

  const renderCharts = () => {
    if (!charts.length) {
      return (
        <div className="empty-state">
          <HelpCircle size={48} color="#64748b" />
          <p>No charts found in this category</p>
        </div>
      );
    }

    const winners = charts.filter(c => c.category === 'Winners').length;
    const losers = charts.filter(c => c.category === 'Losers').length;
    const unknown = charts.filter(c => c.category === 'Unknown').length;

    const categoryLabel = selectedCategories.length === 0
      ? 'Charts'
      : selectedCategories.length === 1
        ? selectedCategories[0]
        : `${selectedCategories.length} categories`;

    return (
      <>
        <div className="charts-header">
          <h2>{searchQuery || `${selectedYear} › ${selectedMonth} › ${categoryLabel}`}</h2>
          <div className="chart-stats">
            <span className="chart-count">{charts.length} charts</span>
            <div className="stat-breakdown">
              <span style={{ color: '#22c55e' }}>{winners} W</span>
              <span style={{ color: '#ef4444' }}>{losers} L</span>
              <span style={{ color: '#64748b' }}>{unknown} U</span>
            </div>
          </div>
        </div>
        <div className="grid charts-grid">
          {charts.map((chart, index) => {
            const config = categoryConfig[chart.category] || categoryConfig.Unknown;

            return (
              <div 
                key={`${chart.path}-${index}`} 
                className="chart-card"
                onClick={() => onChartClick(index)}
              >
                <div className="chart-thumbnail">
                  <LazyImage 
                    src={`/api/image?path=${encodeURIComponent(chart.path)}`}
                    alt={chart.filename}
                    className="thumbnail-img"
                  />
                  <div className="chart-overlay">
                    <span className="view-btn">View Full Size</span>
                  </div>
                </div>
                <div className="chart-info">
                  <div className="info-row">
                    <Hash size={14} />
                    <span className="trade-number">{chart.tradeNumber}</span>
                  </div>
                  <div className="info-row">
                    <DollarSign size={14} />
                    <span className="ticker">{chart.ticker}</span>
                  </div>
                  <div className="info-row">
                    <Calendar size={14} />
                    <span className="date">{chart.date}</span>
                  </div>
                  <span 
                    className="category-badge"
                    style={{ color: config.color, background: config.bg }}
                  >
                    {chart.category}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  };

  return (
    <div className="gallery">
      {view === 'years' && renderYears()}
      {view === 'months' && renderMonths()}
      {view === 'categories' && renderCategories()}
      {(view === 'charts' || view === 'search') && renderCharts()}
    </div>
  );
}

export default Gallery;