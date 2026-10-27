/**
 * Entry point: sets up the root element and renders the app. Included from
 * `src/index.html`.
 */
import {StrictMode} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {App} from './App';
import {StoreProvider} from './lib/store';
import {Toaster} from './components/ui/sonner';
import {TooltipProvider} from './components/ui/tooltip';

const elem = document.getElementById('root')!;
const app = (
  <StrictMode>
    <StoreProvider>
      <TooltipProvider>
        <App />
        <Toaster position="bottom-center" />
      </TooltipProvider>
    </StoreProvider>
  </StrictMode>
);

// https://bun.com/docs/bundler/hot-reloading#import-meta-hot-data
if (import.meta.hot) {
  type HotData = {root?: Root};
  ((import.meta.hot.data as HotData).root ??= createRoot(elem)).render(app);
} else {
  createRoot(elem).render(app);
}
