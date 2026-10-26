import { emiFor, inr, med } from './helpers.js'

// Same menu for any hospital bill; which options show depends on your insurance
function hospitalChoices(bill, copay) {
  return [
    {
      id: 'claim',
      requires: { flags: ['hasHealthInsurance'] },
      label: 'Claim insurance (cashless)',
      hint: (s) => `You pay only the ${inr(copay(s))} co-pay`,
      effects: (s) => ({ cash: -copay(s), health: -12, stress: 4 }),
      outcomeText: (s) => `Cashless claim approved. The insurer paid ${inr(bill(s) - copay(s))} and you paid ${inr(copay(s))}.`,
      lesson: 'This is what insurance is for: a lakh-rupee problem became a small bill.',
    },
    {
      id: 'claim-room',
      requires: { flags: ['hasHealthInsurance'] },
      label: 'Claim, plus upgrade to a private room',
      hint: 'Comfort costs extra',
      effects: (s) => ({ cash: -(copay(s) + med(s, 20000)), health: -10, happiness: 4 }),
      outcomeText: 'Nice room, a TV and a window. The insurer paid most of it; the upgrade was on you.',
      lesson: 'Check your policy\'s room-rent limit. A pricier room can make the insurer cut your whole claim proportionally.',
    },
    {
      id: 'savings',
      requires: { notFlags: ['hasHealthInsurance'] },
      label: 'Pay the full bill from savings',
      hint: (s) => `You have ${inr(s.cash)} in cash`,
      effects: (s) => ({ cash: -bill(s), health: -12, stress: 15 }),
      outcomeText: 'Paid in full. You recover; your savings account might need the ICU now.',
      lesson: 'One hospital stay can erase years of savings. A ₹800 a month policy would have paid most of this.',
    },
    {
      id: 'card',
      requires: { flags: ['hasCreditCard'], notFlags: ['hasHealthInsurance'] },
      label: 'Swipe the credit card',
      hint: 'Deal with it later... at 38% a year',
      effects: (s) => ({ debt: bill(s), debtRate: 0.38, health: -12, stress: 18, creditScore: -15 }),
      setFlags: ['hasCreditCardDebt'],
      schedule: [{ eventId: 'min-due-trap', inYears: 1 }],
      outcomeText: 'Card swiped. The hospital is happy. Next month\'s statement will not be.',
      lesson: 'Credit card debt is the most expensive way to pay for an emergency.',
    },
    {
      id: 'loan',
      requires: { notFlags: ['hasHealthInsurance'] },
      label: 'Take a medical loan, 12 EMIs',
      hint: (s) => `${inr(emiFor(bill(s), 0.16, 12))} a month for a year`,
      effects: (s) => ({ emi: { label: 'Medical loan', amount: emiFor(bill(s), 0.16, 12), months: 12 }, health: -12, stress: 12, creditScore: -5 }),
      outcomeText: 'Loan approved in an hour. Repaying it will take a year.',
      lesson: 'A loan spreads the pain, but you still pay the full bill plus about 16% interest.',
    },
  ]
}

const dengueBill = (s) => med(s, 140000)
const dengueCopay = (s) => med(s, 12000)
const appendixBill = (s) => med(s, 95000)
const appendixCopay = (s) => med(s, 9000)
const surgeryBill = (s) => med(s, 250000)
const termPremium = (s) => 700 + Math.max(0, s.age - 22) * 70

