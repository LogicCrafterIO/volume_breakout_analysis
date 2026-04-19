import React from 'react';
import { Calendar, Folder, Trophy, XCircle, HelpCircle, ChevronRight } from 'lucide-react';
import './Sidebar.css';

const categoryIcons = {
  Winners: Trophy,
  Losers: XCircle,
  Unknown: HelpCircle
};

const categoryColors = {
  Winners: '#22c55e',
  Losers: '#ef4444',
  Unknown: '#64748b'
};

function Sidebar({ 
  structure, 
  currentView, 
  selectedYear, 
  selectedMonth, 
  selectedCategories,
  onYearSelect, 
  onMonthSelect, 
  onCategorySelect 
}) {
  const years = Object.keys(structure).sort((a, b) => parseInt(b) - parseInt(a));

  const getYearStats = (year) => {
    const yearData = structure[year];
    let total = 0, winners = 0, losers = 0, unknown = 0;
    Object.values(yearData.months || {}).forEach(month => {
      Object.entries(month.categories || {}).forEach(([cat, data]) => {
        total += data.count;
        if (cat === 'Winners') winners += data.count;
        else if (cat === 'Losers') losers += data.count;
        else unknown += data.count;
      });
    });
    return { total, winners, losers, unknown };
  };

  const getMonthStats = (year, month) => {
    const monthData = structure[year]?.months?.[month];
    let total = 0, winners = 0, losers = 0, unknown = 0;
    Object.entries(monthData?.categories || {}).forEach(([cat, data]) => {
      total += data.count;
      if (cat === 'Winners') winners += data.count;
      else if (cat === 'Losers') losers += data.count;
      else unknown += data.count;
    });
    return { total, winners, losers, unknown };
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <Folder size={20} />
        <h3>Navigation</h3>
      </div>

      <nav className="sidebar-nav">
        {(currentView === 'years' || currentView === 'search') && (
          <div className="nav-section">
            <h4 className="section-title">Years</h4>
            <ul className="nav-list">
              {years.map(year => {
                const stats = getYearStats(year);
                return (
                  <li key={year}>
                    <button 
                      className="nav-item"
                      onClick={() => onYearSelect(year)}
                    >
                      <div className="nav-item-main">
                        <Calendar size={16} />
                        <span className="nav-label">{year}</span>
                        <span className="nav-count">{stats.total}</span>
                      </div>
                      <div className="nav-stats">
                        <span style={{ color: '#22c55e' }}>{stats.winners}W</span>
                        <span style={{ color: '#ef4444' }}>{stats.losers}L</span>
                        <span style={{ color: '#64748b' }}>{stats.unknown}U</span>
                      </div>
                      <ChevronRight size={16} className="nav-arrow" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {currentView === 'months' && selectedYear && (
          <div className="nav-section">
            <h4 className="section-title">{selectedYear} › Months</h4>
            <ul className="nav-list">
              {Object.keys(structure[selectedYear]?.months || {}).map(month => {
                const stats = getMonthStats(selectedYear, month);
                return (
                  <li key={month}>
                    <button 
                      className="nav-item"
                      onClick={() => onMonthSelect(month)}
                    >
                      <div className="nav-item-main">
                        <Calendar size={16} />
                        <span className="nav-label">{month}</span>
                        <span className="nav-count">{stats.total}</span>
                      </div>
                      <div className="nav-stats">
                        <span style={{ color: '#22c55e' }}>{stats.winners}W</span>
                        <span style={{ color: '#ef4444' }}>{stats.losers}L</span>
                        <span style={{ color: '#64748b' }}>{stats.unknown}U</span>
                      </div>
                      <ChevronRight size={16} className="nav-arrow" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {currentView === 'categories' && selectedYear && selectedMonth && (
          <div className="nav-section">
            <h4 className="section-title">{selectedMonth} › Categories</h4>
            <ul className="nav-list">
              {['Winners', 'Losers', 'Unknown'].map(category => {
                const count = structure[selectedYear]?.months?.[selectedMonth]?.categories?.[category]?.count || 0;
                const Icon = categoryIcons[category];
                const isSelected = selectedCategories.includes(category);

                return (
                  <li key={category}>
                    <button 
                      className={`nav-item ${isSelected ? 'active' : ''}`}
                      onClick={() => onCategorySelect(category)}
                    >
                      <div className="nav-item-main">
                        <Icon size={16} color={categoryColors[category]} />
                        <span className="nav-label" style={{ color: categoryColors[category] }}>
                          {category}
                        </span>
                        <span className="nav-count">{count}</span>
                      </div>
                      <ChevronRight size={16} className="nav-arrow" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {(currentView === 'charts' || currentView === 'search') && (
          <div className="nav-section">
            <h4 className="section-title">Quick Filters</h4>
            <ul className="nav-list compact">
              {['Winners', 'Losers', 'Unknown'].map(category => {
                const Icon = categoryIcons[category];
                return (
                  <li key={category}>
                    <button className="nav-item compact">
                      <Icon size={14} color={categoryColors[category]} />
                      <span style={{ color: categoryColors[category], fontSize: '0.8rem' }}>
                        {category}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </nav>
    </aside>
  );
}

export default Sidebar;