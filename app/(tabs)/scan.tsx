import {
  CameraView,
  useCameraPermissions,
} from 'expo-camera';

import { useState } from 'react';

import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { registerAttendance } from '@/lib/attendance';

export default function ScanScreen() {
  const { user } = useAuth();

  const [
    permission,
    requestPermission,
  ] = useCameraPermissions();

  const [scanned, setScanned] =
    useState(false);

  const [lastData, setLastData] =
    useState<string | null>(null);

  const [message, setMessage] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState(false);

  const [processing, setProcessing] =
    useState(false);

  /*
   * ======================================
   * CAMERA PERMISSION
   * ======================================
   */

  if (!permission) {
    return (
      <View style={styles.container} />
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.title}>
          Camera Permission Needed
        </Text>

        <Text style={styles.subtitle}>
          We need access to your camera
          to scan QR codes.
        </Text>

        <AppButton
          theme="primary"
          title="Grant Permission"
          icon="camera"
          onPress={requestPermission}
        />
      </View>
    );
  }

  /*
   * ======================================
   * SCAN QR
   * ======================================
   */

  const handleBarcodeScanned = async ({
    data,
  }: {
    data: string;
  }) => {
    /*
     * Prevent multiple scans
     */
    if (processing || scanned) {
      return;
    }

    /*
     * Make sure a user is logged in
     */
    if (!user) {
      setScanned(true);
      setMessage(
        'You must be logged in to record attendance.'
      );
      setSuccess(false);
      return;
    }

    /*
     * Start processing
     */
    setProcessing(true);
    setScanned(true);
    setLastData(data);
    setMessage(null);

    console.log(
      '================================'
    );

    console.log(
      'ATTENDANCE SCAN'
    );

    console.log(
      'User ID:',
      user.id
    );

    console.log(
      'QR Data:',
      data
    );

    console.log(
      '================================'
    );

    try {
      /*
       * IMPORTANT:
       * Use the authenticated user's
       * Supabase ID as student_id.
       */
      const result =
        await registerAttendance(
          data,
          user.id
        );

      setMessage(
        result.message
      );

      setSuccess(
        result.success
      );

      console.log(
        'Attendance result:',
        result
      );
    } catch (error) {
      console.error(
        'Attendance error:',
        error
      );

      setMessage(
        'Failed to record attendance.'
      );

      setSuccess(false);
    } finally {
      setProcessing(false);
    }
  };

  /*
   * ======================================
   * SCAN AGAIN
   * ======================================
   */

  const handleScanAgain = () => {
    setScanned(false);

    setLastData(null);

    setMessage(null);

    setSuccess(false);

    setProcessing(false);
  };

  /*
   * ======================================
   * SCREEN
   * ======================================
   */

  return (
    <View style={styles.container}>

      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={
          scanned
            ? undefined
            : handleBarcodeScanned
        }
      />

      <View style={styles.overlay}>

        <Text
          style={styles.overlayText}
        >
          {processing
            ? 'Recording attendance...'
            : scanned
            ? 'QR Code detected!'
            : 'Point your camera at a QR code'}
        </Text>

        {scanned && message && (
          <Text
            style={[
              styles.scanResult,
              success
                ? styles.success
                : styles.error,
            ]}
          >
            {message}
          </Text>
        )}

        {scanned && lastData && (
          <Text
            style={styles.scanData}
            numberOfLines={3}
          >
            QR: {lastData}
          </Text>
        )}

        {scanned && (
          <AppButton
            theme="primary"
            title="Scan Again"
            icon="refresh"
            onPress={handleScanAgain}
          />
        )}

      </View>
    </View>
  );
}

/*
 * ======================================
 * STYLES
 * ======================================
 */

const styles = StyleSheet.create({
  container: {
    flex: 1,

    backgroundColor:
      COLORS.background,

    justifyContent: 'center',

    alignItems: 'center',
  },

  permissionContainer: {
    flex: 1,

    backgroundColor:
      COLORS.background,

    justifyContent: 'center',

    alignItems: 'center',

    paddingHorizontal: 24,
  },

  camera: {
    ...StyleSheet.absoluteFillObject,
  },

  title: {
    fontSize: 20,

    fontWeight: '600',

    color:
      COLORS.textPrimary,

    marginBottom: 8,

    textAlign: 'center',
  },

  subtitle: {
    fontSize: 14,

    color:
      COLORS.textSecondary,

    textAlign: 'center',

    lineHeight: 20,

    marginBottom: 16,
  },

  overlay: {
    position: 'absolute',

    left: 20,

    right: 20,

    bottom: 60,

    backgroundColor:
      COLORS.card,

    borderRadius: 14,

    padding: 16,

    alignItems: 'center',
  },

  overlayText: {
    fontSize: 16,

    fontWeight: '600',

    color:
      COLORS.textPrimary,

    marginBottom: 6,

    textAlign: 'center',
  },

  scanResult: {
    fontSize: 14,

    textAlign: 'center',

    marginBottom: 8,

    fontWeight: '600',
  },

  success: {
    color: '#2E7D32',
  },

  error: {
    color: '#C62828',
  },

  scanData: {
    fontSize: 12,

    color:
      COLORS.textSecondary,

    textAlign: 'center',

    marginBottom: 12,
  },
});