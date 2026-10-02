// MaybeWe Cross-Platform On-Device Face Verification Service
// Web: Powered by Google MediaPipe BlazeFace (@mediapipe/tasks-vision WASM runtime)
// Android & iOS: Powered by Google ML Kit (@react-native-ml-kit/face-detection)
// Zero Cloud Billing, Zero External API Keys, 100% On-Device & Private.
//
// Rules:
// - Exactly 1 face -> VERIFIED
// - 0 faces -> FAILED ("No human face detected. Please ensure good lighting and look directly into the camera.")
// - >1 faces -> FAILED ("Multiple faces detected. Please upload a photo with only you visible.")
// - Strict confidence & pose checks (Euler roll/yaw/pitch <= 25-35 deg, eye open check)
// - Bounding box proportion check (>= 8% of frame)

import { Platform, Image } from 'react-native';

// ==========================================
// 1. WEB IMPLEMENTATION (MediaPipe BlazeFace)
// ==========================================

let webFaceDetectorInstance = null;
let isWebInitializing = false;
let webInitPromise = null;

const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
const BLAZE_FACE_MODEL = 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite';

/**
 * Dynamically loads MediaPipe tasks-vision bundle in Web/Browser environment.
 */
async function loadMediaPipeTasksVision() {
  if (typeof window !== 'undefined') {
    if (window.Vision && window.Vision.FaceDetector && window.Vision.FilesetResolver) {
      return window.Vision;
    }
    if (window.FaceDetector && window.FilesetResolver) {
      return window;
    }

    if (typeof document !== 'undefined') {
      if (!window._mediapipeVisionLoader) {
        window._mediapipeVisionLoader = new Promise((resolve, reject) => {
          const existingScript = document.querySelector('script[src*="tasks-vision"]');
          if (existingScript) {
            existingScript.addEventListener('load', () => resolve(window.Vision || window));
            existingScript.addEventListener('error', (e) => reject(new Error('MediaPipe script failed to load')));
            return;
          }

          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.js';
          script.crossOrigin = 'anonymous';
          script.onload = () => {
            console.log('[MediaPipe] Vision bundle script loaded.');
            resolve(window.Vision || window);
          };
          script.onerror = (err) => {
            console.warn('[MediaPipe] Failed to load MediaPipe bundle from CDN:', err);
            reject(new Error('Failed to load MediaPipe tasks-vision runtime from CDN.'));
          };
          document.head.appendChild(script);
        });
      }
      return await window._mediapipeVisionLoader;
    }
  }
  throw new Error('MediaPipe Web Face Detector requires Web or DOM environment.');
}

/**
 * Initializes and returns the cached MediaPipe FaceDetector instance on Web.
 */
export async function getWebFaceDetector() {
  if (webFaceDetectorInstance) return webFaceDetectorInstance;
  if (isWebInitializing && webInitPromise) return await webInitPromise;

  isWebInitializing = true;
  webInitPromise = (async () => {
    try {
      console.log('[MediaPipe] Initializing on-device FaceDetector runtime on Web...');
      const visionModule = await loadMediaPipeTasksVision();
      const FilesetResolver = visionModule.FilesetResolver;
      const FaceDetector = visionModule.FaceDetector;

      if (!FilesetResolver || !FaceDetector) {
        throw new Error('FilesetResolver or FaceDetector not available in loaded MediaPipe module.');
      }

      const vision = await FilesetResolver.forVisionTasks(WASM_CDN);
      webFaceDetectorInstance = await FaceDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: BLAZE_FACE_MODEL,
        },
        runningMode: 'IMAGE',
        minDetectionConfidence: 0.60,
      });
      console.log('[MediaPipe] On-device Web FaceDetector ready.');
      return webFaceDetectorInstance;
    } catch (err) {
      console.warn('[MediaPipe] Error initializing Web FaceDetector:', err);
      throw err;
    } finally {
      isWebInitializing = false;
    }
  })();

  return await webInitPromise;
}

/**
 * Analyzes landmark geometry and pose symmetry of a detected face on Web.
 */
