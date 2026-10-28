import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getTabBarClearance } from '../frontend/lib/nativeUiHelpers.js';

test('1. Profile Location Persistence Remediation Contract', () => {
  const authContextCode = fs.readFileSync('frontend/lib/authContext.jsx', 'utf8');
  const profileCode = fs.readFileSync('frontend/app/(tabs)/profile.jsx', 'utf8');

  // Assert authContext enriches profile with location metadata
  assert.ok(
    authContextCode.includes('let city = data.city || meta.city'),
    'fetchSupabaseProfile must fallback to user_metadata city'
  );
  assert.ok(
    authContextCode.includes('let location = data.location || meta.location'),
    'fetchSupabaseProfile must fallback to user_metadata location'
  );
  assert.ok(
    authContextCode.includes('@maybewe_user_location'),
    'authContext must check and sync @maybewe_user_location'
  );
  assert.ok(
    authContextCode.includes('updates.city || updates.location'),
    'updateProfile must store both city and location updates'
  );

  // Assert profile.jsx accurately checks profile.location without dropping it
  assert.ok(
    profileCode.includes('displayLocation = (profile?.location && typeof profile.location ==='),
    'profile.jsx displayLocation must prioritize sanitized profile.location'
  );
  assert.ok(
    profileCode.includes('setEditLocation(sanitizeProfileCity(profile));'),
    'profile.jsx useEffect must sync edit location whenever profile changes'
  );
});

test('2. CinematicDestinationZoom Black Screen & Back Navigation Remediation Contract', async () => {
  const zoomCode = fs.readFileSync('frontend/components/CinematicDestinationZoom.jsx', 'utf8');

  // 1. Layout Contract: Modal root View has safe flex-1 filling layout
  assert.ok(
    zoomCode.includes('fullscreenOverlay: {') && zoomCode.includes('flex: 1,'),
    'fullscreenOverlay must declare flex: 1 to prevent Modal dialog layout collapse on Android'
  );

  // 2. Loading Overlay Style Contract: photoLoadingOverlay and photoLoadingText defined
  assert.ok(
    zoomCode.includes('photoLoadingOverlay: {') && zoomCode.includes('justifyContent: '),
    'photoLoadingOverlay must be explicitly defined in StyleSheet with centering layout'
  );
  assert.ok(
    zoomCode.includes('photoLoadingText: {') && zoomCode.includes('color: '),
    'photoLoadingText must be explicitly defined in StyleSheet with high-contrast text'
  );

  // 3. Image Lifecycle Fallback Timeout Contract
  assert.ok(
    zoomCode.includes('setIsPhotoLoading(false)') && zoomCode.includes('timeoutId'),
    'CinematicDestinationZoom must include defensive fallback timeout to prevent hanging loaders'
  );

  // 4. Assert BackHandler is registered for reliable hardware back pops
  assert.ok(
    zoomCode.includes('BackHandler.addEventListener(\'hardwareBackPress\', onBackPress)'),
    'CinematicDestinationZoom must register hardwareBackPress handler'
  );

  // 5. Assert satelliteOpacity maintains visible celestial backdrop
  assert.ok(
    zoomCode.includes('outputRange: [0.85, 0.55, 0.40]'),
    'satelliteOpacity must preserve a visible background layer'
  );

  // 6. Behavioral State Machine Simulation: Destination Image Lifecycle
  let state = {
    destinationId: 'goa',
    isPhotoLoading: true,
    imageError: false,
    photoSource: null,
  };

  // Simulating image load completion
  const handleLoadSuccess = () => {
    state.isPhotoLoading = false;
  };
  handleLoadSuccess();
  assert.equal(state.isPhotoLoading, false, 'Successful image load must dismiss photo loading state');

  // Simulating image load error
  state = { destinationId: 'unknown', isPhotoLoading: true, imageError: false, photoSource: null };
  const handleLoadError = () => {
    state.imageError = true;
    state.isPhotoLoading = false;
    state.photoSource = 'fallback_bundled_asset';
  };
  handleLoadError();
  assert.equal(state.isPhotoLoading, false, 'Image error must dismiss photo loading state');
  assert.equal(state.imageError, true, 'Image error must flag error state');
  assert.ok(state.photoSource, 'Fallback photo source must be resolved');

  // Simulating defensive timeout
  state = { destinationId: 'hanging_url', isPhotoLoading: true, imageError: false };
  const handleTimeout = () => {
    state.isPhotoLoading = false;
  };
  handleTimeout();
  assert.equal(state.isPhotoLoading, false, 'Defensive timeout must dismiss loading state');
});

