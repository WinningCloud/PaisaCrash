import { amt, inr, luck, r500 } from './helpers.js'

const tipWins = (s) => luck(s, 'stock-tip') < 0.2
const bonusOf = (s) => r500(s.monthlyIncome * 1.5)
const giftOf = (s) => amt(s, 25000)
const endowmentPremium = (s) => (s.flags.hasEndowment ? 4000 : 0) + (s.flags.hasMoneyBack ? 3500 : 0)
// New tax regime: salaried income up to ₹12.75 lakh a year pays no tax
const taxFree = (s) => s.monthlyIncome * 12 <= 1275000
const tdsOf = (s) => r500(amt(s, 7000) * 12 * 0.1)

function tipChoice(id, label, stake) {
  return {
    id,
    label,
    hint: 'Your friend already doubled his money!',
    effects: (s) => (tipWins(s)
      ? { cash: Math.round(stake(s) * 0.9), happiness: 10 }
      : { cash: -Math.round(stake(s) * 0.85), stress: 12, happiness: -8 }),
    setFlags: ['triedStockTip'],
    outcomeText: (s) => (tipWins(s)
      ? `Unbelievable: it actually ran up and you sold in time, ${inr(Math.round(stake(s) * 0.9))} profit. Don't let luck teach you the wrong lesson.`
      : 'The "operator" sold at the top. The stock fell 85% in a week and the group went very quiet.'),
    lesson: 'Pump-and-dump groups need people like you to buy so they can sell. If a stock tip is free, you are the product.',
  }
}