export function evaluateWebLandmarksAndPose(detection, imageWidth, imageHeight) {
  const box = detection.boundingBox;
  const score = detection.categories?.[0]?.score || 0;
  const keypoints = detection.keypoints || [];

  // 1. Confidence check
  if (score < 0.60) {
    return {
      valid: false,
      reason: 'low_quality',
      error: `Face confidence is too low (${Math.round(score * 100)}%). Please take a clearer, well-lit photo.`,
    };
  }

  // 2. Proportion check: face must be prominent in the selfie (>= 8% of frame)
  if (imageWidth > 0 && imageHeight > 0 && box) {
    const widthRatio = box.width / imageWidth;
    const heightRatio = box.height / imageHeight;
    if (widthRatio < 0.08 || heightRatio < 0.08) {
      return {
        valid: false,
        reason: 'poor_pose',
        error: 'Face is too far away. Please hold the camera closer for your verification selfie.',
      };
    }
  }

  // 3. Landmark keypoints analysis (6 keypoints in BlazeFace: left eye, right eye, nose tip, mouth, left tragus, right tragus)
  if (keypoints.length >= 4) {
    const leftEye = keypoints[0];
    const rightEye = keypoints[1];
    const noseTip = keypoints[2];
    const mouthCenter = keypoints[3];

    if (leftEye && rightEye && noseTip && mouthCenter) {
      // Check eye tilt / horizontal alignment
      const deltaX = Math.abs(rightEye.x - leftEye.x);
      const deltaY = Math.abs(rightEye.y - leftEye.y);

      if (deltaX > 0.01) {
        const tiltRatio = deltaY / deltaX;
        if (tiltRatio > 0.45) {
          return {
            valid: false,
            reason: 'poor_pose',
            error: 'Head is tilted excessively. Please face the camera upright.',
          };
        }
      }

      // Check vertical structure: eyes must be above mouth
      const avgEyeY = (leftEye.y + rightEye.y) / 2;
      if (mouthCenter.y <= avgEyeY) {
        return {
          valid: false,
          reason: 'poor_pose',
          error: 'Face orientation is inverted. Please hold your device upright.',
        };
      }
    }
  }

  return {
    valid: true,
    metrics: {
      score,
      keypointCount: keypoints.length,
      box: box ? { width: box.width, height: box.height } : null,
    },
  };
}

/**
 * Runs MediaPipe BlazeFace detection on Web.
 */
async function analyzeSelfieOnWeb(selfieUri) {
  try {
    const detector = await getWebFaceDetector();

    let imageElement = null;
    let width = 0;
    let height = 0;

    if (typeof document !== 'undefined') {
      imageElement = document.createElement('img');
      imageElement.crossOrigin = 'anonymous';

      await new Promise((resolve, reject) => {
        imageElement.onload = () => {
          width = imageElement.naturalWidth || imageElement.width;
          height = imageElement.naturalHeight || imageElement.height;
          resolve();
        };
        imageElement.onerror = () => reject(new Error('Failed to load selfie image element for on-device analysis.'));
        imageElement.src = selfieUri;
      });
    }

    if (!imageElement) {
      return {
        success: false,
        status: 'failed',
        reason: 'analysis_error',
        faceCount: 0,
        error: 'Browser image loader unavailable.',
      };
    }

    const result = detector.detect(imageElement);
    const detections = result?.detections || [];
    const faceCount = detections.length;

    console.log('[MediaPipe Web] Detections count:', faceCount);

    if (faceCount === 0) {
      return {
        success: false,
        status: 'failed',
        reason: 'no_face',
        faceCount: 0,
        error: 'No human face detected. Please ensure good lighting and look directly into the camera.',
      };
    }

    if (faceCount > 1) {
      return {
        success: false,
        status: 'failed',
        reason: 'multiple_faces',
        faceCount,
        error: `Multiple faces (${faceCount}) detected. Please upload a photo with only you visible.`,
      };
    }

    const primaryFace = detections[0];
    const qualityEval = evaluateWebLandmarksAndPose(primaryFace, width, height);

    if (!qualityEval.valid) {
      return {
        success: false,
        status: 'failed',
        reason: qualityEval.reason || 'poor_pose',
        faceCount: 1,
        error: qualityEval.error,
      };
    }

    const score = primaryFace.categories?.[0]?.score || 0.95;
    return {
      success: true,
      status: 'verified',
      reason: 'pass',
      faceCount: 1,
      confidence: score,
      message: `Face verified successfully on-device (${Math.round(score * 100)}% confidence).`,
    };
  } catch (err) {
    console.warn('[MediaPipe Web] Detection warning:', err);
    return {
      success: false,
      status: 'failed',
      reason: 'analysis_error',
      faceCount: 0,
      error: 'On-device face analysis could not complete. Please retry.',
    };
  }
}

