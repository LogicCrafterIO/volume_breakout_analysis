import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Gallery from './components/Gallery';
import ImageViewer from './components/ImageViewer';
import SearchBar from './components/SearchBar';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function App() {
  const [structure, setStructure] = useState({});
  const [currentView, setCurrentView] = useState('years');
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [charts, setCharts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentChartIndex, setCurrentChartIndex] = useState(0);
  const [searchResults, setSearchResults] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [defaultZoom, setDefaultZoom] = useState(() => {
    const value = parseInt(window.localStorage.getItem('defaultImageZoom'), 10);
    return Number.isFinite(value) ? value : 75;
  });

  useEffect(() => {
    fetchStructure();
  }, []);

  useEffect(() => {
    window.localStorage.setItem('defaultImageZoom', defaultZoom.toString());
  }, [defaultZoom]);

  const handleDefaultZoomChange = (value) => {
    const normalized = Math.min(200, Math.max(25, Number(value) || 75));
    setDefaultZoom(normalized);
  };

  const fetchStructure = async () => {
    try {
      const res = await fetch(`${API_URL}/api/structure`);
      const data = await res.json();
      setStructure(data);
    } catch (err) {
      console.error('Failed to load structure:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCharts = useCallback(async (year, month, category) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/charts?year=${year}&month=${month}&category=${category}`);
      const data = await res.json();
      setCharts(data);
      setSearchResults(null);
    } catch (err) {
      console.error('Failed to load charts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = async (params) => {
    const hasSearchParams = Boolean(
      (params.q && params.q.trim()) ||
      params.years ||
      params.months ||
      params.categories ||
      params.startDate ||
      params.endDate
    );

    if (!hasSearchParams) {
      setSearchResults(null);
      setCurrentView('years');
      setSearchQuery('');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const query = new URLSearchParams(params).toString();
      const res = await fetch(`${API_URL}/api/search?${query}`);
      const data = await res.json();
      setSearchResults(data);
      setCurrentView('search');
      setSearchQuery(params.q || 'Search Results');
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleYearSelect = (year) => {
    setSelectedYear(year);
    setSelectedMonth(null);
    setSelectedCategories([]);
    setSearchResults(null);
    setCurrentView('months');
  };

  const handleMonthSelect = (month) => {
    setSelectedMonth(month);
    setSelectedCategories([]);
    setSearchResults(null);
    setCurrentView('categories');
  };

  const handleCategorySelect = (category) => {
    setSearchResults(null);
    const nextCategories = selectedCategories.includes(category)
      ? selectedCategories.filter(c => c !== category)
      : [...selectedCategories, category];

    setSelectedCategories(nextCategories);
    // Stay in categories view to allow multi-select
    setCurrentView('categories');
  };

  const handleViewCharts = () => {
    if (selectedCategories.length > 0) {
      fetchCharts(selectedYear, selectedMonth, selectedCategories.join(','));
      setCurrentView('charts');
    }
  };

  const handleBack = () => {
    if (currentView === 'charts') {
      setCurrentView('categories');
    } else if (currentView === 'categories') {
      setSelectedMonth(null);
      setCurrentView('months');
    } else if (currentView === 'months') {
      setSelectedYear(null);
      setCurrentView('years');
    } else if (currentView === 'search') {
      setSearchResults(null);
      setCurrentView(selectedYear ? (selectedCategories.length ? 'charts' : selectedMonth ? 'categories' : 'months') : 'years');
    }
  };

  const handleChartClick = (index) => {
    setCurrentChartIndex(index);
    setViewerOpen(true);
  };

  const handleNavigate = (direction) => {
    const list = searchResults || charts;
    if (direction === 'prev') {
      setCurrentChartIndex(prev => prev > 0 ? prev - 1 : list.length - 1);
    } else {
      setCurrentChartIndex(prev => prev < list.length - 1 ? prev + 1 : 0);
    }
  };

  const getBreadcrumb = () => {
    if (currentView === 'search') return [{ label: 'Search Results', action: null }];
    const crumbs = [{ label: 'Years', action: () => { setCurrentView('years'); setSelectedYear(null); }}];
    if (selectedYear) {
      crumbs.push({ label: selectedYear, action: () => handleYearSelect(selectedYear) });
    }
    if (selectedMonth) {
      crumbs.push({ label: selectedMonth, action: () => handleMonthSelect(selectedMonth) });
    }
    if (selectedCategories.length === 1) {
      crumbs.push({ label: selectedCategories[0], action: () => handleCategorySelect(selectedCategories[0]) });
    } else if (selectedCategories.length > 1) {
      crumbs.push({ label: `${selectedCategories.length} categories`, action: () => setCurrentView('categories') });
    }
    return crumbs;
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1>📈 Trade Chart Viewer</h1>
          <div className="zoom-setting">
            <label>
              Default image zoom
              <input
                type="number"
                min="25"
                max="200"
                value={defaultZoom}
                onChange={(e) => handleDefaultZoomChange(e.target.value)}
              />
              %
            </label>
          </div>
          <SearchBar onSearch={handleSearch} structure={structure} />
        </div>
      </header>

      <div className="main-container">
        <Sidebar 
          structure={structure} 
          currentView={currentView}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          selectedCategories={selectedCategories}
          onYearSelect={handleYearSelect}
          onMonthSelect={handleMonthSelect}
          onCategorySelect={handleCategorySelect}
        />

        <main className="content">
          <nav className="breadcrumb">
            {getBreadcrumb().map((crumb, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span className="separator">›</span>}
                <button 
                  className={`crumb ${idx === getBreadcrumb().length - 1 ? 'active' : ''}`}
                  onClick={crumb.action}
                  disabled={!crumb.action}
                >
                  {crumb.label}
                </button>
              </React.Fragment>
            ))}
          </nav>

          {loading ? (
            <div className="loading"><div className="spinner"></div><p>Loading...</p></div>
          ) : (
            <Gallery 
              view={currentView}
              structure={structure}
              charts={searchResults || charts}
              selectedYear={selectedYear}
              selectedMonth={selectedMonth}
              selectedCategories={selectedCategories}
              onYearSelect={handleYearSelect}
              onMonthSelect={handleMonthSelect}
              onCategorySelect={handleCategorySelect}
              onChartClick={handleChartClick}
              searchQuery={searchQuery}
              onViewCharts={handleViewCharts}
            />
          )}
        </main>
      </div>

      {viewerOpen && (
        <ImageViewer 
          charts={searchResults || charts}
          currentIndex={currentChartIndex}
          onClose={() => setViewerOpen(false)}
          onNavigate={handleNavigate}
          apiUrl={API_URL}
          defaultZoom={defaultZoom}
        />
      )}
    </div>
  );
}

export default App;