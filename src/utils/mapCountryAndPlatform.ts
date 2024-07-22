import { countryMapping, platformMapping } from "../constants";

export function mapCountryAndPlatform(record: { country: string, platform: string }): { country: string, platform: string } {
  let mappedCountry = record.country.trim();

  const standardPlatform = record.platform.toLowerCase().replace(/^\w/, c => c.toUpperCase());
  const mappedPlatform = platformMapping[standardPlatform];

  // Handle specific region names in the input data
  if (record.country.includes('河内')) {
    mappedCountry = '越南河内';
  } else if (record.country.includes('胡志明')) {
    mappedCountry = '越南胡志明';
  }

  // Use the countryMapping object for mapping
  Object.keys(countryMapping).forEach((region) => {
    if (mappedCountry.includes(region)) {
      mappedCountry = countryMapping[region as keyof typeof countryMapping];
    }
  });

  return { country: mappedCountry, platform: mappedPlatform ? mappedPlatform : record.platform };
}

export function mapCountry(record: { country: string }): { country: string } {
  let mappedCountry = record.country.trim();

  // Handle specific region names in the input data
  if (record.country.includes('河内')) {
    mappedCountry = '越南河内';
  } else if (record.country.includes('胡志明')) {
    mappedCountry = '越南胡志明';
  } else if (record.country.includes('菲律宾')) {
    mappedCountry = '菲律宾';
  } else if (record.country.includes('泰国')) {
    mappedCountry = '泰国';
  } else if (record.country.includes('马来西亚')) {
    mappedCountry = '马来西亚';
  } else if (record.country.includes('印尼')) {
    mappedCountry = '印尼';
  }

  // Use the countryMapping object for mapping
  Object.keys(countryMapping).forEach((region) => {
    if (mappedCountry.includes(region)) {
      mappedCountry = countryMapping[region as keyof typeof countryMapping];
    }
  });

  return { country: mappedCountry };
}