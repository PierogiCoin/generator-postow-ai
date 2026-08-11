import React from 'react';
import { Platform } from '../types';
import { FacebookIcon } from '../components/icons/FacebookIcon';
import { InstagramIcon } from '../components/icons/InstagramIcon';
import { TikTokIcon } from '../components/icons/TikTokIcon';
import { XIcon } from '../components/icons/XIcon';
import { LinkedInIcon } from '../components/icons/LinkedInIcon';
import { YouTubeIcon } from '../components/icons/YouTubeIcon';

interface PlatformConfig {
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  name: string;
  color: string; // for bg in calendar
  hoverColor: string; // for border in selector
  selectedColor: string; // for border in selector
  iconColor: string; // for icon when selected
  selectedBgColor: string;
  selectedTextColor: string;
}

export const platformConfig: Record<Platform, PlatformConfig> = {
  [Platform.Facebook]: {
    icon: FacebookIcon,
    name: 'Facebook',
    color: 'bg-blue-500',
    hoverColor: 'hover:border-blue-600',
    selectedColor: 'border-blue-500',
    iconColor: 'text-blue-600 dark:text-blue-400',
    selectedBgColor: 'bg-blue-50 dark:bg-blue-900/30',
    selectedTextColor: 'text-blue-800 dark:text-blue-200',
  },
  [Platform.Instagram]: {
    icon: InstagramIcon,
    name: 'Instagram',
    color: 'bg-purple-500',
    hoverColor: 'hover:border-purple-500',
    selectedColor: 'border-purple-500',
    iconColor: 'text-purple-600 dark:text-purple-400',
    selectedBgColor: 'bg-purple-50 dark:bg-purple-900/30',
    selectedTextColor: 'text-purple-800 dark:text-purple-200',
  },
  [Platform.TikTok]: {
    icon: TikTokIcon,
    name: 'TikTok',
    color: 'bg-pink-500',
    hoverColor: 'hover:border-pink-500',
    selectedColor: 'border-pink-500',
    iconColor: 'text-pink-600 dark:text-pink-400',
    selectedBgColor: 'bg-pink-50 dark:bg-pink-900/30',
    selectedTextColor: 'text-pink-800 dark:text-pink-200',
  },
  [Platform.X]: {
    icon: XIcon,
    name: 'X',
    color: 'bg-gray-800 dark:bg-gray-300',
    hoverColor: 'hover:border-gray-500',
    selectedColor: 'border-gray-800 dark:border-gray-300',
    iconColor: 'text-gray-800 dark:text-gray-200',
    selectedBgColor: 'bg-gray-100 dark:bg-gray-800',
    selectedTextColor: 'text-gray-900 dark:text-gray-100',
  },
  [Platform.LinkedIn]: {
    icon: LinkedInIcon,
    name: 'LinkedIn',
    color: 'bg-sky-700',
    hoverColor: 'hover:border-sky-700',
    selectedColor: 'border-sky-700',
    iconColor: 'text-sky-700 dark:text-sky-500',
    selectedBgColor: 'bg-sky-50 dark:bg-sky-900/30',
    selectedTextColor: 'text-sky-800 dark:text-sky-200',
  },
  [Platform.YouTube]: {
    icon: YouTubeIcon,
    name: 'YouTube',
    color: 'bg-red-600',
    hoverColor: 'hover:border-red-600',
    selectedColor: 'border-red-600',
    iconColor: 'text-red-600 dark:text-red-500',
    selectedBgColor: 'bg-red-50 dark:bg-red-900/30',
    selectedTextColor: 'text-red-800 dark:text-red-200',
  },
};