
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { COLORS } from '@/constants/colors';
import { supabase } from '@/lib/supabase';

type UserRole = 'student' | 'teacher' | 'admin';

type UserProfile = {
  id: string;
  full_name: string | null;
  role: UserRole;
};

type RoleSummary = {
  role: UserRole;
  label: string;
  count: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

const ROLE_COLORS: Record<UserRole, string> = {
  student: '#16A6C7',
  teacher: '#7952C7',
  admin: '#E69A42',
};

export default function AdminScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  const loadUsers = useCallback(async () => {
    setErrorMessage('');

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setAuthorized(false);
        setUsers([]);
        setErrorMessage('Please sign in to access administration.');
        return;
      }

      const { data: currentProfile, error: profileError } =
        await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

      if (profileError || currentProfile?.role !== 'admin') {
        setAuthorized(false);
        setUsers([]);
        setErrorMessage('This screen is available to administrators only.');
        return;
      }

      setAuthorized(true);

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .in('role', ['student', 'teacher', 'admin'])
        .order('full_name', { ascending: true });

      if (error) {
        throw error;
      }

      setUsers((data ?? []) as UserProfile[]);
    } catch (error) {
      console.error('Admin screen error:', error);
      setErrorMessage(
        'Unable to load users. Check your connection and Supabase permissions.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadUsers();
    }, [loadUsers])
  );

  const refresh = () => {
    setRefreshing(true);
    void loadUsers();
  };

  const students = users.filter((user) => user.role === 'student');
  const teachers = users.filter((user) => user.role === 'teacher');
  const admins = users.filter((user) => user.role === 'admin');

  const maxCount = Math.max(
    1,
    students.length,
    teachers.length,
    admins.length
  );

  const summaries: RoleSummary[] = [
    {
      role: 'student',
      label: 'Students',
      count: students.length,
      icon: 'people',
      color: ROLE_COLORS.student,
    },
    {
      role: 'teacher',
      label: 'Teachers',
      count: teachers.length,
      icon: 'school',
      color: ROLE_COLORS.teacher,
    },
    {
      role: 'admin',
      label: 'Admins',
      count: admins.length,
      icon: 'shield-checkmark',
      color: ROLE_COLORS.admin,
    },
  ];

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.muted}>Loading administration...</Text>
      </View>
    );
  }

  if (!authorized) {
    return (
      <View style={styles.center}>
        <Ionicons
          name="lock-closed-outline"
          size={48}
          color={COLORS.primary}
        />
        <Text style={styles.title}>Admin Access Required</Text>
        <Text style={styles.muted}>
          {errorMessage || 'You do not have permission to view this screen.'}
        </Text>
        <Pressable style={styles.primaryButton} onPress={refresh}>
          <Text style={styles.primaryButtonText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          tintColor={COLORS.primary}
        />
      }
    >
      {/* Admission header */}
      <View style={styles.admissionCard}>
        <View style={styles.admissionHeader}>
          <View style={styles.admissionText}>
            <Text style={styles.title}>Admission</Text>
            <Text style={styles.description}>
              Manage your institute users here: Students, Teachers, and Admins.
            </Text>
          </View>

          <View style={styles.admissionIcon}>
            <Ionicons
              name="people-circle-outline"
              size={42}
              color={COLORS.primary}
            />
          </View>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            style={styles.outlineButton}
            onPress={() =>
              Alert.alert(
                'Add User',
                'User registration is not connected to this button yet. Use your existing registration flow until the admin creation feature is implemented.'
              )
            }
          >
            <Ionicons
              name="person-add-outline"
              size={18}
              color={COLORS.textPrimary}
            />
            <Text style={styles.outlineButtonText}>Add User</Text>
          </Pressable>

          <Pressable
            style={styles.outlineButton}
            onPress={() =>
              Alert.alert(
                'Add Batch',
                'Batch management requires a batch data model and a batch creation screen.'
              )
            }
          >
            <Ionicons
              name="people-outline"
              size={18}
              color={COLORS.textPrimary}
            />
            <Text style={styles.outlineButtonText}>Add Batch</Text>
          </Pressable>
        </View>

        <View style={styles.totalBanner}>
          <View>
            <Text style={styles.totalLabel}>Total Registered Profiles</Text>
            <Text style={styles.totalNumber}>{users.length}</Text>
          </View>
          <Ionicons
            name="stats-chart-outline"
            size={30}
            color={COLORS.primary}
          />
        </View>
      </View>

      {/* Role summary cards */}
      <Text style={styles.sectionTitle}>User Overview</Text>

      {summaries.map((summary) => {
        const progress = (summary.count / maxCount) * 100;

        return (
          <View key={summary.role} style={styles.summaryCard}>
            <View style={styles.summaryLeft}>
              <View
                style={[
                  styles.roleIcon,
                  { backgroundColor: `${summary.color}18` },
                ]}
              >
                <Ionicons
                  name={summary.icon}
                  size={23}
                  color={summary.color}
                />
              </View>

              <View style={styles.roleDetails}>
                <Text style={styles.roleName}>{summary.label}</Text>
                <Text style={styles.roleDescription}>
                  Registered accounts
                </Text>
                <Text style={[styles.roleCount, { color: summary.color }]}>
                  {summary.count}
                </Text>
              </View>
            </View>

            <View style={styles.summaryRight}>
              <Text style={styles.barCaption}>Compared with largest role</Text>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${progress}%`,
                      backgroundColor: summary.color,
                    },
                  ]}
                />
              </View>
              <Text style={styles.countCaption}>
                {summary.count} account{summary.count === 1 ? '' : 's'}
              </Text>
            </View>
          </View>
        );
      })}

      {/* Registered users */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionText}>
          <Text style={styles.sectionTitle}>User Management</Text>
          <Text style={styles.description}>
            Registered students, teachers, and administrators
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh users"
          onPress={refresh}
          style={styles.refreshButton}
        >
          <Ionicons name="refresh-outline" size={21} color={COLORS.primary} />
        </Pressable>
      </View>

      {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}

      {users.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons
            name="people-outline"
            size={34}
            color={COLORS.textSecondary}
          />
          <Text style={styles.emptyTitle}>No profiles found</Text>
          <Text style={styles.muted}>
            Registered profiles will appear here when available.
          </Text>
        </View>
      ) : (
        users.map((item) => (
          <View key={item.id} style={styles.userCard}>
            <View
              style={[
                styles.avatar,
                { backgroundColor: `${ROLE_COLORS[item.role]}18` },
              ]}
            >
              <Ionicons
                name={
                  item.role === 'student'
                    ? 'person-outline'
                    : item.role === 'teacher'
                      ? 'school-outline'
                      : 'shield-checkmark-outline'
                }
                size={23}
                color={ROLE_COLORS[item.role]}
              />
            </View>

            <View style={styles.userInfo}>
              <Text style={styles.userName}>
                {item.full_name?.trim() || 'Unnamed User'}
              </Text>
              <Text style={styles.userRole}>
                {item.role.charAt(0).toUpperCase() + item.role.slice(1)}
              </Text>
            </View>

            <View
              style={[
                styles.roleBadge,
                { backgroundColor: `${ROLE_COLORS[item.role]}18` },
              ]}
            >
              <Text
                style={[
                  styles.roleBadgeText,
                  { color: ROLE_COLORS[item.role] },
                ]}
              >
                {item.role.toUpperCase()}
              </Text>
            </View>
          </View>
        ))
      )}

      <Text style={styles.footer}>
        User counts reflect the profiles returned by Supabase. Active and
        inactive account status is not currently available in this query.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 14,
  },
  center: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 14,
  },
  admissionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 20,
    elevation: 2,
  },
  admissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  admissionText: {
    flex: 1,
    gap: 7,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 23,
    fontWeight: '800',
  },
  description: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  admissionIcon: {
    width: 58,
    height: 58,
    borderRadius: 17,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  outlineButton: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 24,
    paddingHorizontal: 10,
  },
  outlineButtonText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  totalBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 15,
    padding: 14,
  },
  totalLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  totalNumber: {
    color: COLORS.primary,
    fontSize: 29,
    fontWeight: '800',
    marginTop: 4,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  summaryCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 17,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  roleIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleDetails: {
    flex: 1,
    gap: 3,
  },
  roleName: {
    color: COLORS.textPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
  roleDescription: {
    color: COLORS.textSecondary,
    fontSize: 10,
  },
  roleCount: {
    fontSize: 23,
    fontWeight: '800',
    marginTop: 2,
  },
  summaryRight: {
    flex: 1,
    gap: 8,
  },
  barCaption: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  progressTrack: {
    height: 9,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 10,
  },
  countCaption: {
    textAlign: 'right',
    color: COLORS.textSecondary,
    fontSize: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 8,
  },
  sectionText: {
    flex: 1,
    gap: 5,
  },
  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 13,
    lineHeight: 19,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 24,
    gap: 10,
  },
  emptyTitle: {
    fontWeight: '700',
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  userCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 15,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
    gap: 5,
  },
  userName: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  userRole: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  roleBadge: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  muted: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  footer: {
    color: COLORS.textSecondary,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
