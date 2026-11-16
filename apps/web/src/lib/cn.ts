/**
 * Joins class names and drops the empty ones. It does not resolve conflicts: when two classes
 * set the same property, the one later in the generated CSS wins, not the one later in this
 * list. So components never pass a class that fights a variant's own; they add a variant
 * (or a prop such as Button's `square`) instead.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}
