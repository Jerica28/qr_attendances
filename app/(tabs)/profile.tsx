
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuth, signOut } from '@/lib/auth';
import {
  getProfile,
  updateProfile,
  type Profile,
} from '@/lib/profile';

const PURPLE = {
  primary: '#BC0DC8',
  dark: '#4D067B',
  background: '#F7F0FA',
  card: '#F3E8FF',
  border: '#E1BEE7',
  text: '#321047',
  secondary: '#786482',
  white: '#FFFFFF',
  lightPurple: '#EBD5FF',
};

export default function ProfileScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [draftName, setDraftName] = useState('');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const loadProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoadingProfile(false);
      return;
    }

    setLoadingProfile(true);

    try {
      const currentProfile = await getProfile(user.id);

      setProfile(currentProfile);
      setDraftName(currentProfile?.full_name ?? '');

      if (!currentProfile) {
        console.warn(
          'Profile not found. Check the profiles table and its RLS policies.',
        );
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      Alert.alert(
        'Profile Error',
        'Unable to load your profile. Please try again.',
      );
    } finally {
      setLoadingProfile(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile]),
  );

  const role = profile?.role;

  const roleLabel =
    role === 'admin'
      ? 'Admin'
      : role === 'teacher'
        ? 'Teacher'
        : role === 'student'
          ? 'Student'
          : 'Unavailable';

  const roleIcon =
    role === 'admin'
      ? 'shield-checkmark-outline'
      : role === 'teacher'
        ? 'school-outline'
        : 'person-outline';

  const handleSaveName = async () => {
    if (!user) return;

    const trimmedName = draftName.trim();

    if (!trimmedName) {
      Alert.alert('Name Required', 'Please enter your name.');
      return;
    }

    setSaving(true);

    try {
      const { error } = await updateProfile(user.id, {
        full_name: trimmedName,
      });

      if (error) {
        Alert.alert('Update Failed', error);
        return;
      }

      setProfile((previous) =>
        previous
          ? { ...previous, full_name: trimmedName }
          : previous,
      );

      setDraftName(trimmedName);
      setEditing(false);

      Alert.alert('Success', 'Your profile name has been updated.');
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to update your name.';

      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);

    try {
      await signOut();
      router.replace('/login');
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to sign out.';

      Alert.alert('Sign Out Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons
            name="person"
            size={30}
            color={PURPLE.white}
          />
        </View>

        <Text style={styles.headerTitle}>My Profile</Text>
        <Text style={styles.headerSubtitle}>
          Manage your account information
        </Text>
      </View>

      {user ? (
        <View style={styles.infoCard}>
          <View style={styles.cardHeading}>
            <View style={styles.cardIcon}>
              <Ionicons
                name="person-circle-outline"
                size={25}
                color={PURPLE.primary}
              />
            </View>

            <Text style={styles.cardTitle}>
              Personal Information
            </Text>
          </View>

          <Text style={styles.label}>Role</Text>

          {loadingProfile ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={PURPLE.primary} />
              <Text style={styles.loadingText}>
                Loading your role...
              </Text>
            </View>
          ) : (
            <View
              style={[
                styles.roleBadge,
                role === 'admin' && styles.adminBadge,
              ]}
            >
              <Ionicons
                name={roleIcon}
                size={16}
                color={PURPLE.white}
              />

              <Text style={styles.roleBadgeText}>
                {roleLabel}
              </Text>
            </View>
          )}

          {!loadingProfile && !profile && (
            <Text style={styles.errorText}>
              Your profile could not be found. Please check your
              Supabase profile record and permissions.
            </Text>
          )}

          <Text style={styles.label}>Name</Text>

          {editing ? (
            <View style={styles.nameEditRow}>
              <TextInput
                value={draftName}
                onChangeText={setDraftName}
                style={styles.nameInput}
                placeholder="Enter your name"
                placeholderTextColor={PURPLE.secondary}
                autoCapitalize="words"
                editable={!saving}
                accessibilityLabel="Profile name"
              />

              <Pressable
                onPress={handleSaveName}
                disabled={saving}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.saveButton,
                  pressed && styles.pressed,
                  saving && styles.disabledButton,
                ]}
              >
                <Ionicons
                  name="checkmark"
                  size={17}
                  color={PURPLE.white}
                />

                <Text style={styles.actionButtonText}>
                  {saving ? 'Saving...' : 'Save'}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setDraftName(profile?.full_name ?? '');
                  setEditing(false);
                }}
                disabled={saving}
                accessibilityRole="button"
                accessibilityLabel="Cancel editing"
                style={styles.cancelButton}
              >
                <Ionicons
                  name="close"
                  size={18}
                  color={PURPLE.dark}
                />
              </Pressable>
            </View>
          ) : (
            <View style={styles.nameRow}>
              <Text style={styles.value}>
                {profile?.full_name || 'Add your name'}
              </Text>

              <Pressable
                onPress={() => setEditing(true)}
                accessibilityRole="button"
                accessibilityLabel="Edit profile name"
                style={({ pressed }) => [
                  styles.editButton,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons
                  name="create-outline"
                  size={17}
                  color={PURPLE.primary}
                />

                <Text style={styles.editHint}>Edit</Text>
              </Pressable>
            </View>
          )}

          <View style={styles.separator} />

          <Text style={styles.label}>Email</Text>

          <View style={styles.detailRow}>
            <Ionicons
              name="mail-outline"
              size={19}
              color={PURPLE.primary}
            />

            <Text style={styles.value}>
              {user.email || 'No email available'}
            </Text>
          </View>

          <View style={styles.separator} />

          <Text style={styles.label}>User ID</Text>

          <View style={styles.userIdBox}>
            <Ionicons
              name="finger-print-outline"
              size={18}
              color={PURPLE.secondary}
            />

            <Text selectable style={styles.valueSmall}>
              {user.id}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.infoCard}>
          <Text style={styles.value}>
            Please sign in to view your profile.
          </Text>
        </View>
      )}

      <Pressable
        onPress={handleSignOut}
        disabled={loading}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.signOutButton,
          pressed && styles.pressed,
          loading && styles.disabledButton,
        ]}
      >
        <Ionicons
          name="log-out-outline"
          size={22}
          color={PURPLE.white}
        />

        <Text style={styles.signOutText}>
          {loading ? 'Signing Out...' : 'Sign Out'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: PURPLE.background,
  },

  container: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 35,
  },

  header: {
    backgroundColor: PURPLE.dark,
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 22,
    marginBottom: 20,
  },

  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: PURPLE.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  headerTitle: {
    color: PURPLE.white,
    fontSize: 25,
    fontWeight: '800',
  },

  headerSubtitle: {
    color: PURPLE.white,
    opacity: 0.85,
    fontSize: 13,
    marginTop: 5,
  },

  infoCard: {
    backgroundColor: PURPLE.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: PURPLE.border,
    padding: 18,
    marginBottom: 20,
  },

  cardHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },

  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: PURPLE.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardTitle: {
    flex: 1,
    color: PURPLE.dark,
    fontSize: 17,
    fontWeight: '800',
  },

  label: {
    fontSize: 12,
    fontWeight: '700',
    color: PURPLE.secondary,
    marginBottom: 6,
    marginTop: 12,
  },

  value: {
    flex: 1,
    fontSize: 14,
    color: PURPLE.text,
    fontWeight: '500',
  },

  valueSmall: {
    flex: 1,
    fontSize: 11,
    color: PURPLE.secondary,
  },

  roleBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: PURPLE.primary,
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },

  adminBadge: {
    backgroundColor: PURPLE.dark,
  },

  roleBadgeText: {
    color: PURPLE.white,
    fontSize: 12,
    fontWeight: '700',
  },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 8,
  },

  loadingText: {
    fontSize: 13,
    color: PURPLE.secondary,
  },

  errorText: {
    color: '#B3261E',
    fontSize: 12,
    marginTop: 8,
    lineHeight: 18,
  },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },

  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: PURPLE.white,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  editHint: {
    fontSize: 13,
    color: PURPLE.primary,
    fontWeight: '700',
  },

  nameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  nameInput: {
    flex: 1,
    minWidth: 0,
    height: 44,
    borderWidth: 1,
    borderColor: PURPLE.border,
    borderRadius: 11,
    paddingHorizontal: 12,
    color: PURPLE.text,
    backgroundColor: PURPLE.white,
  },

  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: PURPLE.primary,
    borderRadius: 11,
    paddingHorizontal: 12,
    height: 44,
  },

  cancelButton: {
    width: 38,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PURPLE.lightPurple,
    borderRadius: 11,
  },

  actionButtonText: {
    color: PURPLE.white,
    fontWeight: '700',
    fontSize: 13,
  },

  separator: {
    height: 1,
    backgroundColor: PURPLE.border,
    marginTop: 14,
  },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  userIdBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: PURPLE.white,
    borderRadius: 10,
    padding: 10,
  },

  signOutButton: {
    minHeight: 54,
    backgroundColor: PURPLE.primary,
    borderRadius: 15,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },

  signOutText: {
    color: PURPLE.white,
    fontSize: 16,
    fontWeight: '700',
  },

  pressed: {
    opacity: 0.8,
  },

  disabledButton: {
    opacity: 0.6,
  },
});
