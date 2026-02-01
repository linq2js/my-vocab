import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage, AddVocabPage, SettingsPage } from './pages';
import { OfflineIndicator } from './components/molecules';
import './App.css';

/**
 * Main application component with routing configuration.
 * Uses React Router for client-side navigation between pages.
 *
 * Routes:
 * - `/` - HomePage (vocabulary list and search)
 * - `/add` - AddVocabPage (add new vocabulary)
 * - `/settings` - SettingsPage (app settings and API keys)
 *
 * Features:
 * - Offline indicator when network is unavailable
 * - Full PWA support with service worker
 *
 * @returns The root application component with routing
 */
function App(): React.ReactElement {
  return (
    <BrowserRouter>
      {/* Offline indicator banner */}
      <OfflineIndicator />
      
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/add" element={<AddVocabPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
