/**
 * Financial Calculation Utilities for Real Estate Valuations
 */

export interface IncomeData {
  grossRent?: number;
  otherIncome?: number;
  vacancyRate?: number; // as percentage (e.g., 5 for 5%)
  [key: string]: number | undefined;
}

export interface ExpenseData {
  propertyTax?: number;
  insurance?: number;
  utilities?: number;
  maintenance?: number;
  propertyManagement?: number;
  reserves?: number;
  [key: string]: number | undefined;
}

export interface FinancingData {
  loanAmount?: number;
  interestRate?: number; // as percentage
  loanTerm?: number; // in years
  closingCosts?: number;
  [key: string]: number | undefined;
}

/**
 * Calculate Net Operating Income (NOI)
 */
export function calculateNOI(income: IncomeData, expenses: ExpenseData): number {
  // Calculate total gross income
  const totalIncome = Object.entries(income).reduce((sum, [key, value]) => {
    if (key === 'vacancyRate' || value === undefined) return sum;
    return sum + value;
  }, 0);

  // Apply vacancy rate
  const vacancyRate = income.vacancyRate || 0;
  const effectiveIncome = totalIncome * (1 - vacancyRate / 100);

  // Calculate total expenses
  const totalExpenses = Object.values(expenses).reduce<number>((sum, value) => {
    return sum + (value || 0);
  }, 0);

  return effectiveIncome - totalExpenses;
}

/**
 * Calculate Cap Rate
 */
export function calculateCapRate(noi: number, propertyValue: number): number {
  if (propertyValue === 0) return 0;
  return (noi / propertyValue) * 100;
}

/**
 * Calculate Property Value from NOI and Cap Rate
 */
export function calculatePropertyValue(noi: number, capRate: number): number {
  if (capRate === 0) return 0;
  return noi / (capRate / 100);
}

/**
 * Calculate Cash-on-Cash Return
 */
export function calculateCashOnCash(
  annualCashFlow: number,
  totalCashInvested: number
): number {
  if (totalCashInvested === 0) return 0;
  return (annualCashFlow / totalCashInvested) * 100;
}

/**
 * Calculate Monthly Mortgage Payment
 */
export function calculateMortgagePayment(
  principal: number,
  annualRate: number,
  years: number
): number {
  const monthlyRate = annualRate / 100 / 12;
  const numPayments = years * 12;

  if (monthlyRate === 0) return principal / numPayments;

  const payment =
    principal *
    (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
    (Math.pow(1 + monthlyRate, numPayments) - 1);

  return payment;
}

/**
 * Calculate Annual Debt Service
 */
export function calculateAnnualDebtService(financing: FinancingData): number {
  if (!financing.loanAmount || !financing.interestRate || !financing.loanTerm) {
    return 0;
  }

  const monthlyPayment = calculateMortgagePayment(
    financing.loanAmount,
    financing.interestRate,
    financing.loanTerm
  );

  return monthlyPayment * 12;
}

/**
 * Calculate Debt Service Coverage Ratio (DSCR)
 */
export function calculateDSCR(noi: number, annualDebtService: number): number {
  if (annualDebtService === 0) return 0;
  return noi / annualDebtService;
}

/**
 * Calculate Total Cash Required (Down Payment + Closing Costs)
 */
export function calculateTotalCashRequired(
  purchasePrice: number,
  downPaymentPercent: number,
  closingCosts: number = 0
): number {
  const downPayment = purchasePrice * (downPaymentPercent / 100);
  return downPayment + closingCosts;
}

/**
 * Calculate Annual Cash Flow
 */
export function calculateAnnualCashFlow(
  noi: number,
  annualDebtService: number
): number {
  return noi - annualDebtService;
}

/**
 * Calculate Gross Rent Multiplier (GRM)
 */
export function calculateGRM(propertyValue: number, annualGrossRent: number): number {
  if (annualGrossRent === 0) return 0;
  return propertyValue / annualGrossRent;
}

/**
 * Calculate Price Per Square Foot
 */
export function calculatePricePerSqFt(price: number, squareFeet: number): number {
  if (squareFeet === 0) return 0;
  return price / squareFeet;
}

/**
 * Calculate Price Per Unit (for multifamily)
 */
export function calculatePricePerUnit(price: number, units: number): number {
  if (units === 0) return 0;
  return price / units;
}

/**
 * Simple IRR calculation (approximate)
 * For more accurate IRR, use a financial library
 */
export function calculateSimpleIRR(
  initialInvestment: number,
  cashFlows: number[],
  years: number
): number {
  const totalReturn = cashFlows.reduce((sum, cf) => sum + cf, 0);
  const profit = totalReturn - initialInvestment;

  if (initialInvestment === 0 || years === 0) return 0;

  const annualReturn = profit / years;
  return (annualReturn / initialInvestment) * 100;
}

/**
 * Calculate Operating Expense Ratio
 */
export function calculateOperatingExpenseRatio(
  totalExpenses: number,
  grossIncome: number
): number {
  if (grossIncome === 0) return 0;
  return (totalExpenses / grossIncome) * 100;
}

/**
 * Calculate Break-Even Occupancy
 */
export function calculateBreakEvenOccupancy(
  operatingExpenses: number,
  debtService: number,
  grossPotentialRent: number
): number {
  if (grossPotentialRent === 0) return 0;
  return ((operatingExpenses + debtService) / grossPotentialRent) * 100;
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Calculate complete valuation metrics
 */
export function calculateValuationMetrics(
  income: IncomeData,
  expenses: ExpenseData,
  financing: FinancingData,
  purchasePrice: number,
  downPaymentPercent: number = 25
) {
  const noi = calculateNOI(income, expenses);
  const capRate = calculateCapRate(noi, purchasePrice);
  const annualDebtService = calculateAnnualDebtService(financing);
  const dscr = calculateDSCR(noi, annualDebtService);
  const annualCashFlow = calculateAnnualCashFlow(noi, annualDebtService);
  const totalCashRequired = calculateTotalCashRequired(
    purchasePrice,
    downPaymentPercent,
    financing.closingCosts || 0
  );
  const cashOnCash = calculateCashOnCash(annualCashFlow, totalCashRequired);

  return {
    noi,
    capRate,
    annualDebtService,
    dscr,
    annualCashFlow,
    totalCashRequired,
    cashOnCash,
  };
}
