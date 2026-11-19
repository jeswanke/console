/* Copyright Contributors to the Open Cluster Management project */

/** Mask Helm/Argo expressions without moving YAML line or column positions. */
export function maskYamlTemplates(source: string): string {
  return source.replace(/{{[^{}]*}}/g, (template: string, offset: number) => {
    const lineStart = source.lastIndexOf('\n', offset - 1) + 1
    const nextNewline = source.indexOf('\n', offset + template.length)
    const lineEnd = nextNewline === -1 ? source.length : nextNewline
    const standalone =
      !source.slice(lineStart, offset).trim() && !source.slice(offset + template.length, lineEnd).trim()
    return template
      .split('\n')
      .map((line, index) => line.replace(/[^\r]/g, standalone || index > 0 ? ' ' : 'x'))
      .join('\n')
  })
}
