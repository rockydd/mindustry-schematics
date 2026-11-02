import { useEffect, useState } from 'react';
import './App.css';
import { BrowseGallery } from './components/BrowseGallery';
import { ViewPanel } from './components/ViewPanel';

type Mode = 'browse' | 'view';

function parseHash(): { mode: Mode; selectedId: string | null } {
  const h = window.location.hash.replace(/^#/, '');
  if (h === 'view') return { mode: 'view', selectedId: null };
  if (h.startsWith('s/')) return { mode: 'browse', selectedId: decodeURIComponent(h.slice(2)) };
  return { mode: 'browse', selectedId: null };
}

export default function AppMindustry() {
  const [{ mode, selectedId }, setRoute] = useState(parseHash);

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return (
    <div className="app-shell">
      <header>
        <h1>Mindustry Schematics</h1>
        <p className="lede">
          Browse community schematics from r/Mindustry, or paste your own to preview it with the
          real game sprites.
        </p>
      </header>

      <div className="mode-toggle">
        <button
          className={mode === 'browse' ? 'active' : ''}
          onClick={() => {
            window.location.hash = 'browse';
          }}
        >
          Browse
        </button>
        <button
          className={mode === 'view' ? 'active' : ''}
          onClick={() => {
            window.location.hash = 'view';
          }}
        >
          View
        </button>
      </div>

      {mode === 'browse' ? <BrowseGallery selectedId={selectedId} /> : <ViewPanel />}

      <p className="footer">
        Community schematics remain the work of their authors on{' '}
        <a href="https://www.reddit.com/r/Mindustry/">r/Mindustry</a>. Block sprites and names ©
        Anuke / Mindustry, licensed under{' '}
        <a href="https://www.gnu.org/licenses/gpl-3.0.html">GPL-3.0</a>. This site is also GPL-3.0
        and vendors those sprites with attribution. Source:{' '}
        <a href="https://github.com/Anuken/Mindustry">Anuken/Mindustry</a>.
      </p>
    </div>
  );
}
