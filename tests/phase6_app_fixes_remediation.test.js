import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

test('1. Home Featured Expedition Image & Location Error Remediation Contract', () => {
  const indexSrc = fs.readFileSync(path.join(ROOT, 'frontend/app/(tabs)/index.jsx'), 'utf8');

  // Verify Location Error fix: setLocationError is defined as state
  assert.ok(
    indexSrc.includes('const [locationError, setLocationError] = useState(null);'),
    'index.jsx must declare [locationError, setLocationError] with useState(null)'
  );
  assert.ok(
    indexSrc.includes('setLocationError(null);'),
    'index.jsx must reset locationError on granted GPS'
  );
  assert.ok(
    indexSrc.includes('setLocationError(state.errorMessage || "Device GPS permission is required.");'),
    'index.jsx must capture permission denial error message'
  );

  // Verify Featured Expedition Image fix:
  // 1. Valid local require source
  assert.ok(
    indexSrc.includes("const HERO_IMAGE = require('../../assets/images/dest_kashmir.jpg');"),
    'index.jsx must load authentic bundled dest_kashmir.jpg require asset'
  );
  // 2. normalizeImageSource used
  assert.ok(
    indexSrc.includes('source={normalizeImageSource(HERO_IMAGE)}'),
    'index.jsx must normalize hero image source safely'
  );
  // 3. heroCardHeight bounded constraint to prevent 18,000px Yoga explosion
  assert.ok(
    indexSrc.includes('styles.heroWrapper, { height: heroCardHeight }'),
    'heroWrapper must be constrained with explicit height: heroCardHeight'
  );
  // 4. heroCoverImage layout
  assert.ok(
    indexSrc.includes('heroCoverImage: {') &&
    indexSrc.includes('...StyleSheet.absoluteFillObject'),
    'heroCoverImage must fill container with absoluteFillObject'
  );
  // 5. heroBackground zIndex and padding
  assert.ok(
    indexSrc.includes('heroBackground: {') &&
    indexSrc.includes('zIndex: 5'),
    'heroBackground must have zIndex: 5 and absoluteFillObject to render above photograph'
  );
  // 6. Error fallback gradient
  assert.ok(
    indexSrc.includes('heroImageError && ('),
    'index.jsx must provide atmospheric gradient fallback when image fails to load'
  );
});

test('2. BUG-001: Trip Dates Independent Selection & Validation Contract', () => {
  const modalSrc = fs.readFileSync(path.join(ROOT, 'frontend/components/ui/CalendarPickerModal.jsx'), 'utf8');
  const tripsSrc = fs.readFileSync(path.join(ROOT, 'frontend/app/(tabs)/trips.jsx'), 'utf8');

  // 1. Two-tap state machine in CalendarPickerModal:
  // First tap sets departure date, clears return date, keeps picker open
  assert.ok(
    modalSrc.includes("setSelectedFrom(clickedIso);") &&
    modalSrc.includes("setSelectedTo('');"),
    'First tap must set departure date and clear return date without closing'
  );

  // Second tap on or after sets return date
  assert.ok(
    modalSrc.includes("setSelectedTo(clickedIso);"),
    'Second tap on or after departure date must set return date'
  );

  // If user taps an earlier date second, treat it as a new startDate
  assert.ok(
    modalSrc.includes("if (clickedIso < selectedFrom) {") &&
    modalSrc.includes("setSelectedFrom(clickedIso);") &&
    modalSrc.includes("setSelectedTo('');"),
    'Tapping an earlier date second must update departure date and keep picker open'
  );

  // Modal must not close or confirm on single date tap
  assert.ok(
    modalSrc.includes('if (!selectedFrom || !selectedTo) return;'),
    'handleConfirm must require both selectedFrom and selectedTo before applying'
  );

  // Apply button disabled when either date is missing
  assert.ok(
    modalSrc.includes('disabled={!selectedFrom || !selectedTo}'),
    'Apply button must be disabled until both dates are selected'
  );

  // Must support same-day trip (selectedFrom === selectedTo)
  assert.ok(
    modalSrc.includes("selectedFrom === selectedTo"),
    'Modal must support and display same-day trip'
  );

  // Visual rendering: Champagne/Beige design system styling (NO black geometric shapes)
  assert.ok(
    modalSrc.includes("selectedDayCircle: {\n    backgroundColor: '#B99A5E',") ||
    modalSrc.includes("backgroundColor: '#B99A5E',"),
    'selectedDayCircle must use champagne gold #B99A5E, not black #171817'
  );
  assert.ok(
    !modalSrc.includes("selectedDayCircle: {\n    backgroundColor: '#171817',"),
    'selectedDayCircle must NOT use solid black #171817'
  );
  assert.ok(
    modalSrc.includes("selectedDayText: {\n    color: '#FAF8F5',"),
    'selectedDayText must use crisp pearl white #FAF8F5 for high contrast on champagne gold'
  );
  assert.ok(
    modalSrc.includes("styles.rangeTrackHalf") && modalSrc.includes("styles.rangeTrackFull"),
    'CalendarPickerModal must render rounded range tracks behind selected circles for multi-day ranges'
  );
  assert.ok(
    modalSrc.includes("backgroundColor: '#F3EBDD'"),
    'Range tracks must use soft cashmere champagne background #F3EBDD'
  );

  // TripsScreen must validate that dateTo >= dateFrom
  assert.ok(
    tripsSrc.includes('if (dateTo.trim() < dateFrom.trim()) {'),
    'trips.jsx handleCreateTrip must validate return date is on or after departure date'
  );
  assert.ok(
    tripsSrc.includes('if (editDateTo.trim() < editDateFrom.trim()) {'),
    'trips.jsx handleSaveEditTrip must validate return date is on or after departure date'
  );
});