export default [
  {
    id: 'health-insurance-offer',
    title: 'Health Insurance Pitch',
    emoji: '🏥',
    category: 'medical',
    minYear: 1,
    maxYear: 3,
    baseWeight: 4,
    requires: { notFlags: ['hasHealthInsurance'] },
    narration: 'HR reminds you that your company health cover ends the day you leave this job. A personal ₹5 lakh policy costs about ₹800 a month at your age.',
    choices: [
      {
        id: 'buy-self',
        label: 'Buy a ₹5 lakh personal policy',
        hint: '₹800 a month, for peace of mind',
        effects: { monthlyExpenses: 800, stress: -5 },
        setFlags: ['hasHealthInsurance'],
        outcomeText: 'Policy issued. Boring paperwork today, a giant shield tomorrow.',
        lesson: 'Buy health insurance while you are young and healthy. Premiums are low and nothing is excluded yet.',
      },
      {
        id: 'buy-family',
        label: 'Family floater, parents included',
        hint: '₹2,500 a month, covers Mom and Papa too',
        effects: { monthlyExpenses: 2500, stress: -8, happiness: 4 },
        setFlags: ['hasHealthInsurance', 'parentsInsured'],
        outcomeText: 'Your parents are covered too. Mummy has told the entire colony.',
        lesson: 'Parents\' hospital bills are the biggest surprise expense for Indian earners. A family floater covers everyone under one policy.',
      },
      {
        id: 'skip',
        label: 'Skip it, I\'m young and healthy',
        hint: 'Keep the ₹800 a month',
        effects: { happiness: 2 },
        setFlags: ['skippedHealthInsurance'],
        schedule: [{ eventId: 'medical-emergency', inYears: 2 }],
        outcomeText: 'You saved ₹800 this month. Somewhere, a mosquito took notes.',
        lesson: 'Skipping insurance is not saving money. It is betting your savings that nothing ever goes wrong.',
      },
    ],
  },
  {
    id: 'medical-emergency',
    title: 'Dengue Strikes',
    emoji: '🦟',
    category: 'medical',
    scheduledOnly: true,
    narration: (s) =>
      s.flags.hasHealthInsurance
        ? `High fever, crashing platelets: dengue. Five days in a private hospital, ${inr(dengueBill(s))} bill, but your insurance card is in your wallet.`
        : `High fever, crashing platelets: dengue. Five days in a private hospital with no insurance. The bill: ${inr(dengueBill(s))}.`,
    choices: hospitalChoices(dengueBill, dengueCopay),
  },
  {
    id: 'hospital-visit',
    title: '2 AM Appendix Surgery',
    emoji: '🚑',
    category: 'medical',
    minYear: 2,
    baseWeight: 0.8,
    weightModifiers: [{ ifNotFlag: 'hasHealthInsurance', multiply: 1.5 }],
    narration: (s) =>
      `A stomach ache at 2 AM turns into emergency appendix surgery. The hospital bill comes to ${inr(appendixBill(s))}.`,
    choices: hospitalChoices(appendixBill, appendixCopay),
  },
  {
    id: 'family-emergency',
    title: 'Papa\'s Knee Surgery',
    emoji: '👴',
    category: 'family',
    minYear: 2,
    baseWeight: 1,
    weightModifiers: [{ ifFlag: 'hasDependent', multiply: 2.5 }],
    narration: (s) =>
      s.flags.parentsInsured
        ? 'Papa needs a knee replacement. Good thing you put your parents on the family floater.'
        : `Papa needs a knee replacement. The government hospital waitlist is eight months; a private hospital quotes ${inr(surgeryBill(s))}.`,
    choices: [
      {
        id: 'claim',
        requires: { flags: ['parentsInsured'] },
        label: 'Claim on the family floater',
        hint: (s) => `You pay about ${inr(med(s, 15000))}`,
        effects: (s) => ({ cash: -med(s, 15000), happiness: 6, stress: 3 }),
        outcomeText: 'Surgery done, claim settled. Papa is already walking to the sabzi market.',
        lesson: 'Insuring parents early is cheap. After 60, premiums jump and many illnesses get excluded.',
      },
      {
        id: 'claim-top',
        requires: { flags: ['parentsInsured'] },
        label: 'Claim, and pay extra for the top surgeon',
        hint: 'Best care, partly out of pocket',
        effects: (s) => ({ cash: -med(s, 60000), happiness: 10, stress: 2 }),
        outcomeText: 'The famous surgeon operated. Papa calls it his "VIP knee".',
        lesson: 'Insurance gives you choices. Without it, the bill decides for you.',
      },
      {
        id: 'savings',
        requires: { notFlags: ['parentsInsured'] },
        label: 'Private hospital, pay from savings',
        hint: (s) => `${inr(surgeryBill(s))} from your cash`,
        effects: (s) => ({ cash: -surgeryBill(s), happiness: 6, stress: 12 }),
        outcomeText: 'Papa gets surgery next week. Your savings take a very long time to recover.',
        lesson: 'Parents\' health is the biggest unplanned cost for most Indian families. Insure them before they turn 60.',
      },
      {
        id: 'loan',
        requires: { notFlags: ['parentsInsured'] },
        label: 'Private hospital on a personal loan',
        hint: (s) => `${inr(emiFor(surgeryBill(s), 0.14, 36))} a month for 3 years`,
        effects: (s) => ({ emi: { label: 'Surgery loan', amount: emiFor(surgeryBill(s), 0.14, 36), months: 36 }, happiness: 4, stress: 15 }),
        outcomeText: 'Surgery done. The loan EMI moves in with you for three years.',
        lesson: 'Borrowing for a family emergency is common, but a ₹2,500 a month floater would have avoided three years of EMIs.',
      },
      {
        id: 'govt',
        requires: { notFlags: ['parentsInsured'] },
        label: 'Wait for the government hospital',
        hint: 'Free, but eight months of pain',
        effects: { happiness: -12, stress: 10 },
        outcomeText: 'Papa waits it out, wincing on the stairs every day. The surgery finally happens, for free.',
        lesson: 'Free public care is real but slow. Planning ahead turns a crisis into a choice.',
      },
    ],
  },
  {
    id: 'term-insurance',
    title: 'Who Pays If You Can\'t?',
    emoji: '☂️',
    category: 'family',
    minYear: 1,
    maxYear: 3,
    baseWeight: 0.8,
    requires: { notFlags: ['hasTermInsurance'] },
    weightModifiers: [{ ifFlag: 'hasDependent', multiply: 3 }, { ifFlag: 'married', multiply: 3 }],
    narration: (s) =>
      `An advisor asks a hard question: if something happened to you, who pays ${s.flags.hasDependent ? 'for your parent' : 'your loans and your family\'s bills'}? A ₹1 crore term plan costs about ${inr(termPremium(s))} a month at ${s.age}.`,
    choices: [
      {
        id: 'buy',
        label: 'Buy ₹1 crore term cover',
        hint: (s) => `${inr(termPremium(s))} a month, locked for 30 years`,
        effects: (s) => ({ monthlyExpenses: termPremium(s), stress: -6 }),
        setFlags: ['hasTermInsurance'],
        outcomeText: 'Medical test done, policy issued. Your family is protected for less than a pizza a week.',
        lesson: 'Term insurance is pure protection: huge cover, tiny premium. Buy it as soon as someone depends on you.',
      },
      {
        id: 'later',
        label: 'Later. Nothing will happen to me',
        hint: 'Keep the premium',
        effects: {},
        schedule: [{ eventId: 'term-wakeup', inYears: 2 }],
        outcomeText: 'You put it off. The premium quietly goes up every birthday.',
        lesson: 'Every year you wait, term premiums rise, and one health issue can make you uninsurable.',
      },
      {
        id: 'money-back',
        label: 'Buy a "money-back" policy instead',
        hint: '₹3,500 a month, "you get money back!"',
        effects: { monthlyExpenses: 3500, happiness: 2 },
        setFlags: ['hasMoneyBack'],
        schedule: [{ eventId: 'endowment-regret', inYears: 2 }],
        outcomeText: 'You get a glossy brochure and about ₹10 lakh of cover. The agent gets a big commission.',
        lesson: '₹3,500 a month in a money-back plan buys about ₹10 lakh of cover. In a term plan it buys over ₹2 crore.',
      },
    ],
  },
  {
    id: 'term-wakeup',
    title: 'A Wake-Up Call',
    emoji: '🕯️',
    category: 'family',
    scheduledOnly: true,
    requires: { notFlags: ['hasTermInsurance'] },
    narration: 'Papa\'s friend passed away suddenly, with no life insurance. His family is selling their flat to repay the home loan, and Mummy quietly asks: "Are we covered?"',
    choices: [
      {
        id: 'buy-now',
        label: 'Buy term cover now',
        hint: (s) => `${inr(termPremium(s) + 300)} a month, pricier than before`,
        effects: (s) => ({ monthlyExpenses: termPremium(s) + 300, stress: -8 }),
        setFlags: ['hasTermInsurance'],
        outcomeText: 'Covered at last, at a higher premium than two years ago. Mummy sleeps better.',
        lesson: 'The best time to buy term insurance was when you started earning. The second best time is today.',
      },
      {
        id: 'still-skip',
        label: 'Change the topic',
        hint: 'Avoid the awkward talk',
        effects: { stress: 10, happiness: -4 },
        outcomeText: 'You change the topic. The question keeps you up at night anyway.',
        lesson: 'Avoiding the question does not remove the risk. It just moves it onto your family.',
      },
    ],
  },
]
