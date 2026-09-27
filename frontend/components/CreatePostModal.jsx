import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../lib/themeContext.jsx';
import { COLORS, RADII, SHADOWS, FONTS } from '../lib/theme.js';
import { createPost } from '../lib/posts.js';
import { getAllPlaces } from '../lib/places.js';

const { width: SCREEN_W } = Dimensions.get('window');

// Luxury Indian travel photography presets
const PHOTO_PRESETS = [
  'https://images.unsplash.com/photo-1600100397608-f010f4439c04?w=1000&auto=format&fit=crop&q=80', // Hampi
  'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=1000&auto=format&fit=crop&q=80', // Goa
  'https://images.unsplash.com/photo-1603262110263-fb010d6e59d4?w=1000&auto=format&fit=crop&q=80', // Jaipur
  'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=1000&auto=format&fit=crop&q=80', // Udaipur
  'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=1000&auto=format&fit=crop&q=80', // Kerala
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1000&auto=format&fit=crop&q=80', // Kashmir
];

const DESTINATIONS = ['Goa', 'Jaipur', 'Udaipur', 'Kashmir', 'Kerala', 'Ladakh', 'Hampi', 'Manali', 'Varanasi'];

export default function CreatePostModal({
  visible,
  onClose,
  onPostCreated,
  currentUser = null,
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [caption, setCaption] = useState('');
  const [destination, setDestination] = useState('Goa');
  const [selectedPlaceId, setSelectedPlaceId] = useState(null);
  const [selectedPhotos, setSelectedPhotos] = useState([PHOTO_PRESETS[0]]);
  const [customPhotoUrl, setCustomPhotoUrl] = useState('');
  const [showAddUrlInput, setShowAddUrlInput] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const places = getAllPlaces();
  const filteredPlaces = places.filter(
    (p) => (p.destination || '').toLowerCase() === destination.toLowerCase()
  );

  const togglePresetPhoto = (url) => {
    if (selectedPhotos.includes(url)) {
      if (selectedPhotos.length > 1) {
        setSelectedPhotos(selectedPhotos.filter((u) => u !== url));
      }
    } else {
      setSelectedPhotos([...selectedPhotos, url]);
    }
  };

  const handleAddCustomPhoto = () => {
    if (customPhotoUrl && customPhotoUrl.startsWith('http')) {
      setSelectedPhotos([...selectedPhotos, customPhotoUrl.trim()]);
      setCustomPhotoUrl('');
      setShowAddUrlInput(false);
    }
  };

  const handlePublish = async () => {
    if (!caption.trim()) {
      setErrorMsg('Please write a caption or travel story.');
      return;
    }
    if (selectedPhotos.length === 0) {
      setErrorMsg('Please select at least one photo.');
      return;
    }

    setErrorMsg('');
    setSubmitting(true);

    try {
      const newPost = await createPost({
        userId: currentUser?.id || 'current-user',
        userName: currentUser?.name || 'Priya Sharma',
        userAvatar: currentUser?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
        userLocation: currentUser?.city || destination,
        content: caption,
        destination,
        placeId: selectedPlaceId,
        mediaUrls: selectedPhotos,
        visibility: 'public',
      });

      if (onPostCreated) onPostCreated(newPost);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Could not publish post.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: colors.background, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
          {/* Header */}
          <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={styles.eyebrow}>EDITORIAL TRAVEL STORIES</Text>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Share a Travel Story</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.cardBackground }]}>
              <Ionicons name="close" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {errorMsg ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#9E3A3A" style={{ marginRight: 6 }} />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Photo Selection Preview Carousel */}
            <View style={styles.sectionBlock}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
                Selected Travel Photos ({selectedPhotos.length})
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectedPhotosRow}>
                {selectedPhotos.map((url, index) => (
                  <View key={url + index} style={styles.selectedPhotoWrapper}>
                    <Image source={{ uri: url }} style={styles.selectedPhotoThumb} />
                    <TouchableOpacity
                      onPress={() => setSelectedPhotos(selectedPhotos.filter((_, i) => i !== index))}
                      style={styles.removePhotoBadge}
                    >
                      <Ionicons name="close" size={12} color="#FAF8F3" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>

            {/* Presets Gallery */}
            <View style={styles.sectionBlock}>
              <View style={styles.labelRow}>
                <Text style={[styles.subLabel, { color: colors.textSecondary }]}>Add from Photography Library</Text>
                <TouchableOpacity onPress={() => setShowAddUrlInput(!showAddUrlInput)}>
                  <Text style={styles.addUrlText}>{showAddUrlInput ? 'Cancel' : '+ Photo URL'}</Text>
                </TouchableOpacity>
              </View>

              {showAddUrlInput && (
                <View style={styles.addUrlBox}>
                  <TextInput
                    style={[styles.urlInput, { color: colors.textPrimary, borderColor: colors.border }]}
                    placeholder="https://images.unsplash.com/..."
                    placeholderTextColor={colors.textSecondary}
                    value={customPhotoUrl}
                    onChangeText={setCustomPhotoUrl}
                  />
                  <TouchableOpacity onPress={handleAddCustomPhoto} style={styles.addUrlBtn}>
                    <Text style={styles.addUrlBtnText}>Add</Text>
                  </TouchableOpacity>
                </View>
              )}

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsRow}>
                {PHOTO_PRESETS.map((url, i) => {
                  const isChosen = selectedPhotos.includes(url);
                  return (
                    <TouchableOpacity
                      key={url}
                      onPress={() => togglePresetPhoto(url)}
                      style={[styles.presetCard, isChosen && styles.presetCardChosen]}
                    >
                      <Image source={{ uri: url }} style={styles.presetImage} />
                      {isChosen && (
                        <View style={styles.presetChecked}>
                          <Ionicons name="checkmark" size={14} color="#FAF8F3" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Caption / Story */}
            <View style={styles.fieldSection}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Travel Story / Caption *</Text>
              <TextInput
                style={[styles.captionArea, { backgroundColor: colors.cardBackground, color: colors.textPrimary, borderColor: colors.border }]}
                placeholder="What made this moment unforgettable? The light, the sound of the wind, the quiet chai stop..."
                placeholderTextColor={colors.textSecondary}
                value={caption}
                onChangeText={(t) => { setCaption(t); setErrorMsg(''); }}
                multiline
                numberOfLines={4}
              />
            </View>

            {/* Destination Selection */}
            <View style={styles.fieldSection}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Destination</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                {DESTINATIONS.map((d) => {
                  const isSelected = destination === d;
                  return (
                    <TouchableOpacity
                      key={d}
                      onPress={() => { setDestination(d); setSelectedPlaceId(null); }}
                      style={[
                        styles.chip,
                        { backgroundColor: colors.cardBackground, borderColor: colors.border },
                        isSelected && styles.chipActive,
                      ]}
                    >
                      <Ionicons name="location" size={12} color={isSelected ? '#FAF8F3' : '#B99A5E'} style={{ marginRight: 4 }} />
                      <Text style={[styles.chipText, { color: colors.textPrimary }, isSelected && styles.chipTextActive]}>
                        {d}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Tag Place from Destination */}
            {filteredPlaces.length > 0 && (
              <View style={styles.fieldSection}>
                <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Tag Place (Optional)</Text>
                <Text style={styles.fieldSub}>Attaches a place card allowing others to View Place & Add to Trip</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                  {filteredPlaces.map((p) => {
                    const isSelected = selectedPlaceId === p.id;
                    return (
                      <TouchableOpacity
                        key={p.id}
                        onPress={() => setSelectedPlaceId(isSelected ? null : p.id)}
                        style={[
                          styles.placeChip,
                          { backgroundColor: colors.cardBackground, borderColor: colors.border },
                          isSelected && styles.placeChipActive,
                        ]}
                      >
                        <Text style={[styles.placeChipName, { color: colors.textPrimary }, isSelected && styles.placeChipNameActive]} numberOfLines={1}>
                          {p.name}
                        </Text>
                        <Text style={styles.placeChipCategory}>• {p.category}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <View style={{ height: 32 }} />
          </ScrollView>

          {/* Bottom Action */}
          <View style={[styles.footerBar, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              onPress={handlePublish}
              disabled={submitting}
              style={[styles.publishBtn, submitting && { opacity: 0.7 }]}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FAF8F3" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={17} color="#B99A5E" style={{ marginRight: 8 }} />
                  <Text style={styles.publishBtnText}>Publish Story</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(23, 23, 22, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '94%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  eyebrow: {
    fontFamily: FONTS.medium,
    fontSize: 10,
    letterSpacing: 1.5,
    color: '#B99A5E',
    marginBottom: 4,
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(158, 58, 58, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: '#9E3A3A',
  },
  sectionBlock: {
    marginBottom: 20,
  },
  fieldSection: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    marginBottom: 8,
  },
  fieldSub: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#8C8983',
    marginBottom: 8,
  },
  selectedPhotosRow: {
    gap: 12,
    paddingVertical: 4,
  },
  selectedPhotoWrapper: {
    position: 'relative',
  },
  selectedPhotoThumb: {
    width: 100,
    height: 120,
    borderRadius: 14,
  },
  removePhotoBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(23, 23, 22, 0.75)',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subLabel: {
    fontFamily: FONTS.medium,
    fontSize: 12,
  },
  addUrlText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: '#B99A5E',
  },
  addUrlBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  urlInput: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontFamily: FONTS.regular,
    fontSize: 12,
  },
  addUrlBtn: {
    backgroundColor: '#171716',
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addUrlBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: '#FAF8F3',
  },
  presetsRow: {
    gap: 10,
  },
  presetCard: {
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  presetCardChosen: {
    borderWidth: 2,
    borderColor: '#B99A5E',
  },
  presetImage: {
    width: '100%',
    height: '100%',
  },
  presetChecked: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#171716',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captionArea: {
    minHeight: 90,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: 'top',
  },
  chipsRow: {
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: '#171716',
    borderColor: '#B99A5E',
  },
  chipText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
  },
  chipTextActive: {
    color: '#FAF8F3',
    fontFamily: FONTS.semiBold,
  },
  placeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    maxWidth: 200,
  },
  placeChipActive: {
    backgroundColor: '#171716',
    borderColor: '#B99A5E',
  },
  placeChipName: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
  },
  placeChipNameActive: {
    color: '#FAF8F3',
  },
  placeChipCategory: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: '#8C8983',
    marginLeft: 4,
  },
  footerBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  publishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#171716',
    height: 52,
    borderRadius: 16,
  },
  publishBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: '#FAF8F3',
  },
});
