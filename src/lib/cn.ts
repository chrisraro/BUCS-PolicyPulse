/** Minimal className joiner — avoids pulling in clsx/cva as a dependency. */
export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}
