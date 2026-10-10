// ============================================================================
// WebCameraView — Real WebRTC Webcam Viewfinder for Web & Laptop Browsers
// Accesses camera via navigator.mediaDevices.getUserMedia()
// Renders live video stream, face alignment guide, and canvas snapshot capture.
// Handles permission denied, missing camera, insecure context, and busy device states.
// Stops all camera tracks on unmount / close.
// ============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, RADII, SHADOWS, FONTS } from '../lib/theme';

export default function WebCameraView({
  onCapture,
  onClose,
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [isLoading, setIsLoading] = useState(true);
  const [errorType, setErrorType] = useState(null); // 'permission_denied' | 'not_found' | 'in_use' | 'insecure' | 'unsupported' | 'generic'
  const [errorMessage, setErrorMessage] = useState('');
  const [facingMode, setFacingMode] = useState('user'); // 'user' | 'environment'
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  // Stop all active tracks on the media stream
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      try {
        const tracks = streamRef.current.getTracks();
        tracks.forEach((track) => {
          track.stop();
        });
      } catch (err) {
        console.warn('[WebCamera] Error stopping media tracks:', err);
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Check if multiple camera devices exist
  const checkCameraDevices = useCallback(async () => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setHasMultipleCameras(videoInputs.length > 1);
      } catch {
        // Non-blocking
      }
    }
  }, []);

  // Request camera access and mount to video element
  const startCamera = useCallback(async (preferredFacing = 'user') => {
    setIsLoading(true);
    setErrorType(null);
    setErrorMessage('');
    stopStream();

    // 1. Insecure Context Check
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      setErrorType('insecure');
      setErrorMessage(
        'Camera access requires a secure connection (HTTPS or localhost). Please access MaybeWe via HTTPS or localhost.'
      );
      setIsLoading(false);
      return;
    }

    // 2. Browser MediaDevices Support Check
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== 'function'
    ) {
      setErrorType('unsupported');
      setErrorMessage(
        'Your browser does not support live camera streaming. Please open this page in Chrome, Safari, Firefox, or Edge.'
      );
      setIsLoading(false);
      return;
    }

    // 3. Request UserMedia stream with front camera preferences
    try {
      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: preferredFacing,
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
          },
          audio: false,
        });
      } catch (constraintErr) {
        // Fallback to basic video constraint if ideal resolution or facingMode fails
        console.log('[WebCamera] Specific constraints failed, falling back to basic video:', constraintErr);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn('[WebCamera] Video play error:', playErr);
        }
      }

      setIsLoading(false);
      checkCameraDevices();
    } catch (err) {
      console.warn('[WebCamera] getUserMedia error:', err?.name, err?.message);
      setIsLoading(false);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorType('permission_denied');
        setErrorMessage(
          'Camera access was denied by your browser. Please click the camera/lock icon in your browser address bar to allow camera access, then click "Try Again".'
        );
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorType('not_found');
        setErrorMessage(
          'No camera was found on your device. Please ensure your webcam is connected or enabled in system settings.'
        );
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setErrorType('in_use');
        setErrorMessage(
          'Your camera is currently in use by another application or browser tab (e.g. Zoom, Meet, FaceTime). Please close other apps and try again.'
        );
      } else {
        setErrorType('generic');
        setErrorMessage(
          err.message || 'Unable to access your camera. Please check your browser permissions and try again.'
        );
      }
    }
  }, [stopStream, checkCameraDevices]);

  // Start camera on mount, stop on unmount
  useEffect(() => {
    startCamera(facingMode);
    return () => {
      stopStream();
    };
  }, [startCamera, facingMode, stopStream]);

  // Flip camera between front and back
  const handleToggleFacing = () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);
  };

  // Capture frame from video to canvas
  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      console.warn('[WebCamera] Video frame not ready for capture');
      return;
    }

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Canvas 2D context unavailable');
      }

      // Mirror horizontally for front-facing camera to match what the user sees
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

      // Stop camera stream immediately
      stopStream();

      // Pass captured image URI to parent
      if (onCapture) {
        onCapture(dataUrl);
      }
    } catch (err) {
      console.error('[WebCamera] Error capturing photo from video stream:', err);
    }
  };

  // Fallback to file picker if camera is unavailable or user chooses
  const handlePickFile = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        stopStream();
        if (onCapture) {
          onCapture(result.assets[0].uri);
        }
      }
    } catch (err) {
      console.warn('[WebCamera] File picker fallback error:', err);
    }
  };

  const handleClose = () => {
    stopStream();
    if (onClose) {
      onClose();
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. Camera Viewfinder Header */}
      <View style={styles.headerRow}>
        <View style={styles.liveIndicator}>
          <View style={[styles.liveDot, errorType && styles.liveDotError]} />
          <Text style={styles.liveText}>
            {errorType ? 'CAMERA OFFLINE' : 'WEBCAM ACTIVE'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleClose}
          style={styles.closeBtn}
          activeOpacity={0.8}
          accessibilityLabel="Close Camera"
        >
          <Ionicons name="close" size={20} color="#FBFAF7" />
        </TouchableOpacity>
      </View>

      {/* 2. Video Preview / Error Area */}
      <View style={styles.viewfinderFrame}>
        {/* HTML5 Video Element */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
            backgroundColor: '#0F172A',
            display: errorType ? 'none' : 'block',
          }}
        />

        {/* Loading Spinner */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#B99A5E" />
            <Text style={styles.loadingText}>Starting your camera...</Text>
          </View>
        )}

        {/* Face Oval Framing Guide (Only visible when video is live) */}
        {!isLoading && !errorType && (
          <View style={styles.guideOverlay} pointerEvents="none">
            <View style={styles.faceOval} />
            <Text style={styles.guideText}>Center your face within the frame</Text>
          </View>
        )}

        {/* Error State Banner */}
        {errorType && (
          <View style={styles.errorOverlay}>
            <View style={styles.errorIconWrap}>
              <Ionicons
                name={
                  errorType === 'permission_denied'
                    ? 'videocam-off-outline'
                    : errorType === 'not_found'
                    ? 'hardware-chip-outline'
                    : errorType === 'in_use'
                    ? 'warning-outline'
                    : 'alert-circle-outline'
                }
                size={36}
                color="#EF4444"
              />
            </View>
            <Text style={styles.errorTitle}>
              {errorType === 'permission_denied'
                ? 'Camera Permission Denied'
                : errorType === 'not_found'
                ? 'No Camera Detected'
                : errorType === 'in_use'
                ? 'Camera Busy / In Use'
                : errorType === 'insecure'
                ? 'Secure Connection Required'
                : 'Camera Unavailable'}
            </Text>
            <Text style={styles.errorDescription}>{errorMessage}</Text>

            <View style={styles.errorActionsRow}>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => startCamera(facingMode)}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh" size={16} color="#FBFAF7" style={{ marginRight: 6 }} />
                <Text style={styles.retryBtnText}>Try Again</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.uploadFallbackBtn}
                onPress={handlePickFile}
                activeOpacity={0.8}
              >
                <Ionicons name="image-outline" size={16} color="#B99A5E" style={{ marginRight: 6 }} />
                <Text style={styles.uploadFallbackText}>Upload Photo</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* 3. Bottom Controls */}
      <View style={styles.controlsBar}>
        {hasMultipleCameras && !errorType ? (
          <TouchableOpacity
            style={styles.auxBtn}
            onPress={handleToggleFacing}
            activeOpacity={0.8}
            accessibilityLabel="Switch Camera"
          >
            <Ionicons name="camera-reverse-outline" size={22} color="#FBFAF7" />
          </TouchableOpacity>
        ) : (
          <View style={styles.auxPlaceholder} />
        )}

        {/* Main Capture Shutter Button */}
        {!errorType && (
          <TouchableOpacity
            style={[styles.shutterBtn, isLoading && styles.shutterBtnDisabled]}
            onPress={handleCapture}
            disabled={isLoading}
            activeOpacity={0.85}
            accessibilityLabel="Capture Selfie Photo"
          >
            <View style={styles.shutterInnerRing}>
              <Ionicons name="camera" size={24} color="#171817" />
            </View>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.auxBtn}
          onPress={handlePickFile}
          activeOpacity={0.8}
          accessibilityLabel="Select from Photos"
        >
          <Ionicons name="images-outline" size={20} color="#FBFAF7" />
        </TouchableOpacity>
      </View>

      {/* Secondary file upload hint */}
      {!errorType && (
        <TouchableOpacity
          onPress={handlePickFile}
          style={styles.fallbackHintBtn}
          activeOpacity={0.8}
        >
          <Text style={styles.fallbackHintText}>Or select a clear photo from your device</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#171817',
    borderRadius: RADII.xl,
    overflow: 'hidden',
    padding: 16,
    borderWidth: 1,
    borderColor: '#333633',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  liveDotError: {
    backgroundColor: '#EF4444',
  },
  liveText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#8E928E',
    fontFamily: FONTS.semiBold,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewfinderFrame: {
    width: '100%',
    height: 360,
    borderRadius: RADII.lg,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#FBFAF7',
    fontSize: 13,
    fontFamily: FONTS.medium,
  },
  guideOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  faceOval: {
    width: 190,
    height: 250,
    borderRadius: 95,
    borderWidth: 2,
    borderColor: 'rgba(200, 178, 122, 0.75)',
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
    boxShadow: '0 0 20px rgba(200, 178, 122, 0.2)',
  },
  guideText: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: '600',
    color: '#FBFAF7',
    backgroundColor: 'rgba(23, 24, 23, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontFamily: FONTS.medium,
  },
  errorOverlay: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 380,
  },
  errorIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FBFAF7',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: FONTS.bold,
  },
  errorDescription: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    fontFamily: FONTS.regular,
  },
  errorActionsRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADII.md,
  },
  retryBtnText: {
    color: '#FBFAF7',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: FONTS.semiBold,
  },
  uploadFallbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(185, 154, 94, 0.15)',
    borderColor: 'rgba(185, 154, 94, 0.4)',
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADII.md,
  },
  uploadFallbackText: {
    color: '#B99A5E',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: FONTS.semiBold,
  },
  controlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  auxBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  auxPlaceholder: {
    width: 44,
    height: 44,
  },
  shutterBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FBFAF7',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
  },
  shutterBtnDisabled: {
    opacity: 0.5,
  },
  shutterInnerRing: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: '#171817',
    backgroundColor: '#B99A5E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackHintBtn: {
    alignItems: 'center',
    marginTop: 12,
  },
  fallbackHintText: {
    fontSize: 12,
    color: '#8E928E',
    fontFamily: FONTS.medium,
    textDecorationLine: 'underline',
  },
});
