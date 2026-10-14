import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';

import { supabase } from '@/lib/supabase';
import { COLORS } from '@/constants/colors';

type UserProfile = {
  id: string;
  full_name: string | null;
  role: 'student' | 'teacher' | 'admin';
};

export default function AdminScreen() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadUsers = useCallback(async () => {
    setError('');

    try {
      const { data: authData } = await supabase.auth.getUser();
      const currentUser = authData.user;

      if (!currentUser) {
        setError('Please sign in first.');
        return;
      }

      const { data: me, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .single();

      if (profileError) throw profileError;

      if (me?.role !== 'admin') {
        setError('Access denied. Admins only.');
        return;
      }

      const { data, error: usersError } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .in('role', ['student', 'teacher'])
        .order('full_name', { ascending: true });

      if (usersError) throw usersError;

      setUsers((data ?? []) as UserProfile[]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load user accounts.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, [loadUsers])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.subtitle}>Loading users...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>User Management</Text>
      <Text style={styles.subtitle}>
        View student and teacher accounts
      </Text>

      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadUsers();
              }}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <Text style={styles.subtitle}>No users found.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(item.full_name || '?').charAt(0).toUpperCase()}
                </Text>
              </View>

              <View style={styles.details}>
                <Text style={styles.name}>
                  {item.full_name || 'Unnamed user'}
                </Text>
                <Text style={styles.role}>
                  {item.role.toUpperCase()}
                </Text>
                <Text style={styles.userId} numberOfLines={1}>
                  ID: {item.id}
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 20,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.primaryDark,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 18,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1E5FA',
    borderColor: '#E2D0F0',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    gap: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  details: {
    flex: 1,
  },
  name: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  role: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
  },
  userId: {
    color: COLORS.textSecondary,
    fontSize: 10,
    marginTop: 4,
  },
  error: {
    color: COLORS.danger,
    fontSize: 14,
  },
});