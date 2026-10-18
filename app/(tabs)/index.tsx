import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

import AppButton from '@/components/AppButton';
import Header from '@/components/Header';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth'
import { getProfile } from '@/lib/profile';

export default function Index() {
  const { user } = useAuth();
  const [role, setRole] = useState<string | null>(null);
  const [checkingRole, setCheckingRole] = useState(true);

  const loadRole = useCallback(async () => {
    if (!user) {
      setRole(null);
      setCheckingRole(false);
      return;
    }

    setCheckingRole(true);

    try {
      const profile = await getProfile(user.id);
      setRole(profile?.role ?? null);
    } catch (error) {
      console.error('Failed to load user role:', error);
      setRole(null);
    } finally {
      setCheckingRole(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadRole();
    }, [loadRole])
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerContainer}>
          <Header title="QR Attendance" />
          <Text style={styles.author}>by: Jerica Mahinay</Text>
        </View>

        <View style={styles.bodyContainer}>
          <Text style={styles.mainTitle}>School Event Attendance</Text>
          <Text style={styles.subtitle}>
            Scan QR Codes to record attendance during school activities.
          </Text>
        </View>

        <View style={styles.footerContainer}>
          <AppButton
            theme="primary"
            title="Scan QR Code"
            icon="qr-code-outline"
            onPress={() => router.push('/(tabs)/scan')}
          />

          <AppButton
            title="Attendance History"
            icon="time-outline"
            onPress={() => router.push('/(tabs)/history')}
          />

          <AppButton
            title="Profile"
            icon="person-outline"
            onPress={() => router.push('/(tabs)/profile')}
          />
        </View>

        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>More Features</Text>
          <Text style={styles.sectionSubtitle}>
            Manage your attendance and school events.
          </Text>

          {checkingRole ? (
            <ActivityIndicator
              color={COLORS.primary}
              style={styles.loader}
            />
          ) : null}

          {!checkingRole && role === 'admin' && (
            <>
              <View style={styles.featureCard}>
                <View style={styles.featureIcon}>
                  <Ionicons
                    name="people-outline"
                    size={25}
                    color={COLORS.primary}
                  />
                </View>

                <View style={styles.featureInfo}>
                  <Text style={styles.featureTitle}>
                    Admin User Management
                  </Text>
                  <Text style={styles.featureDescription}>
                    View student and teacher accounts and their roles.
                  </Text>
                </View>
              </View>

              <View style={styles.featureAction}>
                <AppButton
                  theme="primary"
                  title="Manage Users"
                  icon="people-outline"
                  onPress={() => router.push('/admin')}
                />
              </View>
            </>
          )}

          <View style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <Ionicons
                name="grid-outline"
                size={25}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.featureInfo}>
              <Text style={styles.featureTitle}>Dashboard</Text>
              <Text style={styles.featureDescription}>
                View your attendance overview and statistics.
              </Text>
            </View>
          </View>

          <View style={styles.featureAction}>
            <AppButton
              title="Open Dashboard"
              icon="grid-outline"
              onPress={() => router.push('/(tabs)/dashboard')}
            />
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <Ionicons
                name="document-text-outline"
                size={25}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.featureInfo}>
              <Text style={styles.featureTitle}>Reports</Text>
              <Text style={styles.featureDescription}>
                View attendance reports and available exports.
              </Text>
            </View>
          </View>

          <View style={styles.featureAction}>
            <AppButton
              title="Open Reports"
              icon="document-text-outline"
              onPress={() => router.push('/(tabs)/report')}
            />
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <Ionicons
                name="notifications-outline"
                size={25}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.featureInfo}>
              <Text style={styles.featureTitle}>Reminders</Text>
              <Text style={styles.featureDescription}>
                Set reminders 15 minutes before upcoming events.
              </Text>
            </View>
          </View>

          <View style={styles.featureAction}>
            <AppButton
              title="Open Reminders"
              icon="notifications-outline"
              onPress={() => router.push('/(tabs)/reminder')}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  headerContainer: {
    minHeight: 260,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  author: {
    textAlign: 'center',
    width: '100%',
    color: COLORS.textSecondary,
    marginTop: 12,
    fontSize: 14,
  },
  bodyContainer: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  mainTitle: {
    fontSize: 23,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  footerContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    width: '100%',
    gap: 10,
  },
  featuresSection: {
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  sectionTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
    lineHeight: 21,
  },
  loader: {
    marginVertical: 12,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1E5FA',
    borderColor: '#E2D0F0',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  featureIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureInfo: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primaryDark,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  featureAction: {
    marginTop: 8,
    marginBottom: 18,
  },
});