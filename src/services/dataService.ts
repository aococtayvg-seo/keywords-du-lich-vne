import Papa from 'papaparse';

export interface KeywordData {
  keyword: string;
  avgSearchVolume: number;
  trend: number;
  cpcLow: number;
  cpcHigh: number;
  competition: number;
  monthlyData: { month: string; volume: number }[];
  upcomingGrowth: number; // Calculated growth for the coming months
}

const CSV_URL = 'https://docs.google.com/spreadsheets/d/1XEuoeyhxAJlDHZb-kvC6CGhdMBPKEVoe-2-wmbq3ydg/gviz/tq?tqx=out:csv&sheet=03-2026';

export const fetchKeywordData = async (): Promise<KeywordData[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(CSV_URL, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const parsedData = results.data.map((row: any) => {
            const monthlyData: { month: string; volume: number }[] = [];
            
            // Extract monthly data
            for (const key in row) {
              if (key.startsWith('Search Volume (') && key !== 'Search Volume (Average)') {
                const monthMatch = key.match(/Search Volume \((.*?)\)/);
                if (monthMatch && monthMatch[1]) {
                  const volumeStr = row[key] ? row[key].replace(/,/g, '') : '0';
                  monthlyData.push({
                    month: monthMatch[1],
                    volume: parseInt(volumeStr, 10) || 0
                  });
                }
              }
            }

            // Calculate upcoming growth (e.g., compare Mar-May 2025 vs Dec 2025-Feb 2026)
            // Or simply look at the historical trend for the upcoming months (April, May, June)
            // Let's find the volumes for April, May, June 2025
            const upcomingMonths = ['Apr 2025', 'May 2025', 'Jun 2025'];
            const recentMonths = ['Nov 2025', 'Dec 2025', 'Jan 2026'];
            
            let upcomingVolume = 0;
            let recentVolume = 0;
            
            monthlyData.forEach(d => {
              if (upcomingMonths.includes(d.month)) upcomingVolume += d.volume;
              if (recentMonths.includes(d.month)) recentVolume += d.volume;
            });

            // Growth percentage
            const upcomingGrowth = recentVolume > 0 
              ? ((upcomingVolume - recentVolume) / recentVolume) * 100 
              : 0;

            return {
              keyword: row['Keywords'] || '',
              avgSearchVolume: parseInt((row['Search Volume (Average)'] || '0').replace(/,/g, ''), 10),
              trend: parseFloat(row['Trend'] || '0'),
              cpcLow: parseFloat(row['Top of Page Bid (Low Range) (USD)'] || '0'),
              cpcHigh: parseFloat(row['Top of Page Bid (High Range) (USD)'] || '0'),
              competition: parseInt(row['Competition'] || '0', 10),
              monthlyData,
              upcomingGrowth
            };
          });
          
          // Filter out rows without a keyword
          resolve(parsedData.filter(d => d.keyword));
        } catch (err) {
          reject(err);
        }
      },
      error: (error) => {
        reject(error);
      }
    });
  });
};
