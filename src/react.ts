import { createElement, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { mountGame } from './gui/App.ts';
function App() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => root.current ? mountGame(root.current) : undefined, []);
  return createElement('div', {
    ref: root
  });
}
createRoot(document.getElementById('app')!).render(createElement(App));
