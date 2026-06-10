import 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

declare module 'svelte/elements' {
  interface SvelteHTMLElements {
    'md-filled-tonal-button': any;
    'md-filled-tonal-icon-button': any;
    'md-filled-button': any;
    'md-filled-icon-button': any;
    'md-outlined-button': any;
    'md-icon-button': any;
    'md-text-button': any;
    'md-icon': any;
    'md-elevation': any;
    'md-ripple': any;
    'md-switch': any;
    'md-filter-chip': any;
    'md-slider': any;
    'md-tabs': any;
    'md-secondary-tab': any;
    'md-outlined-text-field': any;
    'md-outlined-select': any;
    'md-select-option': any;
    'md-circular-progress': any;
    'md-linear-progress': any;
    'md-dialog': any;
    'md-radio': any;
    'md-checkbox': any;
  }
}