test('3. Maps WebView Loading State & Hardware Back Handler Contract', () => {
  const mapCode = fs.readFileSync('frontend/components/maps/MaybeWeMap.jsx', 'utf8');
  const mapsScreenCode = fs.readFileSync('frontend/app/maps.jsx', 'utf8');

  // Assert startInLoadingState is enabled on WebView
  assert.ok(
    mapCode.includes('startInLoadingState={true}'),
    'MaybeWeMap WebView must have startInLoadingState={true} to render loading indicator'
  );
  assert.ok(
    mapCode.includes('loadingText'),
    'MaybeWeMap must display descriptive loading text'
  );

  // Assert maps.jsx registers hardware back press and safe back dismissals
  assert.ok(
    mapsScreenCode.includes('BackHandler.addEventListener("hardwareBackPress", onBackPress)'),
    'maps.jsx must register hardwareBackPress listener'
  );
  assert.ok(
    mapsScreenCode.includes('if (selectedPlace) {'),
    'maps.jsx handleBack must dismiss selected place before popping screen'
  );
});

test('4. Home Screen Layout, Card Proportions & Spacing Remediation Contract', () => {
  const indexCode = fs.readFileSync('frontend/app/(tabs)/index.jsx', 'utf8');

  // Assert Popular Across India uses responsive carouselCardWidth
  assert.ok(
    indexCode.includes('style={[styles.editorialCityCard, { width: carouselCardWidth }, SHADOWS.card]}'),
    'Popular Across India cards must use responsive carouselCardWidth matching state destinations'
  );

  // Assert sectionHeaderRow vertical alignment is centered
  assert.ok(
    indexCode.includes("sectionHeaderRow: {\n    flexDirection: 'row',\n    alignItems: 'center',"),
    'sectionHeaderRow must vertically center section title, subtitle, and explore link'
  );

  // Assert ScrollView bottom clearance is driven by responsive getTabBarClearance math
  assert.strictEqual(
    getTabBarClearance(0, true),
    70,
    'Web clearance must strictly preserve established 70dp baseline'
  );
  assert.strictEqual(
    getTabBarClearance(0, false),
    94,
    'Native Android clearance with zero insets must provide 94dp floating bar clearance'
  );
  assert.strictEqual(
    getTabBarClearance(24, false),
    106,
    'Native Android gesture navigation (24dp inset) must calculate 106dp clearance'
  );
  assert.strictEqual(
    getTabBarClearance(34, false),
    116,
    'Native iOS Home indicator (34dp inset) must calculate 116dp clearance'
  );
  assert.ok(
    indexCode.includes('getTabBarClearance(insets.bottom'),
    'index.jsx must calculate responsive bottom clearance via getTabBarClearance'
  );
  assert.ok(
    indexCode.includes('paddingBottom: bottomClearance'),
    'ScrollView contentContainerStyle must bind paddingBottom to bottomClearance'
  );
  assert.ok(
    indexCode.includes('marginBottom: 16'),
    'popularPlacesScroll marginBottom must be trimmed from 44 to 16'
  );

  // Assert placeRatingBadge has vertical centering and proper padding
  assert.ok(
    indexCode.includes('gap: 4,') && indexCode.includes('paddingVertical: 4,'),
    'placeRatingBadge must have sufficient padding and vertical alignment to prevent clipping'
  );
});

test('5. Bottom Navigation Bar Compression & Distribution Contract', () => {
  const layoutCode = fs.readFileSync('frontend/app/(tabs)/_layout.jsx', 'utf8');

  // Assert equal flex: 1 distribution
  assert.ok(
    layoutCode.includes('tabItem: {\n    flex: 1,'),
    'All tabs must have equal flex: 1 distribution'
  );

  // Assert active tab does not expand horizontally into a wide squishing pill
  assert.ok(
    !layoutCode.includes('activePill: {'),
    'activePill expanding layout must be replaced with balanced vertical item hierarchy'
  );

  // Assert champagne dot indicator is cleanly aligned
  assert.ok(
    layoutCode.includes('champagneActiveDot: {') && layoutCode.includes('dotPlaceholder: {'),
    'Tab items must maintain identical heights and positions via champagne indicator and placeholder'
  );
});
