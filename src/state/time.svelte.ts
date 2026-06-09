class CurrentTime {
  value = $state(new Date());

  constructor() {
    // Only run in the browser
    if (typeof window !== 'undefined') {
      setInterval(() => {
        this.value = new Date();
      }, 1000);
    }
  }
}

export const currentTimeState = new CurrentTime();
