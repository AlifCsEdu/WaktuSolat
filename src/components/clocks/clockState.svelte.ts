export function createTime(getMovement: () => 'tick' | 'sweep' = () => 'sweep') {
    let time = $state(new Date());

    $effect(() => {
        let frameId: number;
        let intervalId: ReturnType<typeof setInterval>;
        const movement = getMovement();

        if (movement === 'sweep') {
            const animate = () => {
                time = new Date();
                frameId = requestAnimationFrame(animate);
            };
            frameId = requestAnimationFrame(animate);
        } else {
            const updateTick = () => {
                const now = new Date();
                now.setMilliseconds(0);
                time = now;
            };
            updateTick();
            intervalId = setInterval(updateTick, 1000);
        }

        return () => {
            if (frameId) cancelAnimationFrame(frameId);
            if (intervalId) clearInterval(intervalId);
        };
    });

    return {
        get value() { return time; }
    };
}

export function createVisualStyle() {
    let style = $state<'default' | 'retro' | 'glass' | 'soft'>('default');

    $effect(() => {
        const getStoredStyle = () => {
            const current = document.documentElement.getAttribute('data-style') as 'default' | 'retro' | 'glass' | 'soft' | null;
            if (current) style = current;
        };
        
        getStoredStyle();

        const observer = new MutationObserver(() => {
            const current = document.documentElement.getAttribute('data-style') as 'default' | 'retro' | 'glass' | 'soft' | null;
            if (current && current !== style) style = current;
        });

        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-style'] });
        
        return () => observer.disconnect();
    });

    return {
        get value() { return style; }
    };
}
