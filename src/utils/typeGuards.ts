import { VALID_URLS } from "./constants";

export function isValidCapitalOneUrl(url: string | undefined): boolean {
  if (!url) return false;
  // Accept any path on capitaloneoffers.com (URL can change with site redesigns)
  if (url.startsWith('https://capitaloneoffers.com/')) return true;
  // Keep legacy explicit list as secondary check
  return VALID_URLS.some((validUrl) => url.startsWith(validUrl));
}
