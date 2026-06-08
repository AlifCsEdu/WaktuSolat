import { mount } from 'svelte';
import App from './App.svelte';
import './index.css';
import './m3e-layout.css';

const app = mount(App, {
  target: document.getElementById('root')!,
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      console.log('ServiceWorker registration successful with scope: ', reg.scope);
    }, (err) => {
      console.warn('ServiceWorker registration failed: ', err);
    });
  });
}

export default app;