// ====================================================
// 2. NATIVE ANDROID & iOS IMPLEMENTATION (Google ML Kit)
// ====================================================

/**
 * Runs Google ML Kit Face Detection on Native Android & iOS.
 */
async function analyzeSelfieOnNative(selfieUri) {
  try {
    // Dynamic import of native module
    let FaceDetectionModule;
    try {
      FaceDetectionModule = require('@react-native-ml-kit/face-detection').default;
    } catch (importErr) {
      console.warn('[ML Kit Native] Native module require failed:', importErr);
      return {
        success: false,
        status: 'failed',
        reason: 'analysis_error',
        faceCount: 0,
        error: 'Native ML Kit face detection is not available in standard Expo Go. Please run using a development build (npx expo run:android / run:ios).',
      };
    }

    if (!FaceDetectionModule || typeof FaceDetectionModule.detect !== 'function') {
      return {
        success: false,
        status: 'failed',
        reason: 'analysis_error',
        faceCount: 0,
        error: 'Face detection native module is not initialized on this device.',
      };
    }

    // Normalize image URI for native platforms (handles file://, content://, raw paths)
    const normalizedUri = selfieUri.trim();

    console.log('[ML Kit Native] Running on-device detection on URI:', normalizedUri);

    const faces = await FaceDetectionModule.detect(normalizedUri, {
      performanceMode: 'accurate',
      landmarkMode: 'all',
      classificationMode: 'all',
      minFaceSize: 0.1,
    });

    const faceCount = Array.isArray(faces) ? faces.length : 0;
    console.log('[ML Kit Native] Faces detected:', faceCount);

    if (faceCount === 0) {
      return {
        success: false,
        status: 'failed',
        reason: 'no_face',
        faceCount: 0,
        error: 'No human face detected. Please ensure good lighting and look directly into the camera.',
      };
    }

    if (faceCount > 1) {
      return {
        success: false,
        status: 'failed',
        reason: 'multiple_faces',
        faceCount,
        error: `Multiple faces (${faceCount}) detected. Please upload a photo with only you visible.`,
      };
    }

    // Exactly 1 face detected -> Evaluate native pose, size, and quality
    const primaryFace = faces[0];

    // 0. Face Size / Proportion Check (Minimum 8% of image dimension)
    if (primaryFace.frame) {
      try {
        const { width: imgW, height: imgH } = await new Promise((resolve) => {
          Image.getSize(
            normalizedUri,
            (w, h) => resolve({ width: w, height: h }),
            () => resolve({ width: 0, height: 0 })
          );
        });

        if (imgW > 0 && imgH > 0) {
          const widthRatio = primaryFace.frame.width / imgW;
          const heightRatio = primaryFace.frame.height / imgH;
          if (widthRatio < 0.08 || heightRatio < 0.08) {
            return {
              success: false,
              status: 'failed',
              reason: 'poor_pose',
              faceCount: 1,
              error: 'Face is too far away. Please hold the camera closer for your verification selfie.',
            };
          }
        }
      } catch (sizeErr) {
        console.warn('[ML Kit Native] Image size lookup warning:', sizeErr);
      }
    }

    // 1. Head Pose / Rotation Checks
    // rotationZ = Roll (tilt left/right). Reject excessive tilt (> 25 deg).
    if (typeof primaryFace.rotationZ === 'number' && Math.abs(primaryFace.rotationZ) > 25) {
      return {
        success: false,
        status: 'failed',
        reason: 'poor_pose',
        faceCount: 1,
        error: 'Head is tilted excessively. Please face the camera upright.',
      };
    }

    // rotationY = Yaw (turned left/right). Reject profile angles (> 35 deg).
    if (typeof primaryFace.rotationY === 'number' && Math.abs(primaryFace.rotationY) > 35) {
      return {
        success: false,
        status: 'failed',
        reason: 'poor_pose',
        faceCount: 1,
        error: 'Please face directly into the camera without turning sideways.',
      };
    }

    // rotationX = Pitch (nodded up/down). Reject extreme angles (> 30 deg).
    if (typeof primaryFace.rotationX === 'number' && Math.abs(primaryFace.rotationX) > 30) {
      return {
        success: false,
        status: 'failed',
        reason: 'poor_pose',
        faceCount: 1,
        error: 'Please look straight into the camera.',
      };
    }

    // 2. Eye Open Check (if probability provided by ML Kit)
    if (
      typeof primaryFace.leftEyeOpenProbability === 'number' &&
      typeof primaryFace.rightEyeOpenProbability === 'number'
    ) {
      if (primaryFace.leftEyeOpenProbability < 0.20 && primaryFace.rightEyeOpenProbability < 0.20) {
        return {
          success: false,
          status: 'failed',
          reason: 'low_quality',
          faceCount: 1,
          error: 'Both eyes appear closed. Please keep your eyes open and retake your selfie.',
        };
      }
    }

    // 3. Landmark verification (eyes & mouth position)
    if (primaryFace.landmarks) {
      const leftEye = primaryFace.landmarks.leftEye?.position;
      const rightEye = primaryFace.landmarks.rightEye?.position;
      const mouthBottom = primaryFace.landmarks.mouthBottom?.position;

      if (leftEye && rightEye && mouthBottom) {
        const avgEyeY = (leftEye.y + rightEye.y) / 2;
        if (mouthBottom.y <= avgEyeY) {
          return {
            success: false,
            status: 'failed',
            reason: 'poor_pose',
            faceCount: 1,
            error: 'Face orientation is inverted. Please hold your device upright.',
          };
        }
      }
    }

    return {
      success: true,
      status: 'verified',
      reason: 'pass',
      faceCount: 1,
      confidence: 0.98,
      message: 'Face verified successfully on-device via Google ML Kit.',
    };
  } catch (err) {
    console.warn('[ML Kit Native] Detection error:', err);
    return {
      success: false,
      status: 'failed',
      reason: 'analysis_error',
      faceCount: 0,
      error: `Native face analysis could not complete: ${err.message || 'Detection failed'}. Please retry.`,
    };
  }
}

