import type { GameConfig } from '@aniquizz/shared';

import { buildSoloLobbyRecapGroups } from '@/features/hub/components/lobby/soloLobbyRecapGroups';

import { SettingChip } from '@/features/hub/components/SettingChip';



interface SoloLobbyRecapProps {

  config: GameConfig;

}



function RecapRow({

  label,

  chips,

}: {

  label: string;

  chips: ReturnType<typeof buildSoloLobbyRecapGroups>[number]['chips'];

}) {

  return (

    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">

      <span className="shrink-0 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground sm:w-20">

        {label}

      </span>

      <div className="flex flex-wrap gap-1.5">

        {chips.map((chip) => (

          <SettingChip key={chip.key} {...chip} hideLabel />

        ))}

      </div>

    </div>

  );

}



/** Grouped settings recap for the solo pre-game screen (Option A). */

export function SoloLobbyRecap({ config }: SoloLobbyRecapProps) {

  const groups = buildSoloLobbyRecapGroups(config);



  return (

    <div

      className="space-y-3 rounded-xl border border-border/60 bg-card/40 p-4"

      aria-label="Récapitulatif de la partie"

    >

      {groups.map((group) => (

        <RecapRow key={group.id} label={group.label} chips={group.chips} />

      ))}

    </div>

  );

}

