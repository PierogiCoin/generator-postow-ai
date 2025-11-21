import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const JWT_SECRET = import.meta.env.VITE_JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

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
  // Sign up new user
  static async signUp(data: SignUpData): Promise<AuthResponse> {
    // Validate email
    if (!this.isValidEmail(data.email)) {
      throw new Error('Invalid email format');
    }

    // Validate password strength
    if (!this.isStrongPassword(data.password)) {
      throw new Error('Password must be at least 8 characters with uppercase, lowercase, and number');
    }

    // Check if user exists
    const { data: existing } = await supabase
      .from('users')
      .select('email')
      .eq('email', data.email.toLowerCase())
      .single();

    if (existing) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Create user
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        email: data.email.toLowerCase(),
        password: hashedPassword,
        name: data.name,
        plan: 'free',
        credits: 100, // Free tier credits
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // Generate JWT token
    const token = this.generateToken(user.id);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Save session
    await supabase.from('sessions').insert({
      user_id: user.id,
      token,
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString()
    });

    return {
      user: this.mapUser(user),
      token,
      expiresAt
    };
  }

  // Login existing user
  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', credentials.email.toLowerCase())
      .single();

    if (error || !user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(credentials.password, user.password);
    
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);

    // Generate new token
    const token = this.generateToken(user.id);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Save session
    await supabase.from('sessions').insert({
      user_id: user.id,
      token,
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString()
    });

    return {
      user: this.mapUser(user),
      token,
      expiresAt
    };
  }

  // Verify token and get user
  static async verifyToken(token: string): Promise<User> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

      // Check session
      const { data: session } = await supabase
        .from('sessions')
        .select('*')
        .eq('token', token)
        .eq('user_id', decoded.userId)
        .single();

      if (!session) {
        throw new Error('Invalid session');
      }

      // Check if expired
      if (new Date(session.expires_at) < new Date()) {
        await this.logout(token);
        throw new Error('Session expired');
      }

      // Get user
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', decoded.userId)
        .single();

      if (error || !user) {
        throw new Error('User not found');
      }

      return this.mapUser(user);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  // Logout
  static async logout(token: string): Promise<void> {
    await supabase
      .from('sessions')
      .delete()
      .eq('token', token);
  }

  // Refresh token
  static async refreshToken(oldToken: string): Promise<AuthResponse> {
    const user = await this.verifyToken(oldToken);
    
    // Delete old session
    await this.logout(oldToken);

    // Create new session
    const token = this.generateToken(user.id);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await supabase.from('sessions').insert({
      user_id: user.id,
      token,
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString()
    });

    return {
      user,
      token,
      expiresAt
    };
  }

  // Reset password request
  static async requestPasswordReset(email: string): Promise<void> {
    const { data: user } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .single();

    if (!user) {
      // Don't reveal if user exists
      return;
    }

    // Generate reset token
    const resetToken = this.generateResetToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

    await supabase.from('password_resets').insert({
      user_id: user.id,
      token: resetToken,
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString()
    });

    // TODO: Send email with reset link
    console.log(`Reset token for ${email}: ${resetToken}`);
  }

  // Reset password
  static async resetPassword(token: string, newPassword: string): Promise<void> {
    const { data: reset } = await supabase
      .from('password_resets')
      .select('*')
      .eq('token', token)
      .single();

    if (!reset || new Date(reset.expires_at) < new Date()) {
      throw new Error('Invalid or expired reset token');
    }

    if (!this.isStrongPassword(newPassword)) {
      throw new Error('Password must be at least 8 characters with uppercase, lowercase, and number');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('id', reset.user_id);

    // Delete reset token
    await supabase
      .from('password_resets')
      .delete()
      .eq('token', token);

    // Invalidate all sessions
    await supabase
      .from('sessions')
      .delete()
      .eq('user_id', reset.user_id);
  }

  // Update user profile
  static async updateProfile(userId: string, updates: Partial<User>): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    return this.mapUser(data);
  }

  // Change password
  static async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const { data: user } = await supabase
      .from('users')
      .select('password')
      .eq('id', userId)
      .single();

    if (!user) {
      throw new Error('User not found');
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    if (!this.isStrongPassword(newPassword)) {
      throw new Error('Password must be at least 8 characters with uppercase, lowercase, and number');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('id', userId);
  }

  // Helper methods
  private static generateToken(userId: string): string {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  private static generateResetToken(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private static mapUser(dbUser: any): User {
    return {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      avatar: dbUser.avatar,
      plan: dbUser.plan,
      credits: dbUser.credits,
      createdAt: new Date(dbUser.created_at)
    };
  }

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

// Token storage helper
export class TokenStorage {
  private static readonly TOKEN_KEY = 'auth_token';

  static setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  static getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  static removeToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }

  static hasToken(): boolean {
    return !!this.getToken();
  }
}