export default [
  {
    id: 'sip-start',
    title: 'The SIP Talk',
    emoji: '🌱',
    category: 'investing',
    minYear: 1,
    maxYear: 3,
    baseWeight: 3,
    requires: { notFlags: ['startedSipEarly'] },
    narration: 'Your colleague Priya shows you her mutual fund app: a ₹2,000 monthly SIP since college is now worth ₹1.6 lakh. "Just start," she says. "Even small."',
    choices: [
      {
        id: 'start',
        label: 'Start a SIP in an index fund today',
        hint: (s) => `Seed it with ${inr(amt(s, 5000))}, then use the SIP slider`,
        effects: (s) => ({ cash: -amt(s, 5000), investments: amt(s, 5000), happiness: 3 }),
        setFlags: ['startedSipEarly'],
        schedule: [{ eventId: 'compounding-bonus', atYear: 8 }],
        outcomeText: 'First instalment invested. Keep the SIP slider above zero on your budget and let time do the heavy lifting.',
        lesson: 'Starting at 22 instead of 30 can nearly double what you have at 60. Time is the secret ingredient.',
      },
      {
        id: 'fd',
        label: 'Put it in a Fixed Deposit instead',
        hint: 'Safe, about 7%',
        effects: { stress: -2 },
        outcomeText: 'Your money is safe in an FD. After tax and 6% inflation, it barely grows.',
        lesson: 'FDs are great for your emergency fund, not for 10-year goals. After tax and inflation they barely beat zero.',
      },
      {
        id: 'later',
        label: 'Later, when I earn more',
        hint: 'No rush, right?',
        effects: { happiness: 1 },
        setFlags: ['delayedSip'],
        outcomeText: '"Later" is the most expensive word in personal finance. But sure.',
        lesson: 'Waiting for the "right time" to invest usually costs more than any market crash.',
      },
    ],
  },
  {
    id: 'compounding-bonus',
    title: 'Compounding Kicks In',
    emoji: '🚀',
    category: 'investing',
    scheduledOnly: true,
    requires: { flags: ['startedSipEarly'], minInvestments: 1 },
    narration: (s) => (s.flags.hasSIP
      ? `That SIP you started at 22 just hit a milestone: ${inr(s.investments)}. Your returns are now earning returns of their own.`
      : `That SIP you started at 22? You stopped feeding it along the way. It is worth ${inr(s.investments)}, far less than it could have been.`),
    choices: [
      {
        id: 'stay',
        label: 'Stay invested, let it snowball',
        hint: 'Do nothing. Seriously.',
        effects: (s) => ({ investments: Math.round(s.investments * (s.flags.hasSIP ? 0.12 : 0.04)), happiness: 8 }),
        outcomeText: (s) => (s.flags.hasSIP
          ? 'You leave it alone and the snowball keeps rolling. Early starters get this bonus for free.'
          : 'It still grows, just slower. Restart the SIP on your budget screen to get the snowball rolling again.'),
        lesson: 'Compounding is slow for years and then suddenly huge. The trick is simply not to interrupt it.',
      },
      {
        id: 'withdraw',
        label: 'Cash out half for a car down payment',
        hint: 'Exit load and tax apply',
        effects: (s) => ({ investments: -Math.round(s.investments * 0.5), cash: Math.round(s.investments * 0.5 * 0.9), happiness: 6 }),
        outcomeText: 'Half the portfolio becomes a down payment. About 10% went to exit load and tax.',
        lesson: 'Breaking a long-term investment for a short-term want resets the compounding clock.',
      },
    ],
  },
  {
    id: 'stock-tip',
    title: 'WhatsApp Stock Tip',
    emoji: '🤑',
    category: 'investing',
    minYear: 2,
    maxYear: 9,
    baseWeight: 1.3,
    narration: 'Your school WhatsApp group is buzzing: "Insider news! This ₹12 penny stock will 10x by Diwali. The operator is buying!"',
    choices: [
      tipChoice('all-in', (s) => `Go big: put in ${inr(amt(s, 40000))}`, (s) => amt(s, 40000)),
      tipChoice('small', 'Bet just ₹5,000 for fun', () => 5000),
      {
        id: 'ignore',
        label: 'Mute the group, keep your SIP',
        hint: 'Boring is beautiful',
        effects: { happiness: 1 },
        outcomeText: 'You mute the group. Your boring SIP keeps doing its boring job.',
        lesson: 'SEBI regularly warns that "insider tips" on WhatsApp and Telegram are the classic pump-and-dump setup.',
      },
    ],
  },
  {
    id: 'fo-trading',
    title: 'The Options Trading Guru',
    emoji: '🎰',
    category: 'investing',
    minYear: 3,
    maxYear: 9,
    baseWeight: 0.9,
    narration: 'A finfluencer posing with a rented Lamborghini sells an F&O trading course: "Make ₹5,000 a day from your phone!" The course costs ₹25,000.',
    choices: [
      {
        id: 'go',
        label: (s) => `Buy the course and trade ${inr(amt(s, 50000))}`,
        hint: 'Financial freedom awaits?',
        effects: (s) => ({ cash: -(25000 + Math.round(amt(s, 50000) * 0.9)), stress: 15, happiness: -8 }),
        setFlags: ['triedFno'],
        outcomeText: 'Three months of trading later, 90% of your capital is gone. The guru\'s course sales are doing great, though.',
        lesson: 'SEBI found that over 9 out of 10 individual F&O traders lost money. The steady earners are the ones selling courses.',
      },
      {
        id: 'paper',
        label: 'Paper-trade for 3 months first',
        hint: 'Fake money, real lessons',
        effects: { stress: 3 },
        outcomeText: 'Your pretend account lost 60%. The cheapest lesson you will ever get.',
        lesson: 'Test any strategy with fake money before you risk real money.',
      },
      {
        id: 'index',
        label: 'Stick with index funds',
        hint: 'Own the whole market',
        effects: { happiness: 1 },
        outcomeText: 'You scroll past. Your index fund does not care about Lamborghinis.',
        lesson: 'Most active traders fail to beat a simple index fund over ten years.',
      },
    ],
  },
  {
    id: 'market-crash',
    title: 'Market Bloodbath',
    emoji: '📉',
    category: 'investing',
    minYear: 2,
    baseWeight: 1.2,
    requires: { minInvestments: 15000 },
    narration: (s) => `Markets fall 20% in a month. Your ${inr(s.investments)} portfolio is bleeding red, and social media says it is all going to zero.`,
    choices: [
      {
        id: 'sell',
        label: 'Sell everything before it gets worse',
        hint: 'Make the red stop',
        effects: (s) => ({ investments: -s.investments, cash: Math.round(s.investments * 0.8), stress: -5 }),
        setFlags: ['panicSold'],
        outcomeText: 'You sold at the bottom and locked in a 20% loss. It feels safe. It is not.',
        lesson: 'Selling in a crash turns a temporary dip into a permanent loss. Markets have recovered from every crash so far; panic sellers often miss it.',
      },
      {
        id: 'hold',
        label: 'Hold and delete the app for a while',
        hint: 'Ride it out',
        effects: (s) => ({ investments: -Math.round(s.investments * 0.2), stress: 8 }),
        schedule: [{ eventId: 'market-recovery', inYears: 1 }],
        outcomeText: 'You hold. On paper you are down 20%, but you haven\'t sold a single unit.',
        lesson: 'Volatility is the price of admission for stock market returns.',
      },
      {
        id: 'buy-more',
        label: 'Buy more while it\'s on sale',
        hint: (s) => `Invest ${inr(Math.min(Math.round(s.cash * 0.3), amt(s, 30000)))} extra`,
        requires: { minCash: 10000 },
        effects: (s) => {
          const buy = Math.min(Math.round(s.cash * 0.3), amt(s, 30000))
          return { investments: buy - Math.round(s.investments * 0.2), cash: -buy, stress: 4 }
        },
        setFlags: ['boughtDip'],
        schedule: [{ eventId: 'market-recovery', inYears: 1 }],
        outcomeText: 'You bought at a discount while everyone else panicked. Nervous, but strategic.',
        lesson: 'A crash is a sale on good assets, but only buy with money you won\'t need for years.',
      },
    ],
  },
  {
    id: 'market-recovery',
    title: 'The Comeback',
    emoji: '📈',
    category: 'investing',
    scheduledOnly: true,
    requires: { minInvestments: 1 },
    narration: 'A year after the crash, markets have recovered everything and then some. Patience just paid you.',
    choices: [
      {
        id: 'stay',
        label: 'Stay invested',
        hint: 'Let it keep growing',
        effects: (s) => ({ investments: Math.round(s.investments * (s.flags.boughtDip ? 0.3 : 0.25)), happiness: 8, stress: -6 }),
        outcomeText: (s) => (s.flags.boughtDip
          ? 'Everything you bought during the crash is now up 30%. Fortune favoured the calm.'
          : 'Your portfolio is back above where it started. Holding was the whole strategy.'),
        lesson: 'Missing just the best few recovery days can wipe out years of returns. Staying in matters more than timing.',
      },
      {
        id: 'rebalance',
        label: 'Book some profit into the emergency fund',
        hint: 'Move 20% to cash',
        effects: (s) => {
          const grown = Math.round(s.investments * 1.25)
          return { investments: grown - s.investments - Math.round(grown * 0.2), cash: Math.round(grown * 0.2), happiness: 6 }
        },
        outcomeText: 'You took 20% off the table into cash. Growth plus a bigger safety net.',
        lesson: 'Rebalancing means trimming what grew and topping up what you need. It is a plan, not panic.',
      },
    ],
  },
  {
    id: 'tax-season',
    title: 'March Tax Panic',
    emoji: '🗂️',
    category: 'tax',
    minYear: 2,
    maxYear: 9,
    baseWeight: 1.4,
    narration: 'It\'s March. Your bank\'s relationship manager calls: "Save tax under 80C! Our endowment plan has guaranteed returns. Only ₹4,000 a month for 15 years."',
    choices: [
      {
        id: 'endowment',
        label: 'Sign the endowment plan',
        hint: '₹4,000 a month for 15 years',
        effects: { monthlyExpenses: 4000, happiness: 2 },
        setFlags: ['hasEndowment'],
        schedule: [{ eventId: 'endowment-regret', inYears: 2 }],
        outcomeText: 'Signed. The RM thanks you very warmly. The commission was very good.',
        lesson: 'Endowment plans mix insurance and investing and usually do both badly: about 5% returns and tiny cover.',
      },
      {
        id: 'term-elss',
        label: 'Term insurance + an ELSS mutual fund instead',
        hint: (s) => `₹900 a month term premium + ${inr(amt(s, 10000))} into ELSS`,
        requires: { notFlags: ['hasTermInsurance'] },
        effects: (s) => ({ monthlyExpenses: 900, cash: -amt(s, 10000), investments: amt(s, 10000) }),
        setFlags: ['hasTermInsurance'],
        outcomeText: 'Big cover from the term plan, real growth from the ELSS fund. The RM is disappointed.',
        lesson: 'Keep insurance and investing separate: cheap term cover for protection, an ELSS or index fund for growth.',
      },
      {
        id: 'check',
        label: 'Check if you even owe any tax',
        hint: 'Five minutes on the tax calculator',
        effects: { happiness: 2 },
        outcomeText: (s) => (taxFree(s)
          ? 'Under the new tax regime your salary is below ₹12.75 lakh a year, so you owe zero income tax. There is nothing to "save"!'
          : 'You compare the old and new regimes on the official calculator and pick the cheaper one. No product needed.'),
        lesson: 'Since 2025, the new regime makes salaries up to about ₹12.75 lakh tax-free. Never buy a product to save tax you don\'t owe.',
      },
    ],
  },
  {
    id: 'endowment-regret',
    title: 'Reading the Fine Print',
    emoji: '🔍',
    category: 'investing',
    scheduledOnly: true,
    requires: { anyFlags: ['hasEndowment', 'hasMoneyBack'] },
    narration: (s) => `Two years in, you finally read your policy document: about 4.5% returns, and quitting now forfeits most of the ${inr(endowmentPremium(s) * 24)} you've paid.`,
    choices: [
      {
        id: 'surrender',
        label: 'Surrender it and take the loss',
        hint: 'Get back about 30% of what you paid',
        effects: (s) => ({ cash: Math.round(endowmentPremium(s) * 24 * 0.3), monthlyExpenses: -endowmentPremium(s), happiness: -3 }),
        clearFlags: ['hasEndowment', 'hasMoneyBack'],
        outcomeText: 'Painful, but done. The premium now goes into your own budget instead.',
        lesson: 'Sometimes the cheapest exit is the best one. Stop the bleeding and invest the premium in an index fund.',
      },
      {
        id: 'paid-up',
        label: 'Make it "paid-up" and stop premiums',
        hint: 'Keep a reduced benefit',
        effects: (s) => ({ monthlyExpenses: -endowmentPremium(s), stress: -3 }),
        clearFlags: ['hasEndowment', 'hasMoneyBack'],
        outcomeText: 'Premiums stop. The policy stays alive with a smaller payout at maturity.',
        lesson: 'A "paid-up" policy stops future premiums but keeps a reduced benefit. Ask about it before you surrender.',
      },
      {
        id: 'continue',
        label: 'Keep paying for 13 more years',
        hint: 'Already paid so much...',
        effects: { stress: 3 },
        outcomeText: 'You keep paying because you have already paid. Classic sunk-cost thinking.',
        lesson: 'Money already spent is gone either way. Decide based on the future, not on what you can\'t get back.',
      },
    ],
  },
  {
    id: 'side-hustle-tax',
    title: 'TDS on Your Side Income',
    emoji: '🧮',
    category: 'tax',
    scheduledOnly: true,
    requires: { flags: ['hasSideHustle'] },
    narration: (s) => `The coaching centre deducted ${inr(tdsOf(s))} TDS from your side income, so it shows up in your Annual Information Statement. Time to file your return.`,
    choices: [
      {
        id: 'file',
        label: 'File your ITR properly',
        hint: 'Declare everything',
        effects: (s) => (taxFree(s) ? { cash: tdsOf(s), happiness: 6 } : { cash: -amt(s, 8000), stress: -4 }),
        outcomeText: (s) => (taxFree(s)
          ? `Your total income is below ₹12.75 lakh, so you owe nothing and the ${inr(tdsOf(s))} TDS comes back as a refund!`
          : 'You paid the balance tax on your side income. Clean books, no surprises.'),
        lesson: 'File your ITR even when you owe nothing: TDS refunds, loans and visas all need it.',
      },
      {
        id: 'skip',
        label: 'Skip filing, too much hassle',
        hint: 'What\'s the worst that could happen?',
        effects: { stress: 4 },
        schedule: [{ eventId: 'tax-penalty', inYears: 1 }],
        outcomeText: (s) => (taxFree(s)
          ? `You skip it, and your ${inr(tdsOf(s))} TDS refund stays with the government. Free money left on the table.`
          : 'You skip it. The Income Tax department has your PAN and your TDS records.'),
        lesson: 'The tax department already sees TDS, bank interest and big purchases. Hiding income rarely works.',
      },
    ],
  },
  {
    id: 'tax-penalty',
    title: 'Income Tax Notice',
    emoji: '⚖️',
    category: 'tax',
    scheduledOnly: true,
    requires: { minIncome: 106250 },
    narration: 'A notice from the Income Tax department: unreported income, plus tax, interest and a penalty. Reply within 30 days.',
    choices: [
      {
        id: 'pay',
        label: 'Pay up and file the updated return',
        hint: (s) => `${inr(amt(s, 25000))} in tax, interest and penalty`,
        effects: (s) => ({ cash: -amt(s, 25000), stress: 6 }),
        outcomeText: 'Paid. An expensive way to learn that skipping your return was never free.',
        lesson: 'Filing late costs a fee of up to ₹5,000 plus interest. Under-reporting income can add a penalty of 50% to 200% of the tax.',
      },
      {
        id: 'ca',
        label: 'Hire a CA to respond',
        hint: (s) => `${inr(amt(s, 15000))} total, less stress`,
        effects: (s) => ({ cash: -amt(s, 15000), stress: -4 }),
        outcomeText: 'The CA files an updated return and gets the penalty reduced. Worth every rupee.',
        lesson: 'A good CA costs less than a penalty. Keep your records and file on time.',
      },
    ],
  },
  {
    id: 'bonus',
    title: 'Bonus Day!',
    emoji: '🎉',
    category: 'windfall',
    minYear: 2,
    baseWeight: 1.2,
    repeatable: true,
    cooldown: 3,
    narration: (s) => `Performance bonus credited: ${inr(bonusOf(s))}! Within an hour your phone is full of "Goa plan??" messages.`,
    choices: [
      {
        id: 'goa',
        label: 'Goa trip with the gang',
        hint: 'Spend about 75% of it',
        effects: (s) => ({ cash: Math.round(bonusOf(s) * 0.25), happiness: 14, stress: -10 }),
        outcomeText: 'Beaches, sunsets and a sunburn. Worth it, and a quarter of the bonus survived.',
        lesson: 'Spending part of a windfall on joy is healthy. Spending all of it every time is a habit.',
      },
      {
        id: 'prepay',
        label: 'Throw it all at your loans',
        hint: 'Fewer EMIs, less interest',
        requires: { hasLoans: true },
        effects: (s) => ({ cash: bonusOf(s), payDownLoans: bonusOf(s), stress: -6 }),
        outcomeText: 'The whole bonus went to your loans. Less interest every month from now on.',
        lesson: 'Prepaying a 14% loan is a guaranteed 14% return. Very few investments can promise that.',
      },
      {
        id: 'invest',
        label: 'Invest it all in your index fund',
        hint: 'Future you says thanks',
        effects: (s) => ({ investments: bonusOf(s), happiness: 3 }),
        outcomeText: 'Lump sum invested. It will quietly compound for decades.',
        lesson: 'Windfalls are the easiest money to invest because you never got used to spending them.',
      },
      {
        id: 'save',
        label: 'Top up the emergency fund',
        hint: 'Sleep-well money',
        effects: (s) => ({ cash: bonusOf(s), stress: -8 }),
        outcomeText: 'Bonus parked in the emergency fund. Your future bad days just got smaller.',
        lesson: 'Until you have 3 to 6 months of expenses saved, a bonus is your fastest way to build the airbag.',
      },
    ],
  },
  {
    id: 'grandma-gift',
    title: 'Nani\'s Envelope',
    emoji: '👵',
    category: 'windfall',
    minYear: 1,
    baseWeight: 0.8,
    narration: (s) => `Nani presses an envelope into your hand: ${inr(giftOf(s))}. "Do something useful with it, beta. Not phone-shone."`,
    choices: [
      {
        id: 'gold',
        label: 'Buy a gold coin (Nani approves)',
        hint: 'Making charges apply',
        effects: (s) => ({ investments: Math.round(giftOf(s) * 0.9), happiness: 5 }),
        outcomeText: 'A shiny gold coin, minus about 10% in making charges. Nani is delighted.',
        lesson: 'Physical gold comes with making charges and locker worries. Gold ETFs or gold mutual funds are cheaper ways to own it.',
      },
      {
        id: 'index',
        label: 'Put it in your index fund',
        hint: 'Let Nani\'s gift grow',
        effects: (s) => ({ investments: giftOf(s), happiness: 3 }),
        outcomeText: 'Invested. By the time you are Nani\'s age, this could be worth many times more.',
        lesson: 'Small sums invested early grow surprisingly large. That is compounding.',
      },
      {
        id: 'dinner',
        label: 'Family dinner, save the rest',
        hint: 'Treat everyone, keep 60%',
        effects: (s) => ({ cash: Math.round(giftOf(s) * 0.6), happiness: 10 }),
        outcomeText: 'Biryani for twelve. Nani tells everyone it was her idea.',
        lesson: 'Money spent on people you love is rarely money wasted, as long as you plan for it.',
      },
    ],
  },
]
