# Trade Chart Viewer

A full-stack web application for browsing and viewing trade charts stored in a hierarchical folder structure. Built with React frontend and Node.js/Express backend.

## Features

- **Hierarchical Navigation**: Browse years → months → categories → individual charts
- **Dynamic Structure**: Automatically detects and displays folder structure with counts
- **Advanced Search**: Search by ticker, trade number, or date with multi-select filters
- **Image Viewer**: Full-screen modal with keyboard navigation (← → arrows, +/- zoom, Esc close)
- **Lazy Loading**: Intersection Observer-based image loading for performance
- **Responsive Design**: Works on desktop and mobile devices
- **Security**: Path traversal protection for safe file serving

## Project Structure

```
trade-chart-viewer/
├── server/                 # Node.js/Express backend
│   ├── server.js          # Main server with API endpoints
│   └── package.json       # Server dependencies
├── client/                 # React frontend
│   ├── public/
│   │   └── index.html     # HTML template
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── Sidebar.js      # Navigation sidebar
│   │   │   ├── Gallery.js      # Chart grid display
│   │   │   ├── ImageViewer.js  # Full-screen image viewer
│   │   │   └── SearchBar.js    # Search and filter UI
│   │   ├── App.js         # Main application component
│   │   ├── App.css        # Main styles
│   │   └── index.js       # React entry point
│   └── package.json       # Client dependencies
├── package.json           # Root package with scripts
└── README.md             # This file
```

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Trade charts organized in `trade_charts/` folder at project root

## Folder Structure Expected

```
trade_charts/
├── 2024/
│   ├── January/
│   │   ├── Winners/
│   │   │   ├── 100527_PNTG_2024-01-08.png
│   │   │   └── ...
│   │   ├── Losers/
│   │   └── Unknown/
│   ├── February/
│   └── ...
├── 2025/
└── ...
```

## Installation

### Option 1: Install all dependencies at once

```bash
cd trade-chart-viewer
npm run install-all
```

### Option 2: Install manually

```bash
# Install root dependencies
cd trade-chart-viewer
npm install

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

## Running the Application

### Development Mode (both frontend and backend)

```bash
cd trade-chart-viewer
npm start
```

This starts:
- Backend server at http://localhost:3001
- React client at http://localhost:3000

### Run separately

```bash
# Terminal 1 - Backend
cd server
node server.js

# Terminal 2 - Frontend
cd client
npm start
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/structure` | Get complete folder hierarchy with counts |
| `GET /api/charts?year=&month=&category=` | Get charts for specific category |
| `GET /api/image?path=` | Serve image file (with path traversal protection) |
| `GET /api/search?q=&years=&months=&categories=&startDate=&endDate=` | Search across all charts |

## Security Features

The application implements security measures to prevent path traversal attacks [^34^]:

- **Path Validation**: Uses `path.resolve()` and checks if resolved path stays within root directory
- **No URL Decoding Issues**: Handles encoded path attempts (e.g., `%2F`, `%252F`)
- **Null Byte Protection**: Rejects paths containing null bytes
- **Absolute Path Rejection**: Blocks absolute paths like `/etc/passwd`

```javascript
// Server security implementation
function isValidPath(targetPath) {
  const resolved = path.resolve(targetPath);
  const rootResolved = path.resolve(TRADE_CHARTS_DIR);
  return resolved.startsWith(rootResolved + path.sep);
}
```

## Keyboard Shortcuts

When viewing images:

| Key | Action |
|-----|--------|
| `←` | Previous image |
| `→` | Next image |
| `+` or `=` | Zoom in |
| `-` | Zoom out |
| `0` | Reset zoom |
| `Esc` | Close viewer |

## Performance Optimizations

- **Lazy Loading**: Images load only when scrolled into viewport using Intersection Observer
- **Efficient Scanning**: Server caches directory structure on request
- **Optimized Thumbnails**: Gallery shows thumbnails, full image in viewer
- **Debounced Search**: Search inputs are debounced to prevent excessive API calls

## Customization

### Change the trade charts directory

Edit `server/server.js`:
```javascript
const TRADE_CHARTS_DIR = path.resolve(process.cwd(), '..', 'your-folder-name');
```

### Change server port

Edit `server/server.js`:
```javascript
const PORT = 3001; // Change to your preferred port
```

Or set environment variable:
```bash
PORT=4000 node server.js
```

### Change API URL (for production)

Edit `client/src/App.js`:
```javascript
const API_URL = 'https://your-production-api.com';
```

Or set environment variable:
```bash
REACT_APP_API_URL=https://api.example.com npm start
```

## Building for Production

```bash
cd client
npm run build
```

This creates a `build/` folder with optimized static files. Serve these with your preferred web server or the Express server.

## Troubleshooting

### Images not loading
- Check that `trade_charts` folder exists at project root
- Verify folder structure matches expected format
- Check server logs for path validation errors

### Search not working
- Ensure server is running on port 3001
- Check browser console for CORS errors
- Verify network connectivity to backend

### Port conflicts
- Change `PORT` in `server/server.js`
- Change `proxy` in `client/package.json` to match new port

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## License

MIT
