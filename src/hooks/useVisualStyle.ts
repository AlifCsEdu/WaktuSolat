export function getStyleClasses(visualStyle: string, defaultClasses: string = ""): string {
  if (!visualStyle) return defaultClasses;
  
  if (visualStyle === 'glass') {
    return `${defaultClasses} backdrop-blur-xl bg-white/10 dark:bg-black/10 border-white/20`;
  } else if (visualStyle === 'soft') {
    return `${defaultClasses} bg-gray-50/50 dark:bg-gray-900/50 border-transparent`;
  } else if (visualStyle === 'retro') {
    return `${defaultClasses} border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]`;
  }
  
  return defaultClasses;
}

export function useIconStroke(visualStyle: string): number {
  return visualStyle === 'retro' ? 3 : visualStyle === 'glass' || visualStyle === 'soft' ? 1.5 : 2;
}
