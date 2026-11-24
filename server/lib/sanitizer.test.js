import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { stripHtml } from './sanitizer.js';

describe('stripHtml — Sanitizer Utility', () => {
  it('should return empty string for non-string inputs', () => {
    assert.equal(stripHtml(null), '');
    assert.equal(stripHtml(undefined), '');
    assert.equal(stripHtml(12345), '');
    assert.equal(stripHtml({}), '');
    assert.equal(stripHtml(['<script>']), '');
    assert.equal(stripHtml(true), '');
  });

  it('should preserve regular plain text unchanged', () => {
    const text = 'KTU S4 Operating Systems 2023 Regular Solved Question Paper';
    assert.equal(stripHtml(text), text);
  });

  it('should strip basic HTML tags', () => {
    assert.equal(stripHtml('<b>Important</b> Notes'), 'Important Notes');
    assert.equal(stripHtml('<p>First paragraph</p><p>Second paragraph</p>'), 'First paragraphSecond paragraph');
    assert.equal(stripHtml('<a href="https://example.com">Click here</a>'), 'Click here');
  });

  it('should strip script tags and their enclosing tags', () => {
    assert.equal(stripHtml('<script>alert("XSS")</script>Maths 101'), 'alert("XSS")Maths 101');
    assert.equal(stripHtml('<script src="https://evil.com/xss.js"></script>'), '');
  });

  it('should strip image and event-handler tags', () => {
    assert.equal(stripHtml('<img src=x onerror=alert(1)>PYQ 2022'), 'PYQ 2022');
    assert.equal(stripHtml('<svg onload=alert(document.domain)>'), '');
    assert.equal(stripHtml('<body onload="alert(1)">'), '');
  });

  it('should strip iframe and embed tags', () => {
    assert.equal(stripHtml('<iframe src="javascript:alert(1)"></iframe>'), '');
    assert.equal(stripHtml('<embed src="malicious.swf">'), '');
  });

  it('should strip nested and overlapping tags designed to evade single-pass regex', () => {
    // Nested tag attack: when inner <script> is removed, outer doesn't reconstitute a tag
    const nested = '<<script>script>alert(1)<</script>/script>';
    assert.equal(stripHtml(nested), 'alert(1)');

    const nestedImg = '<<img src=>img src=x onerror=alert(1)>';
    assert.equal(stripHtml(nestedImg), '');
  });

  it('should enforce 2000 character boundary before sanitization', () => {
    const longString = 'a'.repeat(2500) + '<b>test</b>';
    const result = stripHtml(longString);
    assert.ok(result.length <= 2000);
    assert.ok(!result.includes('<b>'));
    assert.ok(!result.includes('</b>'));
  });
});

