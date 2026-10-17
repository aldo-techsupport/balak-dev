export interface RankTierDefinition {
  tier: string;
  name: string;
  divisions: string[];
  starsPerDivision: number;
  icon: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

export const RANK_TIERS: RankTierDefinition[] = [
  {
    tier: 'WARRIOR',
    name: 'Warrior',
    divisions: ['III', 'II', 'I'],
    starsPerDivision: 3,
    icon: '🛡️',
    badgeBg: 'bg-amber-950/40',
    badgeText: 'text-amber-500',
    badgeBorder: 'border-amber-700/50',
  },
  {
    tier: 'ELITE',
    name: 'Elite',
    divisions: ['IV', 'III', 'II', 'I'],
    starsPerDivision: 3,
    icon: '⚔️',
    badgeBg: 'bg-slate-800/60',
    badgeText: 'text-slate-300',
    badgeBorder: 'border-slate-600/50',
  },
  {
    tier: 'MASTER',
    name: 'Master',
    divisions: ['IV', 'III', 'II', 'I'],
    starsPerDivision: 4,
    icon: '👑',
    badgeBg: 'bg-yellow-950/40',
    badgeText: 'text-yellow-400',
    badgeBorder: 'border-yellow-600/50',
  },
  {
    tier: 'GRANDMASTER',
    name: 'Grandmaster',
    divisions: ['V', 'IV', 'III', 'II', 'I'],
    starsPerDivision: 5,
    icon: '🏆',
    badgeBg: 'bg-emerald-950/40',
    badgeText: 'text-emerald-400',
    badgeBorder: 'border-emerald-600/50',
  },
  {
    tier: 'EPIC',
    name: 'Epic',
    divisions: ['V', 'IV', 'III', 'II', 'I'],
    starsPerDivision: 5,
    icon: '🐉',
    badgeBg: 'bg-cyan-950/40',
    badgeText: 'text-cyan-400',
    badgeBorder: 'border-cyan-600/50',
  },
  {
    tier: 'LEGEND',
    name: 'Legend',
    divisions: ['V', 'IV', 'III', 'II', 'I'],
    starsPerDivision: 5,
    icon: '🌟',
    badgeBg: 'bg-purple-950/40',
    badgeText: 'text-purple-400',
    badgeBorder: 'border-purple-600/50',
  },
  {
    tier: 'MYTHIC',
    name: 'Mythic',
    divisions: ['Mythic'],
    starsPerDivision: 999999, // Endless stars in Mythic
    icon: '🌌',
    badgeBg: 'bg-rose-950/40',
    badgeText: 'text-rose-400',
    badgeBorder: 'border-rose-600/50',
  },
];

export interface RankInfo {
  tier: string;
  name: string;
  division: string;
  stars: number;
  maxStars: number;
  icon: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  title: string;
  formatted: string;
  starsDisplay: string;
  subTitle?: string;
}

export function getRankInfo(
  tier: string = 'WARRIOR',
  division: string = 'III',
  stars: number = 0
): RankInfo {
  const normTier = (tier || 'WARRIOR').toUpperCase();
  const tierDef =
    RANK_TIERS.find((t) => t.tier === normTier) || RANK_TIERS[0];

  const maxStars = tierDef.tier === 'MYTHIC' ? 999999 : tierDef.starsPerDivision;
  const safeStars = Math.max(0, stars);

  let title = `${tierDef.name} ${division}`;
  let subTitle = '';

  if (tierDef.tier === 'MYTHIC') {
    if (safeStars >= 100) {
      subTitle = 'Mythical Immortal';
      title = `Mythical Immortal (${safeStars}★)`;
    } else if (safeStars >= 50) {
      subTitle = 'Mythical Glory';
      title = `Mythical Glory (${safeStars}★)`;
    } else if (safeStars >= 25) {
      subTitle = 'Mythical Honor';
      title = `Mythical Honor (${safeStars}★)`;
    } else {
      subTitle = 'Mythic';
      title = `Mythic (${safeStars}★)`;
    }
  }

  // Generate star string
  let starsDisplay = '';
  if (tierDef.tier === 'MYTHIC') {
    starsDisplay = `${safeStars}★`;
  } else {
    const full = '★'.repeat(safeStars);
    const empty = '☆'.repeat(Math.max(0, tierDef.starsPerDivision - safeStars));
    starsDisplay = `${full}${empty}`;
  }

  const formatted =
    tierDef.tier === 'MYTHIC'
      ? `${title}`
      : `${tierDef.name} ${division} (${safeStars}/${tierDef.starsPerDivision}★)`;

  return {
    tier: tierDef.tier,
    name: tierDef.name,
    division,
    stars: safeStars,
    maxStars,
    icon: tierDef.icon,
    badgeBg: tierDef.badgeBg,
    badgeText: tierDef.badgeText,
    badgeBorder: tierDef.badgeBorder,
    title,
    formatted,
    starsDisplay,
    subTitle,
  };
}

export interface RankCalculationResult {
  newTier: string;
  newDivision: string;
  newStars: number;
  starChange: number;
  isPromotion: boolean;
  isDemotion: boolean;
  rankInfo: RankInfo;
}

export function calculateRankResult(
  currentTier: string = 'WARRIOR',
  currentDivision: string = 'III',
  currentStars: number = 0,
  isWinner: boolean
): RankCalculationResult {
  const normTier = (currentTier || 'WARRIOR').toUpperCase();
  let tierIdx = RANK_TIERS.findIndex((t) => t.tier === normTier);
  if (tierIdx === -1) tierIdx = 0;

  let tierDef = RANK_TIERS[tierIdx];
  let divIdx = tierDef.divisions.indexOf(currentDivision);
  if (divIdx === -1) divIdx = 0;

  let stars = Math.max(0, currentStars);
  let starChange = 0;
  let isPromotion = false;
  let isDemotion = false;

  if (isWinner) {
    starChange = 1;
    if (tierDef.tier === 'MYTHIC') {
      stars += 1;
    } else {
      stars += 1;
      if (stars >= tierDef.starsPerDivision) {
        // Check if there is next division in current tier
        if (divIdx < tierDef.divisions.length - 1) {
          divIdx += 1;
          stars = 0;
          isPromotion = true;
        } else {
          // Promote to next tier
          if (tierIdx < RANK_TIERS.length - 1) {
            tierIdx += 1;
            tierDef = RANK_TIERS[tierIdx];
            divIdx = 0;
            stars = 0;
            isPromotion = true;
          } else {
            // Already max tier (Mythic)
            stars = 0;
          }
        }
      }
    }
  } else {
    // Loss — Every loss reduces 1 star across all tiers (no star protection)
    if (tierDef.tier === 'MYTHIC') {
      if (stars > 0) {
        stars -= 1;
        starChange = -1;
      } else {
        // Floor at 0 stars in Mythic
        starChange = 0;
      }
    } else {
      if (stars > 0) {
        stars -= 1;
        starChange = -1;
      } else {
        // Stars are 0 -> Drop division
        if (divIdx > 0) {
          divIdx -= 1;
          stars = tierDef.starsPerDivision - 1;
          isDemotion = true;
          starChange = -1;
        } else {
          // At division 0 (e.g. Master IV with 0 stars)
          if (tierIdx > 0) {
            // Drop to lower tier (e.g. Master IV 0★ -> Elite I max★)
            tierIdx -= 1;
            tierDef = RANK_TIERS[tierIdx];
            divIdx = tierDef.divisions.length - 1;
            stars = tierDef.starsPerDivision - 1;
            isDemotion = true;
            starChange = -1;
          } else {
            // Floor at lowest rank (Warrior III 0★)
            stars = 0;
            starChange = 0;
          }
        }
      }
    }
  }

  const finalTier = tierDef.tier;
  const finalDivision = tierDef.divisions[divIdx] || tierDef.divisions[0];
  const rankInfo = getRankInfo(finalTier, finalDivision, stars);

  return {
    newTier: finalTier,
    newDivision: finalDivision,
    newStars: stars,
    starChange,
    isPromotion,
    isDemotion,
    rankInfo,
  };
}
