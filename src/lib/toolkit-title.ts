// The model supplies the passage, but a preacher-supplied title is authoritative.
export function applySermonTitle(markdown: string, sermonTitle?: string): string {
  const title = sermonTitle?.trim();
  if (!title) return markdown;

  const heading = markdown.match(/^# (.+)$/m);
  const passage = heading?.[1].match(/ (\([^()]*\d[^()]*\))\s*$/)?.[1];
  const literalTitle = title.replace(/\s*[\r\n]+\s*/g, ' ').replace(/([\\`*_\[\]<>~])/g, '\\$1');
  const line = `# ToolKit: ${literalTitle}${passage ? ' ' + passage : ''}`;
  return heading ? markdown.replace(/^# .+$/m, () => line) : `${line}\n\n${markdown}`;
}
