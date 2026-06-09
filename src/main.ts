import { mount } from 'svelte';
import App from './App.svelte';
// @ts-ignore
import './index.css';
// @ts-ignore
import './m3e-layout.css';
import { initState } from './state/init';

initState();

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
