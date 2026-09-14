import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  SettingsAccountPanel,
  SettingsGeneralPanel,
  SettingsSocialPanel,
} from '@/features/settings/components/SettingsPanels';
import {
  SETTINGS_SEGMENTED_OPTION,
  SETTINGS_SEGMENTED_TRACK,
} from '@/features/settings/components/settingsSegmented';
import { SETTINGS_COPY } from '@/features/settings/copy/settingsCopy';
import type { SettingsTab } from '@/features/settings/lib/openSettings';

interface GlobalSettingsContentProps {
  variant?: 'modal' | 'floating';
  initialTab?: SettingsTab;
}

/** Settings body: compact tabs so the floating panel stays scannable. */
export function GlobalSettingsContent({
  variant = 'modal',
  initialTab = 'general',
}: GlobalSettingsContentProps) {
  const [tab, setTab] = useState<SettingsTab>(initialTab);
  const isFloating = variant === 'floating';

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => setTab(value as SettingsTab)}
      className={cn(isFloating ? 'px-4 pb-4 pt-2' : 'py-2')}
    >
      <TabsList className={cn(SETTINGS_SEGMENTED_TRACK, 'grid-cols-3')}>
        <TabsTrigger value="general" className={cn(SETTINGS_SEGMENTED_OPTION, 'shadow-none data-[state=active]:shadow-none sm:text-sm')}>
          {SETTINGS_COPY.tabs.general}
        </TabsTrigger>
        <TabsTrigger value="social" className={cn(SETTINGS_SEGMENTED_OPTION, 'shadow-none data-[state=active]:shadow-none sm:text-sm')}>
          {SETTINGS_COPY.tabs.social}
        </TabsTrigger>
        <TabsTrigger value="account" className={cn(SETTINGS_SEGMENTED_OPTION, 'shadow-none data-[state=active]:shadow-none sm:text-sm')}>
          {SETTINGS_COPY.tabs.account}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="general" className="mt-4 focus-visible:ring-0">
        <SettingsGeneralPanel />
      </TabsContent>
      <TabsContent value="social" className="mt-4 focus-visible:ring-0">
        <SettingsSocialPanel />
      </TabsContent>
      <TabsContent value="account" className="mt-4 focus-visible:ring-0">
        <SettingsAccountPanel />
      </TabsContent>
    </Tabs>
  );
}
