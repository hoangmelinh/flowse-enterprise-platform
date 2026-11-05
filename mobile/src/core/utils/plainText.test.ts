// Chạy: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toPlainText } from './plainText.ts';

test('Markdown của AI thành chữ thường cho bong bóng chat', () => {
  const md = [
    '## Việc quá hạn',
    '',
    '| # | Tên | Hạn |',
    '|---|---|---|',
    '| 1 | **Chốt kế hoạch** | 17:00 |',
    '',
    '- `Báo giá` NCC',
    '',
    '',
    '',
    'Xong',
  ].join('\n');
  assert.equal(toPlainText(md), ['Việc quá hạn', '', '• # · Tên · Hạn', '• 1 · Chốt kế hoạch · 17:00', '', '• Báo giá NCC', '', 'Xong'].join('\n'));
});
