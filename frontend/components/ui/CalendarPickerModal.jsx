import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FONTS, RADII, SHADOWS } from '../../lib/theme';
import { useTheme } from '../../lib/themeContext';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Helper to format ISO YYYY-MM-DD
function toIsoString(year, month, day) {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

// Helper to parse ISO string
function parseIsoDate(iso) {
  if (!iso || typeof iso !== 'string') return null;
  const parts = iso.split('-');
  if (parts.length < 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return { year: y, month: m, day: d, date: new Date(y, m, d) };
}

// Pretty format date for display e.g. "30 Sep 2026"
function formatDisplayDate(iso) {
  const parsed = parseIsoDate(iso);
  if (!parsed) return '';
  return `${parsed.day} ${MONTH_SHORT[parsed.month]} ${parsed.year}`;
}

export default function CalendarPickerModal({
  visible,
  onClose,
  onSelectRange,
  initialDateFrom = '',
  initialDateTo = '',
  activeField = 'departure', // 'departure' | 'return'
  title = 'Select Trip Dates',
}) {
  const { colors, isDark } = useTheme();

  // Internal selection state
  const [selectedFrom, setSelectedFrom] = useState(initialDateFrom || '');
  const [selectedTo, setSelectedTo] = useState(initialDateTo || '');

  // Year/Month view modes: 'calendar' | 'yearMonthPicker'
  const [pickerMode, setPickerMode] = useState('calendar');

  // Currently viewed month/year in calendar
  const today = useMemo(() => new Date(), []);
  const todayIso = useMemo(
    () => toIsoString(today.getFullYear(), today.getMonth(), today.getDate()),
    [today]
  );

  const [viewYear, setViewYear] = useState(() => {
    const parsed = parseIsoDate(initialDateFrom) || parseIsoDate(initialDateTo);
    return parsed ? parsed.year : today.getFullYear();
  });

  const [viewMonth, setViewMonth] = useState(() => {
    const parsed = parseIsoDate(initialDateFrom) || parseIsoDate(initialDateTo);
    return parsed ? parsed.month : today.getMonth();
  });

  // Available years for quick year-picker jump (current year to +5 years)
  const availableYears = useMemo(() => {
    const curY = today.getFullYear();
    const years = [];
    for (let y = curY; y <= curY + 6; y++) {
      years.push(y);
    }
    return years;
  }, [today]);

  // Sync state whenever modal opens
  useEffect(() => {
    if (visible) {
      setSelectedFrom(initialDateFrom || '');
      setSelectedTo(initialDateTo || '');
      setPickerMode('calendar');

      const targetIso = activeField === 'return' && initialDateTo
        ? initialDateTo
        : initialDateFrom || initialDateTo;

      const parsed = parseIsoDate(targetIso);
      if (parsed) {
        setViewYear(parsed.year);
        setViewMonth(parsed.month);
      } else {
        setViewYear(today.getFullYear());
        setViewMonth(today.getMonth());
      }
    }
  }, [visible, initialDateFrom, initialDateTo, activeField, today]);

  // Calendar matrix computation
  const daysInMonth = useMemo(() => {
    return new Date(viewYear, viewMonth + 1, 0).getDate();
  }, [viewYear, viewMonth]);

  const firstDayIndex = useMemo(() => {
    return new Date(viewYear, viewMonth, 1).getDay();
  }, [viewYear, viewMonth]);

  // Navigation handlers
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleJumpYearMonth = (year, month) => {
    setViewYear(year);
    setViewMonth(month);
    setPickerMode('calendar');
  };

  // Date cell click handling for range selection
  const handleDayPress = (day) => {
    const clickedIso = toIsoString(viewYear, viewMonth, day);

    // If disabled past date, ignore
    if (clickedIso < todayIso) return;

    // Range selection state machine
    if (!selectedFrom || (selectedFrom && selectedTo)) {
      // Start a new selection
      setSelectedFrom(clickedIso);
      setSelectedTo('');
    } else if (selectedFrom && !selectedTo) {
      if (clickedIso < selectedFrom) {
        // Tapped earlier date: shift departure to this date
        setSelectedFrom(clickedIso);
      } else {
        // Tapped on or after departure date: complete range
        setSelectedTo(clickedIso);
      }
    }
  };

  const handleConfirm = () => {
    onSelectRange?.({
      dateFrom: selectedFrom,
      dateTo: selectedTo || selectedFrom,
    });
    onClose?.();
  };

  const handleClear = () => {
    setSelectedFrom('');
    setSelectedTo('');
  };

  // Quick range helpers
  const handleQuickPreset = (daysAhead) => {
    const start = new Date(today);
    start.setDate(start.getDate() + 1);
    const end = new Date(start);
    end.setDate(end.getDate() + daysAhead);

    const fromIso = toIsoString(start.getFullYear(), start.getMonth(), start.getDate());
    const toIso = toIsoString(end.getFullYear(), end.getMonth(), end.getDate());

    setSelectedFrom(fromIso);
    setSelectedTo(toIso);
    setViewYear(start.getFullYear());
    setViewMonth(start.getMonth());
  };

  // Night calculation
  const nightsCount = useMemo(() => {
    if (!selectedFrom || !selectedTo) return 0;
    const p1 = parseIsoDate(selectedFrom);
    const p2 = parseIsoDate(selectedTo);
    if (!p1 || !p2) return 0;
    const diff = p2.date - p1.date;
    return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
  }, [selectedFrom, selectedTo]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View
          style={[
            styles.calendarCard,
            {
              backgroundColor: isDark ? colors.modalBg || '#1E1F1E' : '#FBFAF7',
              borderColor: isDark ? colors.border : '#D7D2C8',
            },
          ]}
        >
          {/* Top Header Row */}
          <View style={[styles.headerRow, { borderBottomColor: isDark ? colors.border : '#E5D8C8' }]}>
            <View style={styles.headerTitleWrap}>
              <Ionicons name="calendar" size={18} color="#B99A5E" style={{ marginRight: 8 }} />
              <Text style={[styles.modalTitle, { color: isDark ? '#FFFFFF' : '#171817' }]}>
                {title}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={22} color={isDark ? '#FFFFFF' : '#171817'} />
            </TouchableOpacity>
          </View>

          {/* Travel Range Summary Banner */}
          <View style={[styles.rangeSummaryBanner, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F1EEE6' }]}>
            <View style={styles.rangePillBox}>
              <View style={styles.dateBlock}>
                <Text style={styles.dateBlockLabel}>DEPARTURE</Text>
                <Text style={[styles.dateBlockValue, { color: isDark ? '#FFFFFF' : '#171817' }]}>
                  {selectedFrom ? formatDisplayDate(selectedFrom) : 'Select date'}
                </Text>
              </View>

              <View style={styles.rangeDividerLine}>
                <Ionicons name="airplane" size={14} color="#B99A5E" />
                {nightsCount > 0 && (
                  <Text style={styles.nightsBadge}>{nightsCount} {nightsCount === 1 ? 'night' : 'nights'}</Text>
                )}
              </View>

              <View style={styles.dateBlock}>
                <Text style={styles.dateBlockLabel}>RETURN</Text>
                <Text style={[styles.dateBlockValue, { color: isDark ? '#FFFFFF' : '#171817' }]}>
                  {selectedTo ? formatDisplayDate(selectedTo) : (selectedFrom ? 'Tap return date' : '—')}
                </Text>
              </View>
            </View>
          </View>

          {/* Month / Year Bar with Direct Jump Tap */}
          <View style={styles.monthNavBar}>
            <TouchableOpacity
              onPress={handlePrevMonth}
              disabled={pickerMode === 'yearMonthPicker'}
              style={[styles.chevronBtn, pickerMode === 'yearMonthPicker' && styles.disabledChevron]}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={20} color={isDark ? '#FFFFFF' : '#171817'} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setPickerMode((m) => (m === 'calendar' ? 'yearMonthPicker' : 'calendar'))}
              style={[
                styles.monthYearSelectorBtn,
                pickerMode === 'yearMonthPicker' && { backgroundColor: '#E6D5AF' },
              ]}
              activeOpacity={0.8}
            >
              <Text style={[styles.monthYearText, { color: isDark && pickerMode !== 'yearMonthPicker' ? '#FFFFFF' : '#171817' }]}>
                {MONTH_NAMES[viewMonth]} {viewYear}
              </Text>
              <Ionicons
                name={pickerMode === 'yearMonthPicker' ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={isDark && pickerMode !== 'yearMonthPicker' ? '#B99A5E' : '#171817'}
                style={{ marginLeft: 6 }}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleNextMonth}
              disabled={pickerMode === 'yearMonthPicker'}
              style={[styles.chevronBtn, pickerMode === 'yearMonthPicker' && styles.disabledChevron]}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-forward" size={20} color={isDark ? '#FFFFFF' : '#171817'} />
            </TouchableOpacity>
          </View>

          {/* Content Area: Either Calendar Grid or Direct Year/Month Picker */}
          {pickerMode === 'yearMonthPicker' ? (
            <View style={styles.yearMonthGridContainer}>
              <Text style={[styles.pickerSectionHeading, { color: isDark ? '#FFFFFF' : '#171817' }]}>
                SELECT YEAR
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.yearScroll}>
                {availableYears.map((yr) => (
                  <TouchableOpacity
                    key={yr}
                    onPress={() => setViewYear(yr)}
                    style={[
                      styles.yearChip,
                      { borderColor: isDark ? colors.border : '#D7D2C8' },
                      viewYear === yr && styles.activeYearChip,
                    ]}
                  >
                    <Text
                      style={[
                        styles.yearChipText,
                        { color: isDark ? '#FBFAF7' : '#171817' },
                        viewYear === yr && styles.activeYearChipText,
                      ]}
                    >
                      {yr}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.pickerSectionHeading, { color: isDark ? '#FFFFFF' : '#171817', marginTop: 14 }]}>
                SELECT MONTH
              </Text>
              <View style={styles.monthGrid}>
                {MONTH_SHORT.map((mStr, idx) => (
                  <TouchableOpacity
                    key={mStr}
                    onPress={() => handleJumpYearMonth(viewYear, idx)}
                    style={[
                      styles.monthGridCell,
                      { borderColor: isDark ? colors.border : '#D7D2C8' },
                      viewMonth === idx && styles.activeMonthCell,
                    ]}
                  >
                    <Text
                      style={[
                        styles.monthCellText,
                        { color: isDark ? '#FBFAF7' : '#171817' },
                        viewMonth === idx && styles.activeMonthCellText,
                      ]}
                    >
                      {mStr}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.calendarBody}>
              {/* Day of week headers */}
              <View style={styles.weekdaysRow}>
                {WEEKDAYS.map((wd, i) => (
                  <Text key={i} style={[styles.weekdayText, { color: isDark ? 'rgba(255, 255, 255, 0.5)' : '#77766F' }]}>
                    {wd}
                  </Text>
                ))}
              </View>

              {/* Day grid */}
              <View style={styles.daysGrid}>
                {/* Empty filler cells before first day of month */}
                {Array.from({ length: firstDayIndex }).map((_, i) => (
                  <View key={`empty-${i}`} style={styles.dayCellPlaceholder} />
                ))}

                {/* Actual day cells */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dayIso = toIsoString(viewYear, viewMonth, dayNum);
                  const isPast = dayIso < todayIso;
                  const isToday = dayIso === todayIso;
                  const isStart = dayIso === selectedFrom;
                  const isEnd = dayIso === selectedTo;
                  const isInRange =
                    selectedFrom &&
                    selectedTo &&
                    dayIso > selectedFrom &&
                    dayIso < selectedTo;

                  return (
                    <TouchableOpacity
                      key={`day-${dayNum}`}
                      onPress={() => handleDayPress(dayNum)}
                      disabled={isPast}
                      activeOpacity={0.7}
                      style={[
                        styles.dayCell,
                        isInRange && styles.dayCellInRange,
                        isStart && styles.dayCellStart,
                        isEnd && styles.dayCellEnd,
                      ]}
                    >
                      <View
                        style={[
                          styles.dayInnerCircle,
                          isToday && !isStart && !isEnd && styles.todayInnerCircle,
                          (isStart || isEnd) && styles.selectedDayCircle,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            { color: isDark ? '#FFFFFF' : '#171817' },
                            isPast && styles.pastDayText,
                            isToday && !isStart && !isEnd && styles.todayText,
                            (isStart || isEnd) && styles.selectedDayText,
                            isInRange && styles.inRangeDayText,
                          ]}
                        >
                          {dayNum}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Quick Preset Buttons */}
              <View style={styles.quickPresetsRow}>
                <TouchableOpacity
                  onPress={() => handleQuickPreset(3)}
                  style={[styles.presetBtn, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1EEE6' }]}
                >
                  <Text style={[styles.presetBtnText, { color: isDark ? '#FFFFFF' : '#171817' }]}>Weekend (3d)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleQuickPreset(7)}
                  style={[styles.presetBtn, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1EEE6' }]}
                >
                  <Text style={[styles.presetBtnText, { color: isDark ? '#FFFFFF' : '#171817' }]}>1 Week (7d)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleQuickPreset(14)}
                  style={[styles.presetBtn, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1EEE6' }]}
                >
                  <Text style={[styles.presetBtnText, { color: isDark ? '#FFFFFF' : '#171817' }]}>2 Weeks (14d)</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Bottom Actions Bar */}
          <View style={[styles.footerRow, { borderTopColor: isDark ? colors.border : '#E5D8C8' }]}>
            <TouchableOpacity onPress={handleClear} style={styles.clearBtn} activeOpacity={0.7}>
              <Text style={styles.clearBtnText}>Clear</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleConfirm}
              disabled={!selectedFrom}
              style={[
                styles.applyBtn,
                !selectedFrom && styles.applyBtnDisabled,
              ]}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={selectedFrom ? ['#171817', '#2A2B2A'] : ['#A0A09B', '#A0A09B']}
                style={styles.applyBtnGradient}
              >
                <Ionicons name="checkmark-sharp" size={16} color="#FBFAF7" style={{ marginRight: 6 }} />
                <Text style={styles.applyBtnText}>Apply Dates</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 32, 420);
const DAY_SIZE = Math.floor((CARD_WIDTH - 44) / 7);

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  calendarCard: {
    width: CARD_WIDTH,
    borderRadius: RADII.xxl,
    borderWidth: 1,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontFamily: FONTS.extraBold,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  closeBtn: {
    padding: 4,
  },
  rangeSummaryBanner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rangePillBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateBlock: {
    flex: 1,
  },
  dateBlockLabel: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    fontWeight: '700',
    color: '#B99A5E',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  dateBlockValue: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    fontWeight: '600',
  },
  rangeDividerLine: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  nightsBadge: {
    fontFamily: FONTS.medium,
    fontSize: 10,
    color: '#77766F',
    marginTop: 2,
  },
  monthNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chevronBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledChevron: {
    opacity: 0.25,
  },
  monthYearSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADII.full,
  },
  monthYearText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  calendarBody: {
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  weekdaysRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekdayText: {
    width: DAY_SIZE,
    textAlign: 'center',
    fontFamily: FONTS.bold,
    fontSize: 12,
    fontWeight: '700',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCellPlaceholder: {
    width: DAY_SIZE,
    height: DAY_SIZE,
  },
  dayCell: {
    width: DAY_SIZE,
    height: DAY_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  dayCellStart: {
    backgroundColor: '#E6D5AF',
    borderTopLeftRadius: DAY_SIZE / 2,
    borderBottomLeftRadius: DAY_SIZE / 2,
  },
  dayCellEnd: {
    backgroundColor: '#E6D5AF',
    borderTopRightRadius: DAY_SIZE / 2,
    borderBottomRightRadius: DAY_SIZE / 2,
  },
  dayCellInRange: {
    backgroundColor: 'rgba(230, 213, 175, 0.45)',
  },
  dayInnerCircle: {
    width: DAY_SIZE - 4,
    height: DAY_SIZE - 4,
    borderRadius: (DAY_SIZE - 4) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayInnerCircle: {
    borderWidth: 1.5,
    borderColor: '#B99A5E',
  },
  selectedDayCircle: {
    backgroundColor: '#171817',
  },
  dayText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    fontWeight: '500',
  },
  pastDayText: {
    color: '#B5B3AC',
    opacity: 0.4,
  },
  todayText: {
    color: '#B99A5E',
    fontWeight: '700',
  },
  selectedDayText: {
    color: '#FBFAF7',
    fontWeight: '800',
  },
  inRangeDayText: {
    color: '#171817',
    fontWeight: '700',
  },
  quickPresetsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    marginBottom: 4,
  },
  presetBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: RADII.full,
  },
  presetBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    fontWeight: '600',
  },
  yearMonthGridContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pickerSectionHeading: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  yearScroll: {
    gap: 8,
    paddingBottom: 4,
  },
  yearChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: RADII.full,
    borderWidth: 1,
  },
  activeYearChip: {
    backgroundColor: '#171817',
    borderColor: '#171817',
  },
  yearChipText: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    fontWeight: '600',
  },
  activeYearChipText: {
    color: '#FBFAF7',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthGridCell: {
    width: (CARD_WIDTH - 64) / 3,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADII.md,
    borderWidth: 1,
  },
  activeMonthCell: {
    backgroundColor: '#171817',
    borderColor: '#171817',
  },
  monthCellText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    fontWeight: '700',
  },
  activeMonthCellText: {
    color: '#FBFAF7',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  clearBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  clearBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    fontWeight: '600',
    color: '#77766F',
  },
  applyBtn: {
    borderRadius: RADII.full,
    overflow: 'hidden',
    ...SHADOWS.soft,
  },
  applyBtnDisabled: {
    opacity: 0.5,
  },
  applyBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  applyBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    fontWeight: '700',
    color: '#FBFAF7',
    letterSpacing: -0.2,
  },
});
