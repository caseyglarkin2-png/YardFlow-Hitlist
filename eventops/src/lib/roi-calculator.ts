interface RoiCalculationInput {
  facilityCount?: number;
  operationalScale?: string;
  companySize?: string;
  persona: string;
  industry?: string;
}

interface RoiCalculationResult {
  annualSavings: number;
  paybackPeriod: number; // months
  assumptions: {
    avgShipmentsPerFacility?: number;
    avgCostPerShipment?: number;
    savingsPercentage?: number;
    implementationCost?: number;
    [key: string]: number | string | undefined;
  };
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  methodology: string;
}

// Export type aliases for external use
export type RoiInput = RoiCalculationInput;
export type RoiResult = RoiCalculationResult;

/**
 * Calculate ROI based on company operational data
 * This is a simplified calculator - ideally would integrate with external ROI calculator API
 */
export async function calculateRoi(input: RoiCalculationInput): Promise<RoiCalculationResult> {
  const {
    facilityCount = 1,
    operationalScale = 'REGIONAL',
    companySize = 'MEDIUM',
    persona,
  } = input;

  // Base assumptions based on operational scale
  let baseShipmentsPerDay = 100;
  const avgCostPerShipment = 12;
  let savingsPercentage = 0.15; // 15% savings on average

  // Adjust based on operational scale
  if (operationalScale.toLowerCase().includes('global') || facilityCount > 100) {
    baseShipmentsPerDay = 1000;
    savingsPercentage = 0.2; // Larger operations have more savings potential
  } else if (operationalScale.toLowerCase().includes('national') || facilityCount > 25) {
    baseShipmentsPerDay = 500;
    savingsPercentage = 0.18;
  } else if (operationalScale.toLowerCase().includes('regional') || facilityCount > 5) {
    baseShipmentsPerDay = 200;
    savingsPercentage = 0.15;
  }

  // Adjust based on persona (different personas realize different value)
  if (persona.toLowerCase().includes('procurement')) {
    savingsPercentage += 0.05; // Procurement can negotiate better rates
  } else if (persona.toLowerCase().includes('operations')) {
    savingsPercentage += 0.03; // Ops can optimize processes
  } else if (persona.toLowerCase().includes('exec')) {
    savingsPercentage += 0.02; // Execs drive org-wide adoption
  }

  // Calculate annual volume
  const totalFacilities = Math.max(facilityCount, 1);
  const annualShipments = baseShipmentsPerDay * 250 * totalFacilities; // 250 business days

  // Calculate savings
  const currentAnnualCost = annualShipments * avgCostPerShipment;
  const annualSavings = currentAnnualCost * savingsPercentage;

  // Calculate implementation cost (scales with facilities)
  const implementationCost = 50000 + totalFacilities * 5000;

  // Payback period in months
  const monthlySavings = annualSavings / 12;
  const paybackPeriod = Math.ceil(implementationCost / monthlySavings);

  // Confidence based on data availability
  let confidence: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
  if (facilityCount && operationalScale && companySize) {
    confidence = 'HIGH';
  } else if (!facilityCount) {
    confidence = 'LOW';
  }

  return {
    annualSavings: Math.round(annualSavings),
    paybackPeriod,
    assumptions: {
      avgShipmentsPerFacility: baseShipmentsPerDay * 250,
      avgCostPerShipment,
      savingsPercentage: Math.round(savingsPercentage * 100) / 100,
      implementationCost,
      totalFacilities,
      annualShipments,
    },
    confidence,
    methodology: `Based on ${totalFacilities} facilities processing ~${baseShipmentsPerDay} shipments/day at $${avgCostPerShipment}/shipment, with ${Math.round(savingsPercentage * 100)}% efficiency improvement.`,
  };
}

/**
 * Format ROI calculation for display
 */
export function formatRoiSummary(roi: RoiCalculationResult): string {
  const savingsFormatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(roi.annualSavings);

  return `Estimated annual savings: ${savingsFormatted} with ${roi.paybackPeriod}-month payback period`;
}

/**
 * Integration point for external ROI calculator
 * Currently returns mock data, but can be updated to call actual API:
 * https://flow-state-klbt-fq6evafym-caseys-projects-2a50de81.vercel.app/roi/
 */
export async function calculateRoiViaExternalApi(
  input: RoiCalculationInput
): Promise<RoiCalculationResult> {
  // TODO: Integrate with actual YardFlow ROI calculator
  // For now, use internal calculation
  //
  // Example integration:
  // const response = await fetch('https://flow-state-klbt-fq6evafym-caseys-projects-2a50de81.vercel.app/roi/api/calculate', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(input)
  // });
  // return response.json();

  return calculateRoi(input);
}
