import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { LanguageProvider, useLanguage } from '../context/LanguageContext';

function TestConsumer() {
  const { locale, setLocale, t, languages } = useLanguage();

  return (
    <div>
      <div data-testid="current-locale">{locale}</div>
      <div data-testid="translated-title">{t('hero.title')}</div>
      <div data-testid="fallback-test">{t('non.existent.key')}</div>
      <div data-testid="languages-count">{languages.length}</div>
      <button onClick={() => setLocale('hi')} data-testid="switch-hi">
        Hindi
      </button>
      <button onClick={() => setLocale('te')} data-testid="switch-te">
        Telugu
      </button>
    </div>
  );
}

describe('LanguageContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('defaults to English and renders English translations', () => {
    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>
    );

    expect(screen.getByTestId('current-locale').textContent).toBe('en');
    expect(screen.getByTestId('translated-title').textContent).toContain('Advanced Multi-Class Skin & Lesion Analysis Powered by AI');
    expect(screen.getByTestId('languages-count').textContent).toBe('7');
  });

  test('switches language and translates properly', () => {
    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>
    );

    act(() => {
      fireEvent.click(screen.getByTestId('switch-hi'));
    });

    expect(screen.getByTestId('current-locale').textContent).toBe('hi');
    expect(screen.getByTestId('translated-title').textContent).toContain('उन्नत मल्टी-क्लास त्वचा एवं घाव विश्लेषण');
  });

  test('gracefully falls back for missing keys', () => {
    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>
    );

    expect(screen.getByTestId('fallback-test').textContent).toBe('non.existent.key');
  });
});
