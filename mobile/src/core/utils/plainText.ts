/** Markdown → chữ đọc được trong bong bóng chat: bỏ **, #, `; bảng thành "• ô · ô"; bỏ dòng kẻ bảng. */
export const toPlainText = (md: string): string =>
  md
    .split('\n')
    .filter((line) => !/^\s*\|?\s*:?-{3,}/.test(line))
    .map((line) => {
      const l = line.trim();
      if (l.startsWith('|')) return '• ' + l.split('|').map((c) => c.trim()).filter(Boolean).join(' · ');
      return line.replace(/^#{1,6}\s*/, '').replace(/^\s*[-*]\s+/, '• ');
    })
    .join('\n')
    .replace(/\*\*|__|`/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
