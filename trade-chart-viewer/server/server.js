const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3001;
const TRADE_CHARTS_DIR = path.resolve(__dirname, '..', 'trade_charts');

app.use(cors());
app.use(express.json());

function isValidPath(targetPath) {
  const resolved = path.resolve(targetPath);
  const rootResolved = path.resolve(TRADE_CHARTS_DIR);
  return resolved.startsWith(rootResolved);
}

async function scanDirectory(dirPath) {
  const structure = {};

  try {
    await fs.access(dirPath);
  } catch {
    return structure;
  }

  try {
    const years = await fs.readdir(dirPath);

    for (const year of years.sort((a, b) => parseInt(b) - parseInt(a))) {
      const yearPath = path.join(dirPath, year);
      const yearStat = await fs.stat(yearPath).catch(() => null);
      if (!yearStat?.isDirectory() || !/^\d{4}$/.test(year)) continue;

      structure[year] = { months: {}, totalCharts: 0 };

      const months = await fs.readdir(yearPath);
      const monthOrder = ['January','February','March','April','May','June',
                          'July','August','September','October','November','December'];
      const sortedMonths = months.sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b));

      for (const month of sortedMonths) {
        const monthPath = path.join(yearPath, month);
        const monthStat = await fs.stat(monthPath).catch(() => null);
        if (!monthStat?.isDirectory()) continue;

        structure[year].months[month] = { categories: {}, totalCharts: 0 };

        const categories = await fs.readdir(monthPath);
        for (const category of categories) {
          if (!['Winners', 'Losers', 'Unknown'].includes(category)) continue;

          const categoryPath = path.join(monthPath, category);
          const catStat = await fs.stat(categoryPath).catch(() => null);
          if (!catStat?.isDirectory()) continue;

          const files = await fs.readdir(categoryPath);
          const charts = files
            .filter(f => f.toLowerCase().endsWith('.png'))
            .map(filename => {
              const baseName = filename.replace(/\.png$/i, '');
              const parts = baseName.split('_');
              return {
                filename,
                tradeNumber: parts[0] || '',
                ticker: parts[1] || '',
                date: parts[2] || '',
                year,
                month,
                category,
                path: path.join(year, month, category, filename)
              };
            })
            .sort((a, b) => (b.date || '').localeCompare(a.date || '') || 
                            (b.tradeNumber || '').localeCompare(a.tradeNumber || ''));

          structure[year].months[month].categories[category] = {
            count: charts.length,
            charts
          };
          structure[year].months[month].totalCharts += charts.length;
          structure[year].totalCharts += charts.length;
        }
      }
    }
  } catch (err) {
    console.error('Scan error:', err);
  }

  return structure;
}

app.get('/api/structure', async (req, res) => {
  try {
    const structure = await scanDirectory(TRADE_CHARTS_DIR);
    res.json(structure);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/charts', async (req, res) => {
  const { year, month, category, categories } = req.query;
  const categoryParam = categories || category;
  if (!year || !month || !categoryParam) {
    return res.status(400).json({ error: 'Missing year, month, or category parameter' });
  }

  const categoryList = categoryParam.split(',').map(cat => cat.trim()).filter(Boolean);
  if (!categoryList.length) {
    return res.status(400).json({ error: 'No valid categories provided' });
  }

  try {
    const charts = [];
    for (const cat of categoryList) {
      const catPath = path.join(TRADE_CHARTS_DIR, year, month, cat);
      if (!isValidPath(catPath)) {
        continue; // Skip invalid paths
      }

      try {
        const files = await fs.readdir(catPath);
        charts.push(...files
          .filter(f => f.toLowerCase().endsWith('.png'))
          .map(filename => {
            const parts = filename.replace(/\.png$/i, '').split('_');
            return {
              filename,
              tradeNumber: parts[0] || '',
              ticker: parts[1] || '',
              date: parts[2] || '',
              category: cat,
              path: path.join(year, month, cat, filename)
            };
          })
        );
      } catch (catErr) {
        // Skip categories that don't exist or can't be read
        console.warn(`Skipping category ${cat}: ${catErr.message}`);
      }
    }

    const sortedCharts = charts.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    res.json(sortedCharts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/image', async (req, res) => {
  const imagePath = req.query.path;
  if (!imagePath) return res.status(400).json({ error: 'Path parameter is required' });

  const fullPath = path.join(TRADE_CHARTS_DIR, imagePath);
  if (!isValidPath(fullPath)) return res.status(403).json({ error: 'Invalid image path' });

  try {
    await fs.access(fullPath);
    res.sendFile(fullPath);
  } catch {
    res.status(404).json({ error: 'Image not found' });
  }
});

app.get('/api/search', async (req, res) => {
  const { q, years, months, categories, startDate, endDate } = req.query;

  try {
    const structure = await scanDirectory(TRADE_CHARTS_DIR);
    const results = [];

    const searchYears = years ? years.split(',') : Object.keys(structure).sort().reverse();
    const searchMonths = months ? months.split(',') : null;
    const searchCategories = categories ? categories.split(',') : null;

    for (const year of searchYears) {
      if (!structure[year]) continue;
      for (const month of Object.keys(structure[year].months)) {
        if (searchMonths && !searchMonths.includes(month)) continue;
        for (const category of Object.keys(structure[year].months[month].categories)) {
          if (searchCategories && !searchCategories.includes(category)) continue;

          const charts = structure[year].months[month].categories[category].charts;
          for (const chart of charts) {
            const query = (q || '').toLowerCase().trim();
            const matchesQuery = !query || 
              chart.ticker.toLowerCase().includes(query) ||
              chart.tradeNumber.includes(query) ||
              chart.date.includes(query) ||
              chart.filename.toLowerCase().includes(query);

            const matchesDate = (!startDate || (chart.date && chart.date >= startDate)) && 
                              (!endDate || (chart.date && chart.date <= endDate));

            if (matchesQuery && matchesDate) {
              results.push(chart);
            }
          }
        }
      }
    }

    res.json(results.sort((a, b) => (b.date || '').localeCompare(a.date || '')));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✓ Trade Chart Server running on http://localhost:${PORT}`);
  console.log(`✓ Serving charts from: ${TRADE_CHARTS_DIR}`);
});
