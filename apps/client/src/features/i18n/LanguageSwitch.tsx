import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { AppLocale } from '@aniquizz/shared';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { LocaleFlag } from '@/features/i18n/LocaleFlag';
import { useLocale } from '@/features/i18n/LocaleContext';

const LOCALES: AppLocale[] = ['fr', 'en'];

export function LanguageSwitch() {
  const { locale, setLocale } = useLocale();
  const { t } = useTranslation('common');
  const currentName = t(`languageName.${locale}`);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        type="button"
        aria-label={`${t('languageLabel')}: ${currentName}`}
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background/80 px-2 text-xs font-semibold tracking-wide text-foreground outline-none transition-colors hover:bg-secondary/70 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <LocaleFlag code={locale} />
        <span>{t(`languageShort.${locale}`)}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[7.5rem]">
        {LOCALES.map((code) => {
          const selected = locale === code;
          return (
            <DropdownMenuItem
              key={code}
              role="menuitemradio"
              aria-checked={selected}
              onSelect={() => setLocale(code)}
              className={cn(
                'gap-2.5 font-semibold tracking-wide',
                selected && 'bg-secondary text-foreground focus:bg-secondary',
              )}
            >
              <LocaleFlag code={code} />
              <span>{t(`languageShort.${code}`)}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
