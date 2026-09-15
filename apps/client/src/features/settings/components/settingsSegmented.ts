/** Shared segmented track: equal muted inset, selected fill is flush in its cell. */
export const SETTINGS_SEGMENTED_TRACK =
  'grid h-12 w-full items-stretch gap-0 rounded-md bg-muted p-1';

export const SETTINGS_SEGMENTED_OPTION =
  'inline-flex h-full min-h-0 w-full items-center justify-center rounded-sm px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

export const settingsSegmentedOptionState = (selected: boolean): string =>
  selected
    ? 'bg-background text-foreground shadow-none'
    : 'text-muted-foreground hover:text-foreground';
