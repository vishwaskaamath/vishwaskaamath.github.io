"use client";
import { createContext, useContext, type RefObject } from 'react';
export type Theme = 'light' | 'dark';
export type ThemeRef = RefObject<Theme>;
export const ThemeContext = createContext<ThemeRef>({ current: 'dark' });
export const useThemeRef = () => useContext(ThemeContext);
export const THEME_EVENT = 'portfolio-theme-change';
