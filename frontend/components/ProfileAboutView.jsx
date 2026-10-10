import React from "react";
import { View, Text, StyleSheet, Image, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FONTS, SHADOWS } from "../lib/theme";

const GOA_IMAGE = require("../assets/images/dest_goa.jpg");
const LADAKH_IMAGE = require("../assets/images/dest_ladakh.jpg");
const KERALA_IMAGE = require("../assets/images/dest_kerala.jpg");
const HAMPI_IMAGE = require("../assets/images/journal_hampi.jpg");

const JOURNAL_ENTRIES = [
  {
    id: "journal-1",
    destination: "Hampi, Karnataka",
    date: "March 2026",
    image: HAMPI_IMAGE,
    caption: "Golden boulders and ancient ruins at sunset. The Virupaksha temple bells echoed across the Tungabhadra as the sky turned amber.",
    tag: "Heritage & Ruins",
  },
  {
    id: "journal-2",
    destination: "Ladakh",
    date: "August 2025",
    image: LADAKH_IMAGE,
    caption: "Pangong Lake at dawn — impossibly blue, impossibly still. Monastery bells in the distance. The highest silence I have ever heard.",
    tag: "High Altitude & Stillness",
  },
  {
    id: "journal-3",
    destination: "Goa",
    date: "January 2025",
    image: GOA_IMAGE,
    caption: "Assagao mornings: filter coffee, feni, and the sound of the sea two lanes away. Found the best thali in a grandmother's courtyard.",
    tag: "Coastal Wandering",
  },
  {
    id: "journal-4",
    destination: "Kerala",
    date: "November 2024",
    image: KERALA_IMAGE,
    caption: "Backwater houseboat in Alleppey at golden hour. The silence of the lagoon, broken only by a cormorant diving into the water.",
    tag: "Backwaters & Gold",
  },
];

const TRAVEL_STYLES = ["Culture", "Photography", "Food", "Nature", "Solo Wandering", "Architecture"];
const LANGUAGES = ["English (Fluent)", "Telugu (Fluent)", "Hindi (Conversational)"];
const INTERESTS = ["Travel Photography", "Local Chai Stops", "Heritage Architecture", "Hill Station Trails", "Sunset Watching"];
const FAVORITE_DESTINATIONS = ["Kashmir", "Ladakh", "Kerala", "Goa"];

