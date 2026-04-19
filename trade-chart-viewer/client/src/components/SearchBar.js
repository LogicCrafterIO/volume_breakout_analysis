import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Filter, Calendar, ChevronDown } from 'lucide-react';
import './SearchBar.css';

const monthOrder = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function SearchBar({ onSearch, structure }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedYears, setSelectedYears] = useState([]);
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const searchRef = useRef(null);

  const years = Object.keys(structure).sort((a, b) => parseInt(b) - parseInt(a));
  const months = monthOrder.filter(m => 
    selectedYears.length === 0 || selectedYears.some(y => structure[y]?.months?.[m])
  );
  const categories = ['Winners', 'Losers', 'Unknown'];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const params = {
      q: query.trim(),
      ...(selectedYears.length && { years: selectedYears.join(',') }),
      ...(selectedMonths.length && { months: selectedMonths.join(',') }),
      ...(selectedCategories.length && { categories: selectedCategories.join(',') }),
      ...(startDate && { startDate }),
      ...(endDate && { endDate })
    };
    onSearch(params);
    setIsOpen(false);
  };

  const toggleSelection = (setter, current, value) => {
    setter(current.includes(value) 
      ? current.filter(v => v !== value)
      : [...current, value]
    );
  };

  const clearFilters = () => {
    setQuery('');
    setSelectedYears([]);
    setSelectedMonths([]);
    setSelectedCategories([]);
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters = selectedYears.length || selectedMonths.length || 
    selectedCategories.length || startDate || endDate;

  return (
    <div className="search-bar-container" ref={searchRef}>
      <form className="search-form" onSubmit={handleSubmit}>
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by ticker, trade #, or date..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
          />
          {query && (
            <button type="button" className="clear-btn" onClick={() => setQuery('')}>
              <X size={16} />
            </button>
          )}
        </div>

        <button 
          type="button" 
          className={`filter-toggle ${isOpen ? 'active' : ''} ${hasActiveFilters ? 'has-filters' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
        >
          <Filter size={18} />
          {hasActiveFilters && <span className="filter-badge">!</span>}
          <ChevronDown size={16} className={`chevron ${isOpen ? 'up' : ''}`} />
        </button>

        <button type="submit" className="search-btn">
          Search
        </button>
      </form>

      {isOpen && (
        <div className="search-dropdown">
          <div className="filter-sections">
            <div className="filter-section">
              <h4>Years</h4>
              <div className="filter-options">
                {years.map(year => (
                  <label key={year} className="filter-chip">
                    <input
                      type="checkbox"
                      checked={selectedYears.includes(year)}
                      onChange={() => toggleSelection(setSelectedYears, selectedYears, year)}
                    />
                    <span>{year}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="filter-section">
              <h4>Months</h4>
              <div className="filter-options">
                {months.map(month => (
                  <label key={month} className="filter-chip">
                    <input
                      type="checkbox"
                      checked={selectedMonths.includes(month)}
                      onChange={() => toggleSelection(setSelectedMonths, selectedMonths, month)}
                    />
                    <span>{month.slice(0, 3)}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="filter-section">
              <h4>Categories</h4>
              <div className="filter-options">
                {categories.map(cat => (
                  <label key={cat} className={`filter-chip ${cat.toLowerCase()}`}>
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(cat)}
                      onChange={() => toggleSelection(setSelectedCategories, selectedCategories, cat)}
                    />
                    <span>{cat}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="filter-section date-section">
              <h4><Calendar size={14} /> Date Range</h4>
              <div className="date-inputs">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="Start date"
                />
                <span>to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="End date"
                />
              </div>
            </div>
          </div>

          <div className="filter-actions">
            <button type="button" className="clear-filters-btn" onClick={clearFilters}>
              Clear All
            </button>
            <button type="button" className="apply-filters-btn" onClick={handleSubmit}>
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SearchBar;