// ============================================================
// MaybeWe — Native UI & Image Helpers
// Single source of truth for responsive bottom clearance,
// crop math, and safe, resilient image loading across platforms.
// ============================================================

export const TAB_BAR_HEIGHT = 60;
export const TAB_BAR_BOTTOM_OFFSET = 18;
export const TAB_BAR_GAP = 16;

/**
 * Calculates bottom clearance for ScrollViews and list containers
 * to ensure content is never occluded by the floating bottom tab bar.
 *
 * @param {number} bottomInset - Safe area bottom inset from useSafeAreaInsets()
 * @param {boolean} isWeb - True if Platform.OS === 'web'
 * @returns {number} Required bottom padding in dp
 */
export function getTabBarClearance(bottomInset = 0, isWeb = false) {
  if (isWeb) {
    // Keep web layout byte-identical and preserve established 70dp clearance
    return 70;
  }
  // Native Android/iOS: tab bar height (60) + bottom offset (Math.max(insets, 12) + 6) + safety gap (16)
  const safeBottom = typeof bottomInset === 'number' && !isNaN(bottomInset) ? Math.max(bottomInset, 0) : 0;
  const floatingOffset = Math.max(safeBottom, 12) + 6;
  return floatingOffset + TAB_BAR_HEIGHT + TAB_BAR_GAP;
}

/**
 * Computes the percentage of a photo hidden when scaled via resizeMode="cover"
 *
 * @param {number} containerWidth
 * @param {number} containerHeight
 * @param {number} photoAspect - width / height ratio of photograph
 * @returns {number} Percentage (0 - 100) of photo cropped
 */
export function getLandscapeCropPercentage(containerWidth, containerHeight, photoAspect = 1.5) {
  if (
    typeof containerWidth !== 'number' ||
    typeof containerHeight !== 'number' ||
    isNaN(containerWidth) ||
    isNaN(containerHeight) ||
    containerWidth <= 0 ||
    containerHeight <= 0 ||
    !photoAspect ||
    photoAspect <= 0
  ) {
    return 0;
  }
  const containerAspect = containerWidth / containerHeight;
  if (photoAspect > containerAspect) {
    // Photo wider than box: sides cropped
    const scaledWidth = containerHeight * photoAspect;
    return Math.max(0, Math.min(100, ((scaledWidth - containerWidth) / scaledWidth) * 100));
  } else {
    // Photo taller than box: top/bottom cropped
    const scaledHeight = containerWidth / photoAspect;
    return Math.max(0, Math.min(100, ((scaledHeight - containerHeight) / scaledHeight) * 100));
  }
}

/**
 * Relative luminance for WCAG contrast ratio calculation.
 */
export function getRelativeLuminance(r, g, b) {
  const [sR, sG, sB] = [r, g, b].map((val) => {
    const v = val / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * sR + 0.7152 * sG + 0.0722 * sB;
}

/**
 * WCAG contrast ratio between two relative luminance values.
 */
export function getContrastRatio(lum1, lum2) {
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Validates whether an image source is safe to fetch over the network or render locally.
 * Disallows insecure http:// URLs to comply with Android 9+ cleartext traffic restrictions.
 * Preserves numeric local assets (require()) and valid URI objects.
 */
export function isValidImageSource(source) {
  if (source == null) return false;
  // Bundled require() asset (must be positive integer)
  if (typeof source === 'number') {
    return Number.isInteger(source) && source > 0;
  }
  // String URL or data URI
  if (typeof source === 'string') {
    const trimmed = source.trim();
    if (!trimmed) return false;
    if (trimmed.startsWith('http://')) return false; // Insecure cleartext HTTP rejected
    return trimmed.startsWith('https://') || trimmed.startsWith('data:') || trimmed.startsWith('file:');
  }
  // Object with uri property (e.g., { uri: 'https://...' })
  if (typeof source === 'object' && typeof source.uri === 'string') {
    const trimmedUri = source.uri.trim();
    if (!trimmedUri) return false;
    if (trimmedUri.startsWith('http://')) return false; // Insecure cleartext HTTP rejected
    return trimmedUri.startsWith('https://') || trimmedUri.startsWith('data:') || trimmedUri.startsWith('file:');
  }
  return false;
}

/**
 * Normalizes an image source to a format accepted by React Native Image.
 * - Returns numeric local assets (require()) directly as numbers.
 * - Wraps valid string URLs/URIs in { uri }.
 * - Preserves already valid { uri: ... } objects.
 * - Falls back to a valid fallbackAsset if provided, or returns null.
 *
 * @param {string|number|object|null|undefined} source
 * @param {string|number|object|null|undefined} fallbackAsset
 * @returns {object|number|null}
 */
export function normalizeImageSource(source, fallbackAsset = null) {
  // 1. Valid numeric require() asset
  if (typeof source === 'number' && Number.isInteger(source) && source > 0) {
    return source;
  }
  // 2. Valid string URL / data URI
  if (typeof source === 'string') {
    const trimmed = source.trim();
    if (isValidImageSource(trimmed)) {
      return { uri: trimmed };
    }
  }
  // 3. Valid { uri } object
  if (typeof source === 'object' && source !== null && isValidImageSource(source)) {
    return source;
  }
  // 4. If invalid source, defensively attempt to resolve fallbackAsset
  if (fallbackAsset != null) {
    if (typeof fallbackAsset === 'number' && Number.isInteger(fallbackAsset) && fallbackAsset > 0) {
      return fallbackAsset;
    }
    if (typeof fallbackAsset === 'string') {
      const trimmedFallback = fallbackAsset.trim();
      if (isValidImageSource(trimmedFallback)) {
        return { uri: trimmedFallback };
      }
    }
    if (typeof fallbackAsset === 'object' && isValidImageSource(fallbackAsset)) {
      return fallbackAsset;
    }
  }
  // 5. Invariant: never return an invalid { uri: undefined } or empty string to Image
  return null;
}
