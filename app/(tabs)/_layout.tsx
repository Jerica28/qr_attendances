
import { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { COLORS } from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { getProfile, type Role } from '@/lib/profile';

export default function TabLayout() {
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadRole = async (userId: string | null) => {
      if (!userId) {
        if (mounted) setRole(null);
        return;
      }

      try {
        const profile = await getProfile(userId);

        if (mounted) {
          setRole(profile?.role ?? null);
        }
      } catch (error) {
        console.error('Error loading profile role:', error);
        if (mounted) setRole(null);
      }
    };

    const initialize = async () => {
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        if (mounted) setRole(null);
        return;
      }

      await loadRole(data.user?.id ?? null);
    };

    void initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void loadRole(session?.user?.id ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const isStudent = role === 'student';
  const isTeacher = role === 'teacher';
  const isAdmin = role === 'admin';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,

        headerStyle: {
          backgroundColor: COLORS.background,
        },
        headerShadowVisible: false,
        headerTintColor: COLORS.textPrimary,

        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 10,
        },
      }}
    >
      {/* Home */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'home-sharp' : 'home-outline'}
              color={color}
              size={24}
            />
          ),
        }}
      />

      {/* Student-only QR scanner */}
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          href: isStudent ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'qr-code' : 'qr-code-outline'}
              color={color}
              size={24}
            />
          ),
        }}
      />

      {/* Attendance history */}
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'time' : 'time-outline'}
              color={color}
              size={24}
            />
          ),
        }}
      />

      {/* User profile */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              color={color}
              size={24}
            />
          ),
        }}
      />

      {/* Teacher-only event management */}
      <Tabs.Screen
        name="teacher"
        options={{
          title: 'Teacher',
          href: isTeacher ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'clipboard' : 'clipboard-outline'}
              color={color}
              size={24}
            />
          ),
        }}
      />

      {/* Admin-only user management */}
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={
                focused
                  ? 'shield-checkmark'
                  : 'shield-checkmark-outline'
              }
              color={color}
              size={24}
            />
          ),
        }}
      />

      {/* Additional screens opened from Home */}
      <Tabs.Screen
        name="dashboard"
        options={{
          href: null,
          title: 'Dashboard',
        }}
      />

      <Tabs.Screen
        name="report"
        options={{
          href: null,
          title: 'Reports',
        }}
      />

      <Tabs.Screen
        name="reminder"
        options={{
          href: null,
          title: 'Reminders',
        }}
      />
    </Tabs>
  );
}
