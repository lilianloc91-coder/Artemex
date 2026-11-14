import { describe, expect, it } from 'vitest';
import { createTranslations, validLanguage } from '@/i18n';

describe('supported languages', () => {
 it.each(['es', 'en', 'zh-CN'] as const)('accepts %s', language => expect(validLanguage(language)).toBe(language));
 it('falls back to Spanish for an unsupported language', () => expect(validLanguage('fr')).toBe('es'));
 it('keeps unknown user content unchanged', async () => {
  const instance = createTranslations();
  await instance.changeLanguage('zh-CN');
  expect(instance.t('Mi relato personal 123')).toBe('Mi relato personal 123');
 });
 it('isolates language between render instances', async () => {
  const a = createTranslations(); const b = createTranslations();
  await a.changeLanguage('en');
  expect(a.language).toBe('en'); expect(b.language).toBe('es');
 });
});
