import { appSettings } from "../../state/settings.svelte";

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
    return {
        get value() { return appSettings.settings.visualStyle; }
    };
}
