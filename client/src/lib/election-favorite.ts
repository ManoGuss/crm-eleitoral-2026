import { commercialMarkerForLead, commercialMarkerMeta } from "@shared/commercial";

export type FavoriteTracking = { status: string; lastContactAt: Date | null; followUpAt: Date | null } | null;

export function favoriteTrackingPresentation(favorite: FavoriteTracking) {
  if (!favorite) return null;
  const marker = commercialMarkerForLead(favorite.status, favorite.lastContactAt, favorite.followUpAt);
  return { marker, ...commercialMarkerMeta[marker] };
}
