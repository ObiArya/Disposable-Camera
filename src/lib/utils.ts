import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateDeviceId() {
  let id = localStorage.getItem('gd2026_device_id');
  if (!id) {
    id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('gd2026_device_id', id);
  }
  return id;
}

export function getPhotoCount() {
  const count = localStorage.getItem('gd2026_photo_count');
  return count ? parseInt(count, 10) : 0;
}

export function getDeviceLimit() {
  const limit = 10; // Fixed limit as requested
  localStorage.setItem('gd2026_device_limit', limit.toString());
  return limit;
}

export function incrementPhotoCount() {
  const count = getPhotoCount();
  localStorage.setItem('gd2026_photo_count', (count + 1).toString());
}
