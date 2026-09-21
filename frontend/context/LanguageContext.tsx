'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import en from '../messages/en.json';
import hi from '../messages/hi.json';
import mr from '../messages/mr.json';
import ta from '../messages/ta.json';
import te from '../messages/te.json';
import bn from '../messages/bn.json';
import kn from '../messages/kn.json';

export type Locale = 'en' | 'hi' | 'mr' | 'ta' | 'te' | 'bn' | 'kn';

export interface LanguageOption {
  code: Locale;
  label: string;
  nativeLabel: string;
  script: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', script: 'Latin' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', script: 'Devanagari' },
  { code: 'mr', label: 'Marathi', nativeLabel: 'मराठी', script: 'Devanagari' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்', script: 'Tamil' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు', script: 'Telugu' },
  { code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা', script: 'Bengali' },
  { code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ', script: 'Kannada' },
];

const MESSAGES: Record<Locale, any> = {
  en,
  hi,
  mr,
  ta,
  te,
  bn,
  kn,
};

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (path: string, params?: Record<string, string | number>) => string;
  tArray: (path: string) => string[];
  languages: LanguageOption[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'dermai_locale';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize from localStorage (client-side only), strictly defaulting to 'en'
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (saved && MESSAGES[saved]) {
        setLocaleState(saved);
      }
    } catch (e) {
      console.warn('Could not load locale from localStorage:', e);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    if (!MESSAGES[newLocale]) return;
    setLocaleState(newLocale);
    try {
      localStorage.setItem(STORAGE_KEY, newLocale);
      document.documentElement.lang = newLocale;
    } catch (e) {
      console.warn('Could not save locale to localStorage:', e);
    }
  };

  /**
   * Translates a dot-notated key path with fallback to English
   */
  const t = (path: string, params?: Record<string, string | number>): string => {
    const keys = path.split('.');
    
    // 1. Try current locale
    let current: any = MESSAGES[locale];
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        current = undefined;
        break;
      }
    }

    // 2. Fallback to English if missing
    if (typeof current !== 'string') {
      let fallback: any = MESSAGES['en'];
      for (const key of keys) {
        if (fallback && typeof fallback === 'object' && key in fallback) {
          fallback = fallback[key];
        } else {
          fallback = undefined;
          break;
        }
      }
      current = typeof fallback === 'string' ? fallback : path;
    }

    // 3. Interpolate parameters e.g. {count}
    if (params && typeof current === 'string') {
      let result = current;
      for (const [paramKey, paramVal] of Object.entries(params)) {
        result = result.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
      }
      return result;
    }

    return current || path;
  };

  /**
   * Translates an array of strings with fallback to English
   */
  const tArray = (path: string): string[] => {
    const keys = path.split('.');
    let current: any = MESSAGES[locale];
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        current = undefined;
        break;
      }
    }

    if (!Array.isArray(current)) {
      let fallback: any = MESSAGES['en'];
      for (const key of keys) {
        if (fallback && typeof fallback === 'object' && key in fallback) {
          fallback = fallback[key];
        } else {
          fallback = undefined;
          break;
        }
      }
      return Array.isArray(fallback) ? fallback : [];
    }
    return current;
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, tArray, languages: SUPPORTED_LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    const defaultT = (path: string, params?: Record<string, string | number>): string => {
      const keys = path.split('.');
      let current: any = MESSAGES['en'];
      for (const key of keys) {
        if (current && typeof current === 'object' && key in current) {
          current = current[key];
        } else {
          current = undefined;
          break;
        }
      }
      if (typeof current !== 'string') return path;
      if (params) {
        let result = current;
        for (const [paramKey, paramVal] of Object.entries(params)) {
          result = result.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
        }
        return result;
      }
      return current;
    };

    const defaultTArray = (path: string): string[] => {
      const keys = path.split('.');
      let current: any = MESSAGES['en'];
      for (const key of keys) {
        if (current && typeof current === 'object' && key in current) {
          current = current[key];
        } else {
          current = undefined;
          break;
        }
      }
      return Array.isArray(current) ? current : [];
    };

    return {
      locale: 'en' as Locale,
      setLocale: () => {},
      t: defaultT,
      tArray: defaultTArray,
      languages: SUPPORTED_LANGUAGES,
    };
  }
  return context;
}