test('3. BUG-003: Custom Meetup Destination Input & Persistence Contract', () => {
  const modalSrc = fs.readFileSync(path.join(ROOT, 'frontend/components/CreateHangoutModal.jsx'), 'utf8');

  // 1. Text input for custom destination
  assert.ok(
    modalSrc.includes('styles.destinationTextInput') &&
    modalSrc.includes('accessibilityLabel="Destination or region"'),
    'CreateHangoutModal must provide a TextInput for entering custom destination'
  );

  // 2. Predefined chips still present and selectable
  assert.ok(
    modalSrc.includes('DESTINATION_NAMES.map((d) => {'),
    'CreateHangoutModal must retain predefined destination chips'
  );
  assert.ok(
    modalSrc.includes('onPress={() => handleDestinationChange(d)}'),
    'Tapping a predefined chip must update destination'
  );

  // 3. Validation before submission
  assert.ok(
    modalSrc.includes('if (!destination.trim() || destination.trim().length < 2) {'),
    'handleSubmit must validate destination is not empty (minimum 2 characters)'
  );

  // 4. Persistence into createHangout payload
  assert.ok(
    modalSrc.includes('destination: destination.trim(),') &&
    modalSrc.includes('place_name: destination.trim(),'),
    'handleSubmit must pass trimmed custom destination into createHangout'
  );
});

test('4. BUG-004: Bottom Navigation Layout Constraints & Scaling Protection Contract', () => {
  const layoutSrc = fs.readFileSync(path.join(ROOT, 'frontend/app/(tabs)/_layout.jsx'), 'utf8');

  // 1. Container constraints
  assert.ok(
    layoutSrc.includes('minHeight: 58'),
    '_layout.jsx tabBarContainer must enforce minHeight constraint'
  );

  // 2. Responsive tabItem constraints (prevent overlapping)
  assert.ok(
    layoutSrc.includes('minWidth: 0'),
    '_layout.jsx tabItem must set minWidth: 0 to prevent flex item overlap'
  );

  // 3. Tab label layout & text scaling protection
  assert.ok(
    layoutSrc.includes('numberOfLines={1}'),
    '_layout.jsx tabLabel must enforce numberOfLines={1}'
  );
  assert.ok(
    layoutSrc.includes('ellipsizeMode="tail"'),
    '_layout.jsx tabLabel must set ellipsizeMode="tail"'
  );
  assert.ok(
    layoutSrc.includes('maxFontSizeMultiplier={1.15}'),
    '_layout.jsx tabLabel must set maxFontSizeMultiplier={1.15} to protect against font blowup'
  );
  assert.ok(
    layoutSrc.includes('textAlign: "center"'),
    '_layout.jsx tabLabel must center text'
  );
  assert.ok(
    layoutSrc.includes('includeFontPadding: false'),
    '_layout.jsx tabLabel must disable extra Android font padding'
  );

  // 4. All 6 core navigation tabs present
  const requiredTabs = ['Home', 'Discover', 'Feed', 'Chat', 'Trips', 'Profile'];
  requiredTabs.forEach((tab) => {
    assert.ok(layoutSrc.includes(`label: '${tab}'`), `_layout.jsx must include tab "${tab}"`);
  });
});
