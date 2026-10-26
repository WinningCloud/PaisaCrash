// One-line explanations for every bit of money jargon the game uses.
// Also read by the voice agent's explain_term tool.

export const GLOSSARY = {
  SIP: 'Systematic Investment Plan: you auto-invest a fixed amount in a mutual fund every month, rain or shine.',
  EMI: 'Equated Monthly Instalment: the fixed amount you pay every month to repay a loan, interest included.',
  CIBIL: 'Your credit score (300 to 900). Banks check it before giving you a loan. 750+ is good.',
  'Emergency fund': 'Cash kept aside only for emergencies. Aim for 3 to 6 months of your expenses.',
  FD: 'Fixed Deposit: you lock money in a bank for a fixed time and get a fixed interest rate.',
  PF: 'Provident Fund: part of your salary saved for retirement, with your employer adding a matching amount.',
  'Term insurance': 'Pure life cover: if you die, your family gets a big payout. Cheap when you are young.',
  'Health insurance': 'Pays your hospital bills. Without it, one surgery can wipe out years of savings.',
  '80C': 'Section 80C: invest up to ₹1.5 lakh in PF, ELSS, PPF and similar, and pay less income tax.',
  UPI: 'Unified Payments Interface: instant bank-to-bank payments by QR or phone number. You never need a PIN to receive money.',
  'Net worth': 'Everything you own minus everything you owe.',
  Surplus: 'What is left from your salary after expenses and EMIs. This is the money you get to plan.',
  Inflation: 'Prices rising every year (about 6% in this game), so the same rupee buys less over time.',
  'Credit card debt': 'Unpaid credit card bills. Interest runs at 36 to 42% a year, the most expensive debt there is.',
  Compounding: 'Your returns start earning returns. Small amounts invested early grow into big amounts later.',
}

export function explainTerm(term = '') {
  const key = Object.keys(GLOSSARY).find((k) => k.toLowerCase() === term.trim().toLowerCase())
  return key ? `${key}: ${GLOSSARY[key]}` : null
}
