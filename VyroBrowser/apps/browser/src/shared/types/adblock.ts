export interface AdblockStats {
  totalBlocked: number;
  trackersBlocked: number;
  sessionBlocked: number;
}

export interface SiteRule {
  origin: string;
  profileId: string;
  enabled: boolean;
}
