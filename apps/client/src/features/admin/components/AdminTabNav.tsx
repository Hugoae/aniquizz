import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ADMIN_COPY } from '@/features/admin/copy/adminCopy';
import { formatRepair } from '@/features/admin/adminDesk';
import { visibleAdminGroups } from '@/features/admin/adminNavigation';

export function AdminTabNav({
  canManage,
  isDev,
  repairCount,
  repairTruncated,
}: {
  canManage: boolean;
  isDev: boolean;
  repairCount: number | null;
  repairTruncated: boolean;
}) {
  const groups = visibleAdminGroups({ canManage, isDev });
  const repairLabel =
    repairCount !== null && repairCount > 0 ? formatRepair(repairCount, repairTruncated) : null;

  return (
    <nav aria-label={ADMIN_COPY.navLabel} className="mb-4 flex flex-col gap-2">
      {groups.map((group) => (
        <div key={group.id} className="flex flex-wrap items-center gap-2">
          <span className="w-28 shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {ADMIN_COPY.groups[group.id]}
          </span>
          <TabsList className="h-auto min-h-9 flex-wrap justify-start">
            {group.tabs.map((tab) => (
              <TabsTrigger
                key={tab}
                className="min-h-9"
                value={tab}
                aria-label={
                  tab === 'catalogue' && repairLabel
                    ? `${ADMIN_COPY.tabs.catalogue}, ${repairLabel}`
                    : undefined
                }
              >
                {ADMIN_COPY.tabs[tab]}
                {tab === 'catalogue' && repairLabel && (
                  <span className="ml-1.5 rounded-full bg-warning/20 px-1.5 text-[10px] font-bold text-warning">
                    {repairTruncated ? `${repairCount}+` : repairCount}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      ))}
    </nav>
  );
}