export default function ProfileAboutView({ bio, colors }) {
  return (
    <View style={styles.container}>
      {/* 1. About Box with subtle quotes styling */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionEyebrow}>ABOUT ME</Text>
        <Ionicons name="sparkles" size={14} color="#C5A880" />
      </View>

      <View style={styles.aboutBoxCard}>
        <View style={styles.quoteDecor}>
          <Text style={styles.quoteMark}>“</Text>
        </View>
        <Text style={styles.bioText}>
          {bio ||
            "Visual designer & coffee enthusiast wandering through architecture, quiet bookshops, and coastal hiking trails."}
        </Text>
      </View>

      {/* 2. Tag Pills: Luxury Linen Tags */}
      <View style={styles.subCategoryBlock}>
        <Text style={styles.subCategoryLabel}>TRAVEL STYLES</Text>
        <View style={styles.chipCloud}>
          {TRAVEL_STYLES.map((style) => (
            <View key={style} style={styles.linenTag}>
              <Ionicons name="sparkles" size={11} color="#C5A880" style={{ marginRight: 6 }} />
              <Text style={styles.linenTagText}>{style}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.subCategoryBlock}>
        <Text style={styles.subCategoryLabel}>LANGUAGES SPOKEN</Text>
        <View style={styles.chipCloud}>
          {LANGUAGES.map((lang) => (
            <View key={lang} style={styles.linenTag}>
              <Ionicons name="globe-outline" size={12} color="#C5A880" style={{ marginRight: 6 }} />
              <Text style={styles.linenTagText}>{lang}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.subCategoryBlock}>
        <Text style={styles.subCategoryLabel}>INTERESTS & RHYTHMS</Text>
        <View style={styles.chipCloud}>
          {INTERESTS.map((interest) => (
            <View key={interest} style={styles.linenTag}>
              <Ionicons name="compass-outline" size={12} color="#C5A880" style={{ marginRight: 6 }} />
              <Text style={styles.linenTagText}>{interest}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.subCategoryBlock}>
        <Text style={styles.subCategoryLabel}>FAVORITE DESTINATIONS</Text>
        <View style={styles.chipCloud}>
          {FAVORITE_DESTINATIONS.map((dest) => (
            <View key={dest} style={styles.linenTag}>
              <Ionicons name="pin-outline" size={12} color="#C5A880" style={{ marginRight: 6 }} />
              <Text style={styles.linenTagText}>{dest}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 3. Memorable Journals: Editorial Polaroid Layout */}
      <View style={[styles.sectionHeaderRow, { marginTop: 28 }]}>
        <Text style={styles.sectionEyebrow}>MEMORABLE JOURNALS</Text>
        <Ionicons name="images-outline" size={14} color="#C5A880" />
      </View>

      <View style={styles.journalList}>
        {JOURNAL_ENTRIES.map((entry) => (
          <View key={entry.id} style={styles.polaroidCard}>
            <View style={styles.polaroidImageWrap}>
              <Image source={entry.image} style={styles.polaroidImage} resizeMode="cover" />
              <View style={styles.goldDatePill}>
                <Text style={styles.goldDateText}>{entry.date}</Text>
              </View>
            </View>
            <View style={styles.polaroidCaptionWrap}>
              <View style={styles.polaroidHeaderRow}>
                <Text style={styles.polaroidDestination}>{entry.destination}</Text>
                <View style={styles.polaroidTag}>
                  <Text style={styles.polaroidTagText}>{entry.tag}</Text>
                </View>
              </View>
              <Text style={styles.polaroidCaption}>{entry.caption}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionEyebrow: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    letterSpacing: 1.8,
    color: "#7D756D",
    textTransform: "uppercase",
  },
  aboutBoxCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: "rgba(197, 168, 128, 0.28)",
    shadowColor: "#1C1917",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
    marginBottom: 20,
    position: "relative",
  },
  quoteDecor: {
    position: "absolute",
    top: 6,
    right: 18,
    opacity: 0.12,
  },
  quoteMark: {
    fontSize: 48,
    fontFamily: FONTS.extraBold,
    color: "#1C1917",
  },
  bioText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 22,
    color: "#1E1B18",
  },
  subCategoryBlock: {
    marginBottom: 18,
  },
  subCategoryLabel: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    color: "#7D756D",
    textTransform: "uppercase",
    marginBottom: 10,
  },
  chipCloud: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  linenTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4EFEB",
    borderWidth: 1,
    borderColor: "rgba(197, 168, 128, 0.28)",
    borderRadius: 9999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  linenTagText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: "#1E1B18",
  },
  journalList: {
    gap: 18,
  },
  polaroidCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(197, 168, 128, 0.28)",
    shadowColor: "#1C1917",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
    overflow: "hidden",
    padding: 12,
  },
  polaroidImageWrap: {
    width: "100%",
    height: 200,
    borderRadius: 18,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#F4EFEB",
  },
  polaroidImage: {
    width: "100%",
    height: "100%",
  },
  goldDatePill: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(28, 25, 23, 0.75)",
    borderWidth: 1,
    borderColor: "rgba(197, 168, 128, 0.60)",
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  goldDateText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: "#D4AF37",
    letterSpacing: 0.8,
  },
  polaroidCaptionWrap: {
    paddingHorizontal: 6,
    paddingTop: 12,
    paddingBottom: 4,
  },
  polaroidHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  polaroidDestination: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: "#1E1B18",
  },
  polaroidTag: {
    backgroundColor: "#F4EFEB",
    borderWidth: 1,
    borderColor: "rgba(197, 168, 128, 0.28)",
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  polaroidTagText: {
    fontFamily: FONTS.medium,
    fontSize: 10,
    color: "#7D756D",
  },
  polaroidCaption: {
    fontFamily: FONTS.regular,
    fontStyle: "italic",
    fontSize: 13,
    color: "#4A443E",
    lineHeight: 20,
  },
});
