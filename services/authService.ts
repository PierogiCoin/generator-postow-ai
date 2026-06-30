import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  plan: 'free' | 'pro' | 'enterprise';
  credits: number;
  createdAt: Date;
}

export interface AuthResponse {
  user: User;
  token: string;
  expiresAt: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignUpData {
  email: string;
  password: string;
  name: string;
}

export class AuthService {
  // Sign up new user — delegates to Supabase Auth
  static async signUp(data: SignUpData): Promise<AuthResponse> {
    if (!this.isValidEmail(data.email)) {
      throw new Error('Invalid email format');
    }
    if (!this.isStrongPassword(data.password)) {
      throw new Error('Password must be at least 8 characters with uppercase, lowercase, and number');
    }

    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email.toLowerCase(),
      password: data.password,
      options: { data: { name: data.name } }
    });

    if (error) throw new Error(error.message);
    if (!authData.user || !authData.session) throw new Error('Sign up failed');

    const expiresAt = new Date(authData.session.expires_at! * 1000);
    return {
      user: {
        id: authData.user.id,
        email: authData.user.email!,
        name: data.name,
        plan: 'free',
        credits: 100,
        createdAt: new Date(authData.user.created_at)
      },
      token: authData.session.access_token,
      expiresAt
    };
  }

  // Login existing user — delegates to Supabase Auth
  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: credentials.email.toLowerCase(),
      password: credentials.password
    });

    if (error) throw new Error('Invalid email or password');
    if (!authData.user || !authData.session) throw new Error('Login failed');

    const expiresAt = new Date(authData.session.expires_at! * 1000);
    return {
      user: {
        id: authData.user.id,
        email: authData.user.email!,
        name: authData.user.user_metadata?.name || '',
        plan: authData.user.user_metadata?.plan || 'free',
        credits: authData.user.user_metadata?.credits || 0,
        createdAt: new Date(authData.user.created_at)
      },
      token: authData.session.access_token,
      expiresAt
    };
  }

  // Verify session — delegates to Supabase Auth
  static async verifyToken(_token: string): Promise<User> {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw new Error('Invalid or expired token');
    const u = data.user;
    return {
      id: u.id,
      email: u.email!,
      name: u.user_metadata?.name || '',
      plan: u.user_metadata?.plan || 'free',
      credits: u.user_metadata?.credits || 0,
      createdAt: new Date(u.created_at)
    };
  }

  // Logout — delegates to Supabase Auth
  static async logout(_token: string): Promise<void> {
    await supabase.auth.signOut();
  }

  // Refresh token — delegates to Supabase Auth
  static async refreshToken(_oldToken: string): Promise<AuthResponse> {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session || !data.user) throw new Error('Failed to refresh session');
    const u = data.user;
    const expiresAt = new Date(data.session.expires_at! * 1000);
    return {
      user: {
        id: u.id,
        email: u.email!,
        name: u.user_metadata?.name || '',
        plan: u.user_metadata?.plan || 'free',
        credits: u.user_metadata?.credits || 0,
        createdAt: new Date(u.created_at)
      },
      token: data.session.access_token,
      expiresAt
    };
  }

  // Reset password request — sends email via Supabase Auth
  static async requestPasswordReset(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.toLowerCase(),
      { redirectTo: `${window.location.origin}/reset-password` }
    );
    if (error) throw new Error(error.message);
  }

  // Reset password — update via Supabase Auth session (after email link clicked)
  static async resetPassword(_token: string, newPassword: string): Promise<void> {
    if (!this.isStrongPassword(newPassword)) {
      throw new Error('Password must be at least 8 characters with uppercase, lowercase, and number');
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
  }

  // Update user profile
  static async updateProfile(userId: string, updates: Partial<User>): Promise<User> {
    const { error } = await supabase.auth.updateUser({ data: updates });
    if (error) throw new Error(error.message);
    const { data, error: getUserError } = await supabase.auth.getUser();
    if (getUserError || !data.user) throw new Error('Failed to get updated user');
    const u = data.user;
    return {
      id: u.id,
      email: u.email!,
      name: u.user_metadata?.name || '',
      avatar: u.user_metadata?.avatar,
      plan: u.user_metadata?.plan || 'free',
      credits: u.user_metadata?.credits || 0,
      createdAt: new Date(u.created_at)
    };
  }

  // Change password — delegates to Supabase Auth
  static async changePassword(_userId: string, _currentPassword: string, newPassword: string): Promise<void> {
    if (!this.isStrongPassword(newPassword)) {
      throw new Error('Password must be at least 8 characters with uppercase, lowercase, and number');
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
  }

  // Helper methods
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private static isStrongPassword(password: string): boolean {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    return password.length >= 8 &&
           /[A-Z]/.test(password) &&
           /[a-z]/.test(password) &&
           /[0-9]/.test(password);
  }
}

