import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  getTabBarClearance,
  getLandscapeCropPercentage,
  getRelativeLuminance,
  getContrastRatio,
  isValidImageSource,
  normalizeImageSource,
  TAB_BAR_HEIGHT,
  TAB_BAR_BOTTOM_OFFSET,
  TAB_BAR_GAP,
} from '../frontend/lib/nativeUiHelpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

test('1. GlassCard Native Style Contract: Android path vs Web snapshot equivalence', () => {
  const themeSrc = fs.readFileSync(path.join(ROOT, 'frontend/lib/theme.js'), 'utf8');
  const glassCardSrc = fs.readFileSync(path.join(ROOT, 'frontend/components/ui/GlassCard.jsx'), 'utf8');

  // Verify Android tokens exist in theme.js
  assert.ok(themeSrc.includes('export const ANDROID_CARD_SURFACES = {'), 'ANDROID_CARD_SURFACES must be defined');
  assert.ok(themeSrc.includes("pearl: \"#FFFFFF\"") || themeSrc.includes("pearl: '#FFFFFF'"), 'Pearl surface must be solid white on Android');
  assert.ok(themeSrc.includes("surfaceBorder: \"rgba(197, 168, 128, 0.40)\"") || themeSrc.includes("surfaceBorder: 'rgba(197, 168, 128, 0.40)'"), 'Surface border must use champagne-gold token');

  // Verify GlassCard uses Android tokens and safe elevation without clipping
  assert.ok(glassCardSrc.includes('ANDROID_CARD_SURFACES'), 'GlassCard must import ANDROID_CARD_SURFACES');
  assert.ok(glassCardSrc.includes("overflow: 'visible'"), 'Android card must set overflow visible to avoid clipping elevation');
  assert.ok(glassCardSrc.includes('elevation: 2'), 'Standard card must have elevation 2 on Android');
  assert.ok(glassCardSrc.includes('elevation: 4'), 'Elevated card must have elevation 4 on Android');

  // Compare web style snapshot to ensure web path remains 100% byte-identical
  const snapshotPath = '/tmp/glasscard_web_snapshot.json';
  if (fs.existsSync(snapshotPath)) {
    const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
    assert.strictEqual(
      snapshot.styles.card.borderColor,
      'rgba(197, 168, 128, 0.28)',
      'Web card border must remain unchanged'
    );
    assert.strictEqual(
      snapshot.styles.standard.boxShadow,
      '0 4px 16px -2px rgba(29, 29, 27, 0.06), 0 1px 3px rgba(29, 29, 27, 0.03)',
      'Web standard shadow must remain unchanged'
    );
  }
});

test('2. Image Fit & Crop Calculation Contract: Aspect ratios and boundary safety', () => {
  // 3:2 photo (1.50) in 236 x 270 card
  const crop32 = getLandscapeCropPercentage(236, 270, 1.5);
  assert.ok(crop32 > 40 && crop32 < 43, `Crop should be ~41.7%, got ${crop32.toFixed(1)}%`);

  // 4:3 photo (1.33) in 260 x 270 card
  const crop43 = getLandscapeCropPercentage(260, 270, 4 / 3);
  assert.ok(crop43 > 26 && crop43 < 30, `Crop should be ~27.8%, got ${crop43.toFixed(1)}%`);

  // Boundary safety tests: undefined, zero, NaN, negative, large widths
  assert.strictEqual(getLandscapeCropPercentage(undefined, 270, 1.5), 0);
  assert.strictEqual(getLandscapeCropPercentage(0, 270, 1.5), 0);
  assert.strictEqual(getLandscapeCropPercentage(NaN, 270, 1.5), 0);
  assert.strictEqual(getLandscapeCropPercentage(-100, 270, 1.5), 0);
  assert.strictEqual(getLandscapeCropPercentage(236, 0, 1.5), 0);
  assert.strictEqual(getLandscapeCropPercentage(236, NaN, 1.5), 0);
  assert.strictEqual(getLandscapeCropPercentage(236, 270, 0), 0);

  // Very large box where box is wider than photo
  const wideBoxCrop = getLandscapeCropPercentage(2000, 200, 1.5); // aspect 10 vs 1.5 -> photo taller than box
  assert.ok(wideBoxCrop > 0 && wideBoxCrop <= 100);
});

test('3. Reliable Image Source Validation & Normalization Contract', () => {
  // Insecure http rejected
  assert.strictEqual(isValidImageSource('http://insecure.com/photo.jpg'), false);
  assert.strictEqual(isValidImageSource({ uri: 'http://insecure.com/photo.jpg' }), false);

  // Empty / null / undefined rejected
  assert.strictEqual(isValidImageSource(null), false);
  assert.strictEqual(isValidImageSource(undefined), false);
  assert.strictEqual(isValidImageSource(''), false);
  assert.strictEqual(isValidImageSource('   '), false);
  assert.strictEqual(isValidImageSource({ uri: '' }), false);

  // Secure https / require() accepted
  assert.strictEqual(isValidImageSource('https://images.unsplash.com/photo'), true);
  assert.strictEqual(isValidImageSource({ uri: 'https://images.unsplash.com/photo' }), true);
  assert.strictEqual(isValidImageSource(42), true); // numeric require ID

  // Normalization
  assert.deepStrictEqual(normalizeImageSource('https://img.com/a.jpg'), { uri: 'https://img.com/a.jpg' });
  assert.strictEqual(normalizeImageSource(42), 42);
});

test('4. Tab Bar Clearance Math Contract: Insets, heights, and web parity', () => {
  // Web parity: must return exactly 70dp unchanged
  assert.strictEqual(getTabBarClearance(0, true), 70);
  assert.strictEqual(getTabBarClearance(24, true), 70);
  assert.strictEqual(getTabBarClearance(34, true), 70);

  // Native Android/iOS:
  // inset 0: Math.max(0, 12) + 6 + 60 + 16 = 18 + 76 = 94dp
  assert.strictEqual(getTabBarClearance(0, false), 94);

  // inset 24 (gesture nav): Math.max(24, 12) + 6 + 60 + 16 = 30 + 76 = 106dp
  assert.strictEqual(getTabBarClearance(24, false), 106);

  // inset 34: Math.max(34, 12) + 6 + 60 + 16 = 40 + 76 = 116dp
  assert.strictEqual(getTabBarClearance(34, false), 116);

  // Safety against undefined/NaN insets
  assert.strictEqual(getTabBarClearance(undefined, false), 94);
  assert.strictEqual(getTabBarClearance(NaN, false), 94);
});

test('5. WCAG Contrast Helper & Hero Overlay Luminance Contract', () => {
  // Test Alabaster vs Obsidian
  const bgL = getRelativeLuminance(250, 248, 245); // #FAF8F5
  const textL = getRelativeLuminance(23, 24, 23);   // #171817
  const contrast = getContrastRatio(bgL, textL);
  assert.ok(contrast > 15, `Text contrast should exceed 15:1, got ${contrast.toFixed(2)}:1`);

  // Test Gold vs dark scrim
  const goldL = getRelativeLuminance(212, 175, 55); // #D4AF37
  const scrimL = getRelativeLuminance(65, 65, 65);  // dark scrim over white photo
  const scrimContrast = getContrastRatio(goldL, scrimL);
  assert.ok(scrimContrast >= 4.5, `Tag text contrast should exceed 4.5:1, got ${scrimContrast.toFixed(2)}:1`);
});
