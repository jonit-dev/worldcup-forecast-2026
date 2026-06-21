import type { ReactNode } from 'react';
import {
  AR,
  AT,
  AU,
  BA,
  BE,
  BR,
  CA,
  CD,
  CH,
  CI,
  CO,
  CV,
  CW,
  CZ,
  DE,
  DZ,
  EC,
  EG,
  ES,
  FR,
  GB_ENG,
  GB_SCT,
  GH,
  HR,
  HT,
  IQ,
  IR,
  JO,
  JP,
  KR,
  MA,
  MX,
  NL,
  NO,
  NZ,
  PA,
  PT,
  PY,
  QA,
  SA,
  SE,
  SN,
  TN,
  TR,
  US,
  UY,
  UZ,
  ZA,
} from 'country-flag-icons/react/3x2';

type FlagComponent = typeof AR;

const FLAGS_BY_CODE: Record<string, FlagComponent> = {
  AR,
  AT,
  AU,
  BA,
  BE,
  BR,
  CA,
  CD,
  CH,
  CI,
  CO,
  CV,
  CW,
  CZ,
  DE,
  DZ,
  EC,
  EG,
  ES,
  FR,
  GB_ENG,
  GB_SCT,
  GH,
  HR,
  HT,
  IQ,
  IR,
  JO,
  JP,
  KR,
  MA,
  MX,
  NL,
  NO,
  NZ,
  PA,
  PT,
  PY,
  QA,
  SA,
  SE,
  SN,
  TN,
  TR,
  US,
  UY,
  UZ,
  ZA,
};

const COUNTRY_CODES: Record<string, string> = {
  algeria: 'DZ',
  argentina: 'AR',
  australia: 'AU',
  austria: 'AT',
  belgium: 'BE',
  'bosnia-herzegovina': 'BA',
  brazil: 'BR',
  'cabo-verde': 'CV',
  canada: 'CA',
  colombia: 'CO',
  'congo-dr': 'CD',
  croatia: 'HR',
  curacao: 'CW',
  czechia: 'CZ',
  ecuador: 'EC',
  egypt: 'EG',
  england: 'GB_ENG',
  france: 'FR',
  germany: 'DE',
  ghana: 'GH',
  haiti: 'HT',
  iran: 'IR',
  iraq: 'IQ',
  'ivory-coast': 'CI',
  japan: 'JP',
  jordan: 'JO',
  mexico: 'MX',
  morocco: 'MA',
  netherlands: 'NL',
  'new-zealand': 'NZ',
  norway: 'NO',
  panama: 'PA',
  paraguay: 'PY',
  portugal: 'PT',
  qatar: 'QA',
  'saudi-arabia': 'SA',
  scotland: 'GB_SCT',
  senegal: 'SN',
  'south-africa': 'ZA',
  'south-korea': 'KR',
  spain: 'ES',
  sweden: 'SE',
  switzerland: 'CH',
  tunisia: 'TN',
  turkiye: 'TR',
  usa: 'US',
  uruguay: 'UY',
  uzbekistan: 'UZ',
};

export function teamFlagCode(teamId: string): string | undefined {
  return COUNTRY_CODES[teamId];
}

export function TeamFlag({
  className = '',
  teamId,
  title,
}: {
  className?: string;
  teamId: string;
  title?: string;
}) {
  const code = teamFlagCode(teamId);
  const Flag = code ? FLAGS_BY_CODE[code] : undefined;

  if (!Flag) {
    return (
      <span aria-hidden="true" className={`flag-fallback ${className}`.trim()}>
        FIFA
      </span>
    );
  }

  return (
    <Flag
      aria-label={title ? `${title} flag` : undefined}
      className={`flag-icon ${className}`.trim()}
      role={title ? 'img' : undefined}
    />
  );
}

export function teamLabel(_teamId: string, teamName: string): string {
  return teamName;
}

export function teamWithFlag(teamId: string, teamName: string): ReactNode {
  return (
    <span className="team-inline">
      <TeamFlag teamId={teamId} title={teamName} />
      <span>{teamName}</span>
    </span>
  );
}
