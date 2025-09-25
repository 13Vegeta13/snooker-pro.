import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Timestamp } from 'firebase/firestore';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const toJsDate = (date: Timestamp | Date | string | null | undefined): Date | null => {
  if (!date) return null;
  
  // Si c'est déjà un objet Date
  if (date instanceof Date) {
    return isNaN(date.getTime()) ? null : date;
  }
  
  // Si c'est un Timestamp Firebase
  if (date && typeof date === 'object' && 'toDate' in date && typeof date.toDate === 'function') {
    try {
      return date.toDate();
    } catch (error) {
      console.warn('Erreur lors de la conversion du Timestamp:', error);
      return null;
    }
  }
  
  // Si c'est un objet avec une propriété seconds (format Firestore)
  if (date && typeof date === 'object' && 'seconds' in date && typeof date.seconds === 'number') {
    try {
      return new Date(date.seconds * 1000);
    } catch (error) {
      console.warn('Erreur lors de la conversion depuis seconds:', error);
      return null;
    }
  }
  
  // Si c'est une chaîne de caractères
  if (typeof date === 'string') {
    try {
      const parsed = new Date(date);
      return isNaN(parsed.getTime()) ? null : parsed;
    } catch (error) {
      console.warn('Erreur lors du parsing de la date string:', error);
      return null;
    }
  }
  
  console.warn('Format de date non reconnu:', date);
  return null;
};

export const formatDate = (date: Date | { seconds: number }) => {
  const d = toJsDate(date as any);
  if (!d) {
    return 'Date invalide';
  }
  
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d);
};

export const formatNumber = (num: number, decimals = 0) => {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num);
};

// Helper pour convertir une valeur en nombre sûr avec valeur par défaut
export const num = (v: any, d = 0): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : d;
};