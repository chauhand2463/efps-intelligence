import { config } from '../../config/index.js';

export interface GovtDealerInfo {
  full_name: string;
  mobile: string;
  address: string;
  district: string;
  taluka: string;
  village: string;
  shop_name: string;
  area_id: string;
}

const DISTRICTS = ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Junagadh', 'Gandhinagar'];
const TALUKAS: Record<string, string[]> = {
  'Ahmedabad': ['City', 'Daskroi', 'Sanand', 'Viramgam', 'Bavla'],
  'Surat': ['City', 'Choryasi', 'Olpad', 'Palsana', 'Mandvi'],
  'Vadodara': ['City', 'Padra', 'Savli', 'Dabhoi', 'Karjan'],
  'Rajkot': ['City', 'Kotda', 'Lodhika', 'Dhoraji', 'Jasdan'],
};
const VILLAGES = ['Rampura', 'Suryapur', 'Gandhinagar', 'Mahesana', 'Nadiad', 'Borsad', 'Petlad', 'Sojitra'];

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededChoice<T>(arr: readonly T[], seed: number): T {
  return arr[seed % arr.length]!;
}

async function mockLookup(fpsId: string): Promise<GovtDealerInfo> {
  const seed = hashCode(fpsId);
  const district = seededChoice(DISTRICTS, seed);
  const talukaList = TALUKAS[district] ?? ['City'];
  const taluka = seededChoice(talukaList, seed + 1);
  const village = seededChoice(VILLAGES, seed + 2);

  return {
    full_name: `Shop Owner ${fpsId}`,
    mobile: `98765${String(seed).slice(0, 5).padStart(5, '0')}`,
    address: `Shop No. ${seed % 999 + 1}, ${village} Road`,
    district,
    taluka,
    village,
    shop_name: `FPS ${fpsId} - ${village}`,
    area_id: `AREA-${String(seed % 999).padStart(3, '0')}`,
  };
}

export class GovtLookupService {
  async lookup(fpsId: string): Promise<{ exists: boolean; dealer: GovtDealerInfo | null }> {
    if (config.MOCK_GOVT_PORTAL) {
      const dealer = await mockLookup(fpsId);
      return { exists: true, dealer };
    }

    try {
      const data = await this.scrapeGovtPortal(fpsId);
      return { exists: true, dealer: data };
    } catch {
      return { exists: false, dealer: null };
    }
  }

  private async scrapeGovtPortal(_fpsId: string): Promise<GovtDealerInfo> {
    throw new Error('Real govt portal scraping requires credentials; use MOCK_GOVT_PORTAL=true for mock data');
  }
}

export const govtLookupService = new GovtLookupService();
