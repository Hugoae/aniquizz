import { useTranslation } from 'react-i18next';
import { LanguageSwitch } from '@/features/i18n/LanguageSwitch';

export function SettingsLanguageSection() {
  const { t } = useTranslation('common');

  return (
    <section aria-labelledby="settings-language-heading">
      <h3 id="settings-language-heading" className="text-sm font-bold text-foreground">
        {t('languageLabel')}
      </h3>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{t('languageHint')}</p>
      <div className="mt-3">
        <LanguageSwitch />
      </div>
    </section>
  );
}
