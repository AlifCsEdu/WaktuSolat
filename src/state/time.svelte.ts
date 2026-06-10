class CurrentTime {
  value = $state(new Date());

  constructor() {
    // Only run in the browser
    if (typeof window !== 'undefined') {
      console.log('[CurrentTime] constructor running, setting up interval');
      setInterval(() => {
        console.log('[CurrentTime] ticking:', new Date().toLocaleTimeString());
        this.value = new Date();
      }, 1000);
    }
  }
}

export const currentTimeState = new CurrentTime();