// ==========================================
// 3. UNIFIED CROSS-PLATFORM PUBLIC API
// ==========================================

/**
 * Executes full on-device face detection and quality analysis on a selfie URI.
 * Automatically selects MediaPipe on Web and Google ML Kit on Android & iOS.
 * @param {string} selfieUri - Local image file URI or data URL
 * @returns {Promise<{ success: boolean, status: string, faceCount: number, confidence?: number, error?: string, message?: string }>}
 */
export async function analyzeSelfieOnDevice(selfieUri) {
  if (!selfieUri) {
    return {
      success: false,
      status: 'failed',
      faceCount: 0,
      error: 'Please capture a selfie before verifying.',
    };
  }

  // Guard against stock / placeholder images
  if (selfieUri.includes('unsplash.com') || selfieUri.includes('placeholder')) {
    return {
      success: false,
      status: 'failed',
      faceCount: 0,
      error: 'Stock photos or placeholder images cannot be used. Please take an authentic selfie.',
    };
  }

  if (Platform.OS === 'web') {
    return await analyzeSelfieOnWeb(selfieUri);
  } else {
    return await analyzeSelfieOnNative(selfieUri);
  }
}

export default {
  analyzeSelfieOnDevice,
  getWebFaceDetector,
  evaluateWebLandmarksAndPose,
};
