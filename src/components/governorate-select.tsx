'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/components/language-provider';

/**
 * Syria's 14 governorates. `value` is the stable English name stored in
 * Order.shippingCity / Address.city (admins and couriers read it); the label is
 * translated (Arabic names in the Arabic UI) via `governorate.<key>`.
 */
export const SYRIAN_GOVERNORATES = [
  { value: 'Damascus', key: 'damascus', aliases: ['dimashq', 'دمشق', 'الشام'] },
  { value: 'Rif Dimashq', key: 'rifDimashq', aliases: ['rif dimashq', 'rural damascus', 'damascus countryside', 'ريف دمشق'] },
  { value: 'Aleppo', key: 'aleppo', aliases: ['halab', 'حلب'] },
  { value: 'Homs', key: 'homs', aliases: ['حمص'] },
  { value: 'Hama', key: 'hama', aliases: ['hamah', 'حماة', 'حماه'] },
  { value: 'Latakia', key: 'latakia', aliases: ['lattakia', 'al-ladhiqiyah', 'اللاذقية'] },
  { value: 'Tartus', key: 'tartus', aliases: ['tartous', 'طرطوس'] },
  { value: 'Idlib', key: 'idlib', aliases: ['idleb', 'إدلب', 'ادلب'] },
  { value: 'Daraa', key: 'daraa', aliases: ['deraa', 'dara', 'درعا'] },
  { value: 'As-Suwayda', key: 'suwayda', aliases: ['suwayda', 'sweida', 'al-suwayda', 'as suwayda', 'السويداء'] },
  { value: 'Quneitra', key: 'quneitra', aliases: ['al-qunaytirah', 'القنيطرة'] },
  { value: 'Deir ez-Zor', key: 'deirEzZor', aliases: ['deir ezzor', 'deir ez zor', 'deir al-zor', 'deir el-zor', 'dayr az-zawr', 'دير الزور'] },
  { value: 'Raqqa', key: 'raqqa', aliases: ['raqqah', 'ar-raqqah', 'الرقة'] },
  { value: 'Al-Hasakah', key: 'hasakah', aliases: ['hasakah', 'hasaka', 'al hasakah', 'al-hasaka', 'الحسكة'] },
] as const;

/** Default country for new addresses (still editable). */
export const DEFAULT_COUNTRY = 'Syria';

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

/** Map a stored / legacy free-text city to a governorate value, or '' when it isn't one. */
export function matchGovernorate(city: string | null | undefined): string {
  if (!city) return '';
  const c = norm(city);
  const hit = SYRIAN_GOVERNORATES.find(
    (g) => norm(g.value) === c || (g.aliases as readonly string[]).some((a) => norm(a) === c)
  );
  return hit ? hit.value : '';
}

/** True for an empty country or any spelling of Syria — the governorate list applies. */
export function isSyria(country: string | null | undefined): boolean {
  const c = norm(country || '');
  return !c || ['syria', 'sy', 'syrian arab republic', 'سوريا', 'سورية', 'الجمهورية العربية السورية'].includes(c);
}

/** Translated display name for a stored city (falls back to the raw text). */
export function useGovernorateLabel() {
  const { t } = useTranslation();
  return React.useCallback(
    (city: string | null | undefined) => {
      const value = matchGovernorate(city);
      const g = SYRIAN_GOVERNORATES.find((x) => x.value === value);
      return g ? t(`governorate.${g.key}`, g.value) : city || '';
    },
    [t]
  );
}

type GovernorateSelectProps = Omit<React.ComponentPropsWithoutRef<'select'>, 'children'>;

/**
 * Native <select> of the 14 governorates, styled like <Input>. Native keeps it
 * accessible, works with react-hook-form's `register`, and uses the phone's
 * own picker on mobile.
 */
export const GovernorateSelect = React.forwardRef<HTMLSelectElement, GovernorateSelectProps>(
  ({ className, ...props }, ref) => {
    const { t } = useTranslation();
    return (
      <select
        ref={ref}
        className={cn(
          'flex h-10 w-full border-[3px] border-foreground bg-background px-3 py-1 text-base font-mono shadow-[3px_3px_0_0_hsl(var(--foreground))] ring-offset-background focus-visible:outline-none focus-visible:bg-accent focus-visible:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          className
        )}
        {...props}
      >
        <option value="">{t('governorate.placeholder', 'Select your governorate')}</option>
        {SYRIAN_GOVERNORATES.map((g) => (
          <option key={g.value} value={g.value}>
            {t(`governorate.${g.key}`, g.value)}
          </option>
        ))}
      </select>
    );
  }
);
GovernorateSelect.displayName = 'GovernorateSelect';
