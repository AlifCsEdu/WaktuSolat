export function createTime(movement: () => 'tick' | 'sweep' = () => 'sweep') {
  let time = $state(new Date());

  $effect(() => {
    const mov = movement();
    if (mov === 'sweep') {
      let requestRef: number;
      const animate = () => {
        time = new Date();
        requestRef = requestAnimationFrame(animate);
      };
      requestRef = requestAnimationFrame(animate);
      return () => {
        cancelAnimationFrame(requestRef);
      };
    } else {
      const updateTick = () => {
        const now = new Date();
        now.setMilliseconds(0);
        time = now;
      };
      updateTick();
      const interval = setInterval(updateTick, 1000);
      return () => clearInterval(interval);
    }
  });

  return {
    get current() {
      return time;
    }
  };
}
