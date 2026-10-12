# Finesse Vault Card: Research on the Chase Path and the Alternatives

Prepared 12 Oct 2026 for Sean Gilmore (Finesse Life). This is research, not legal advice. Confirm every regulatory point with fintech counsel and with whichever partner you pick.

> **How this was researched:** every source below was found by web search. Direct page fetches failed during this session with DNS errors, so each fact comes from the search engine's extract of the cited page, not from a full read. Items marked **[UNVERIFIED]** are inferences, estimates, or single low-quality sources. Dates are the page or event dates the search reported.

---

## Executive summary (10 lines)

1. **What "Girfolds" probably is:** the **Grifols** plasma-donor prepaid Visa card. Grifols reloads it after each donation, and several indexed pages tie it to "Chase prepaid" and JPMorgan Chase Bank, N.A. My confidence is moderate to high (~70%). The issuer line printed on the back of your card will settle it.
2. **What that card actually is:** a **company-funded payout card** (J.P. Morgan Payments "Prepaid Card"). J.P. Morgan sells it for rebates, incentives, refunds and employee payments. It is **not** a card members load with their own money. The Vault concept needs the second kind.
3. **Chase has no public program** that lets a third-party brand launch a member-loaded, co-branded reloadable card. Chase co-brand deals (Amazon, United, Marriott, DoorDash, and soon Apple Card) are credit cards negotiated one by one with very large brands.
4. **Odds for a pre-launch startup getting a Chase/J.P. Morgan program:** low for the member-loaded card. Possible but uncertain for a payout card used to pay rewards, once Finesse has a J.P. Morgan banking relationship. J.P. Morgan's Commercial Banking tiers start at about $20M revenue, though its Innovation Economy group does bank pre-seed startups.
5. **Realistic path:** a card-issuing platform plus a sponsor bank. The best fits for Finesse are **Stripe Issuing** (consumer prepaid, issued by Lead Bank / Cross River, in private preview), **Highnote**, and **Lithic**. Member funds stay at the bank or with a licensed partner, so Finesse never holds them.
6. **Biggest risk:** dating. Visa treats dating services as top-tier "high integrity risk" (MCC 7273), and Stripe's Financial Accounts lists "dating services" as **prohibited**. Present Finesse as a lifestyle and membership business, and settle this in the very first partner call.
7. **12% cashback cannot come from interchange.** Card fees earn the program roughly 0.8–1.3% of spend at best, and much less at a big bank like Chase. 12% has to be paid from Finesse's margin as a Finesse-funded reward on Finesse purchases only. A worked example is in Section 4.
8. **Regulation:** with a bank-controlled program, Finesse normally does **not** need to become a money transmitter or MSB. It still has to meet CFPB Prepaid Rule disclosures, KYC/OFAC, network rules and FDIC "don't say bank" rules, and it needs a named compliance owner.
9. **Card finishes** (Nano Black, Platinum, Rose Gold) mean **metal PVD cards**. Each is a separate design needing bank and network approval. Metal cards cost about $5–15+ each. Stripe's custom cards carry a **2,500-card minimum per order**. Check whether "Platinum" can be printed as a finish name, because Visa uses it as a product name. Launch with virtual cards first.
10. **Timeline:** realistically **5–8 months**: virtual cards around Q2 2027, metal cards around Q2–Q3 2027. Next actions: confirm the card issuer, take the "dating" question to Stripe/Highnote/Lithic sales, and approach J.P. Morgan in parallel only for a rewards payout card and banking.

---

## 1. What is the "Girfolds" card?

### Most likely: the Grifols plasma-donor card (confidence ~70%)

- **The name:** "Girfolds" is one letter swap plus an "s" away from **Grifols**, the plasma company. Grifols also runs centres as Biomat USA, Talecris Plasma Resources and Interstate Blood Bank. Searches for "Girfolds" and "Greenfolds" found no card or fintech by either name ([search, Oct 2026]).
- **How donors are paid:** Grifols says donors get a **prepaid debit card after the first successful donation, reloaded with compensation after each donation**. It tells donors to contact the "issuing bank" with card questions ([Grifols – Why we compensate](https://www.grifolsplasma.com/en/importance-of-plasma/why-we-compensate)).
- **The Chase link:** several indexed pages titled "Chase Prepaid Card Grifols" / "Grifols Chase Plasma Card" carry "JPMorgan Chase Bank, N.A." footer text ([example 1](https://ftp.kontos.com/QAf/675/new_bvpaqe_chase_prepaid_card_grifols), [example 2](https://volta.temple.edu/dwd/grifols-plasma-card-chase)). **[UNVERIFIED, low-quality pages]** They are auto-generated and also mix in Bank of America text from CSL Plasma's card. Other sources point to Bank of America ([loginslink](https://loginslink.com/grifols-card-login)), Paysign ([Trustpilot](https://no.trustpilot.com/review/paysign.com)) or an "iGive Rewards" card for some Grifols centres ([Inverse, ~2015](https://www.inverse.com/article/7618-the-10-bleed-how-plasma-donors-got-stuck-with-prepaid-card-fees-and-why-it-matters); [plasmapaycalculator 2026](https://plasmapaycalculator.com/blog/talecris-plasma-pay-rates-2026)). Different Grifols centres or years may use different issuers. Since you say your card is from Chase, the J.P. Morgan program is the best match.
- **The J.P. Morgan product it fits:** "Prepaid Card by J.P. Morgan Payments" (page dated 8 Mar 2024). J.P. Morgan describes it as a Visa card, digital or physical, for **"consumer rebates, incentives, and refunds"** and employee payments. Recipients don't need a bank account, and the card can be funded in real time from the client's own J.P. Morgan account (DDA) ([J.P. Morgan Prepaid Card](https://www.jpmorgan.com/payments/solutions/prepaid-card); [J.P. Morgan insight](https://www.jpmorgan.com/insights/treasury/cards-expense-management/streamline-payments-prepaid-card)). Cardholders appear to manage these cards at prepaid.chase.com **[UNVERIFIED, unofficial page]** ([Google Sites page](https://sites.google.com/view/prepaidchasecom-logintoyouracc/home)).
- **The exact issuer line:** I could not find the official Grifols cardholder agreement, and a search of the CFPB prepaid-agreement database turned up no Grifols entry. **Please photograph the back of your card.** The fine print will say something like "issued by JPMorgan Chase Bank, N.A. pursuant to a license from Visa U.S.A. Inc." Visa requires that wording on co-branded and affinity cards ([Arroweye Visa design guide](https://www.arroweye.com/wp-content/uploads/2021/09/Visa-Plastic-Card-Artwork-Design-Guide_V9.pdf)). Note the website and phone number printed there as well.

### Other possibilities

- **Chase First Banking, ~20%:** Chase's kids' debit card, built on **Greenlight** technology. It is open to existing Chase customers only ([Finder](https://www.finder.com/banking/chase-bank/chase-first-banking); [MoneyCrashers](https://www.moneycrashers.com/chase-first-banking-review/)). It is a bank sub-account, not something a brand can license.
- **Green Dot / Greenlight / GoHenry, under 10%:** these are the closest spellings, but none of them is a Chase product.

### Why the difference matters

| | Grifols-style card (J.P. Morgan Prepaid Card) | Finesse Vault concept |
|---|---|---|
| Who puts money on the card | The **company** pays out its own money | The **member** loads their own money |
| Product type | Disbursement / payout prepaid card | General-purpose reloadable (GPR) prepaid / stored value |
| Where the money comes from | Company's J.P. Morgan account | Member's bank account or debit card, via ACH or card |
| Fit for Finesse | Good fit for **paying cashback and rewards** to members | Needed for the **load-and-spend** wallet |

Before 2014, J.P. Morgan did run third-party prepaid programs (payroll, government benefits, "UCard"). It **exited that business in January 2014** and "will no longer solicit or accept any new prepaid card business" ([JPMorganChase IR, 2014](https://www.jpmorganchase.com/ir/news/2014/id-818125); [CNBC, 9 Jan 2014](https://www.cnbc.com/2014/01/09/jpmorgan-chase-plans-to-exit-prepaid-card-business.html)). Chase also discontinued its own consumer reloadable card, **Chase Liquid, in 2019** and replaced it with the Chase Secure Banking checking account ([Digital Transactions, 20 Mar 2019](https://www.digitaltransactions.net/chase-replacing-prepaid-liquid-card-with-a-bank-account/)). Today's J.P. Morgan Prepaid Card is a corporate disbursement product for clients of J.P. Morgan Payments.

---

## 2. Getting onto a Chase / J.P. Morgan program

There are three separate J.P. Morgan doors. Each does something different.

| Door | What it is | Can Finesse use it for the Vault card? |
|---|---|---|
| **Chase consumer products** (Chase First Banking, Secure Banking, Chase debit) | Chase's own accounts, sold under the Chase brand | No. These cannot be white-labelled for a brand. |
| **Chase co-brand credit cards** (Amazon, United, Marriott, DoorDash, IHG; Apple Card announced 7 Jan 2026) | Credit cards negotiated deal by deal. Partner brands bring millions of loyal customers. | Not now. No public application process exists, and the partners are large brands ([Chase–DoorDash](https://media.chase.com/news/Chase-DoorDash-Mastercard-Announce-Partnership); [Apple Card, JPMC IR 2026](https://www.jpmorganchase.com/ir/news/2026/chase-to-become-new-issuer-of-apple-card); [IHG 2024](https://www.ihgplc.com/en/news-and-media/news-releases/2024/new-us-co-brand-credit-card-agreements)). |
| **J.P. Morgan Payments** (treasury, Prepaid Card, Embedded Payments API, Push-to-Card) | Treasury and payments products for corporate clients and platforms | **Partly.** The Prepaid Card could pay rewards to members. The Embedded Payments API (live at Walmart Marketplace since March 2025) gives platforms "limited access" accounts for business sellers, not consumer cards ([PYMNTS, 24 Mar 2025](https://www.pymnts.com/news/payment-methods/2025/jpmorgan-chase-and-walmart-introduce-embedded-finance-for-marketplace-sellers/); [JPM dev docs](https://developer.payments.jpmorgan.com/docs/embedded-finance-solutions/embedded-payments)). I found **no** public J.P. Morgan BIN-sponsorship or "card issuing as a service" program for consumer fintechs. |

### How a brand gets the J.P. Morgan Prepaid Card (the Grifols route)

There is no public application form. Based on J.P. Morgan's pages:

1. **Become a J.P. Morgan banking client.**
   - Startups: the **Innovation Economy / Startup Banking** team says it serves "pre-seed to seed" companies with operating accounts, cards and merchant processing ([J.P. Morgan Startup Banking](https://www.jpmorgan.com/commercial-banking/startups)).
   - Established companies: Commercial Banking's middle-market tiers start at about **$20M annual revenue**. Corporate Client Banking starts above $500M ([JPM Commercial Banking flyer](https://www.calstatela.edu/sites/default/files/JP%20Morgan%202025%20CB%20Internship%20Flyers.pdf); [job posting, Sep 2026](https://www.builtinnyc.com/job/commercial-banker-middle-market-banking-vice-president/3457289)).
2. **Ask your banker** (or use [jpmorgan.com/payments/contact-us](https://www.jpmorgan.com/payments/contact-us)) for a Treasury Services / Payments specialist for the **Prepaid Card**. J.P. Morgan's own article says to "connect with your J.P. Morgan representative."
3. **Expect due diligence.** J.P. Morgan publishes no eligibility rules, fees or minimums for the Prepaid Card. Its pages only say features "vary depending upon program and use case." **[UNVERIFIED]** Large-bank onboarding typically covers KYC on the company and its owners, financials, a written use-case description, the payment flow (funding from the company's DDA), volumes, and card design approval.
4. **Timeline: not published.** **[UNVERIFIED estimate]** Plan for 3–6+ months after the banking relationship is open.

### What a Chase route would and would not give Finesse

- **It would give:** a Chase/Visa-issued card that Finesse funds to pay **rewards and cashback** to members. Finesse's own money moves from its own J.P. Morgan account, so this fits the "never hold member funds" rule.
- **It would not give:** a member-loaded wallet, because the product is built for company payouts. It probably also would not give interchange revenue. **JPMorgan Chase is a "covered" (Durbin-regulated) bank**, so debit and prepaid interchange is capped at 21¢ + 0.05% (+1¢), unless the card meets the narrow reloadable-prepaid exemption ([Reg II §235.5](https://www.bankersonline.com/book/export/html/145595)).
- **Realistic odds for pre-launch Finesse: low.** The product targets established corporates, and Finesse has no operating history. The dating/lifestyle category also tends to trigger high-risk review.

### What to prepare and ask if you still approach Chase

**Prepare:**
- a 2-page program brief: use case, member count projections, average reward size, funding flow;
- formation documents and the cap table;
- financials or the funding round;
- your AML/compliance owner;
- a description of the product category (lifestyle membership, plus how dating features are handled);
- card art concepts.

**Ask:**
1. Does J.P. Morgan Payments offer a **cardholder-reloadable** consumer prepaid card for third-party brands, or only company-funded disbursement cards?
2. What are the minimum client size, minimum annual volume, setup fee, per-card fee, and monthly minimum?
3. Can the card carry the Finesse brand and custom metal card art (three finishes)? Who manufactures it, and what is the minimum order?
4. Does any interchange revenue share go to the client? Is the card Durbin-regulated?
5. Can members see their balance in **Finesse's app** through an API, or only at prepaid.chase.com?
6. How does J.P. Morgan view a lifestyle/membership app that includes dating features?
7. Can Finesse open accounts through the Innovation Economy team first, before any card program?

---

## 3. Realistic alternatives (short version)

### Card-issuing platforms / program managers

| Platform | Consumer reloadable prepaid? | Who holds the money | Startup-friendly? | Public pricing | Notes |
|---|---|---|---|---|---|
| **Stripe Issuing (consumer prepaid)** | Yes. **Private preview**; contact sales ([docs](https://docs.stripe.com/issuing/consumer-prepaid-debit-cards)) | Funds sit in consumer "Financial Accounts" run by Stripe Payments Company, a licensed money transmitter. Cards issued by **Lead Bank / Cross River** ([Stripe](https://stripe.com/issuing/consumer); [terms](https://stripe.com/legal/consumer/prepaid-debit-card)) | Yes, if approved. Stripe outsources KYC, disputes and complaints, and offers an interchange revenue share to "eligible platforms" | $0.10 per virtual card, **$3.50** per physical card, $15 per dispute; custom/metal cards need a **2,500-card minimum** ([Stripe Issuing](https://stripe.com/en-sk/issuing); [Stripe docs](https://docs.stripe.com/issuing/cards/physical)) | Cardholders must be 18+ US residents. **Dating is "restricted"** on Stripe payments, and "Adult industry, escort, or **dating** services" is **prohibited** for Financial Accounts ([restricted list](https://stripe.com/en-mx/legal/restricted-businesses); [requirements](https://edge-docs.stripe.com/financial-accounts/connect/requirements)). |
| **Highnote** | Yes. Covers GPR and payroll prepaid; prepaid accounts get account and routing numbers by default ([Highnote docs](https://highnote.com/docs/basics/get-started/consumer-prepaid)) | Sponsor bank (not named publicly) | Marketed as a lean option for startups ([ConnectPay 2026](https://connectpay.com/blog/card-issuing-platforms/)) | Not public | $90M Series B in Jan 2025. Program management covers KYC, disputes and bank sponsorship ([Highnote prepaid](https://highnote.com/blog/highnote-product-spotlight-issue-consumer-prepaid-cards-with-highnote)). |
| **Lithic** | Yes (consumer prepaid programs on Patriot Bank) | Sponsor bank: **Patriot Bank**, with **Stearns Bank** added in 2026 ([Lithic](https://www.lithic.com/blog/lithic-expands-partner-bank-network-with-addition-of-stearns-bank)) | Yes, through the "Starter" managed program | Older figures (~2023): $0.10 per virtual card; interchange share 0.2% on the first $100k, 0.4% after ([Contrary](https://research.contrary.com/company/lithic)) | Live in a day for test programs. Consumer programs need a bank review. |
| **Marqeta** | Yes | Sponsor bank (historically Sutton) | Mid-market and enterprise; quote-based | Not public. Setup takes about 4–6 months ([Marqeta guide](https://www.marqeta.com/resources/program-management-guide)) | Requires reserve funding and financial due diligence ([Marqeta docs](https://www.marqeta.com/docs/developer-guides/building-your-managed-card-program)). |
| **Galileo (SoFi)** | Yes | SoFi Bank and other banks | Focuses on large brands ("larger established brands") | Not public. Concept to launch takes 6–7 months ([PaymentsJournal](https://www.paymentsjournal.com/from-idea-to-swipe-how-to-launch-a-winning-card-program/)) | Has a hotel co-brand debit program ([SoFi 8-K](https://www.sec.gov/Archives/edgar/data/1818874/000181887425000006/q42024earningsrelease.htm)). |
| **Unit** | Mostly B2B / software platforms now | Sponsor banks incl. Thread | Harder for startups. Cut 15% of staff in June 2024. Its CEO said bank partnering "is harder for pure-play fintech startups" ([Banking Dive](https://www.bankingdive.com/news/unit-finance-cuts-15-percent-staff/719266/); [Axios, May 2024](https://www.axios.com/pro/fintech-deals/2024/05/28/unit-regulatory-scrutiny-banks-baas)) | Per-account and per-transaction fees | |
| **Synctera** | Cards and accounts | Separate FBO account per fintech at Midland States, TransPecos, Thread; registered as an MSB itself ([TWIF](https://www.thisweekinfintech.com/p/exclusive-synctera-becomes-a-money-services-business-making-a-long-term-bet-on-baas)) | Possibly | Not public | Raised $15M in Mar 2025 ([Finovate](https://finovate.com/baas-provider-synctera-secures-15-million-in-funding/)). |
| **Treasury Prime** | Software for banks ("bank-direct") | You contract with the bank directly | Pivoted in Feb 2024 ([Fintech Nexus](https://www.fintechnexus.com/fintech-nexus-newsletter-february-29-2024-treasury-prime-cuts-staff-and-pivots-to-a-direct-approach-with-banks/)) | n/a | |
| **Increase / Column** | Increase: debit on a "good funds" model, no prepaid BIN listed. Column: a bank that runs prepaid itself | Increase's BIN sponsors / Column holds funds directly ([Increase](https://increase.com/documentation/launch-a-card-program); [Column](https://docs.column.com/guides/card-programs/)) | Developer-oriented; usually needs your own compliance team | Not public | Better fit later, at scale. |

### Sponsor banks: enforcement status (relevant to who you choose)

| Bank | Status as reported (latest source date) |
|---|---|
| **Evolve** | Federal Reserve enforcement action (14 Jun 2024) **still active**. Synapse partner, with a $60–90M shortfall in records ([Banking Dive](https://www.bankingdive.com/news/federal-reserve-synapse-partner-evolve-enforcement-action-aml-risk-fintech-baas-compliance/719027/); [BoldRails register, Aug 2026](https://boldrails.com/resources/sponsor-bank-acceptance)). **Avoid.** |
| **Sutton** | FDIC/Ohio consent order FDIC-23-0110b (Feb 2024) **in effect**. Growth of 10%+ needs regulator approval ([American Banker](https://www.americanbanker.com/news/fdic-rebukes-sutton-bank-piermont-bank-over-fintech-partners); [Rupture Labs, Aug 2026](https://rupturelabs.io/companies/sutton-bank)). |
| **Lineage** | FDIC order (Jan 2024) active, plus a **second** order on 24 Jun 2026 ([BoldRails](https://boldrails.com/resources/sponsor-bank-acceptance)). **Avoid.** |
| **Piermont** | FDIC order (Feb 2024) active. |
| **Cross River** | FDIC order (Mar 2023) active. New partners need FDIC non-objection, per a secondary source. Note: Cross River is one of Stripe's consumer prepaid issuers. |
| **Thread** | FDIC order terminated 22 Dec 2025. |
| **Blue Ridge** | OCC order terminated Nov 2025. The bank has **exited BaaS** ([Banking Dive](https://www.bankingdive.com/news/occ-terminates-blue-ridge-bank-consent-order/805617/)). |
| **Lead Bank, Coastal Community, Celtic** | No public enforcement actions found in 2025–2026 searches ([private.law](https://wiki.private.law/en/lead-bank); [Banking Dive on Coastal](https://www.bankingdive.com/news/dave-coastal-community-bank-team-up-in-pivot-away-from-evolve/741683/)). **[UNVERIFIED: absence of results is not a clean bill of health.]** |
| **Pathward** | Past BSA/AML findings and prepaid-related enforcement history ([NCLC comments, Oct 2024](https://www.nclc.org/wp-content/uploads/2024/10/2024.10.30_Comments_Bank-fintech-lending-risks-comments-NCLC-CRL-SBPC.pdf)). |

**The Synapse lesson:** Synapse filed for bankruptcy in April 2024 and froze roughly $200–265M for over 100,000 users. The CFPB sued on 21 Aug 2025 for "failing to maintain adequate records of the location of consumers' funds" and obtained a stipulated judgment that opens its victims' fund to affected users ([Banking Dive](https://www.bankingdive.com/news/cfpb-sues-synapse-plans-use-victims-fund-pay-end-users/758776/)). The bankruptcy was dismissed around Nov 2025 ([American Banker](https://www.americanbanker.com/news/synapse-bankruptcy-dismissed-cfpb-may-start-paying-victims)). Whatever partner you choose, ask: **"Who keeps the authoritative per-member ledger, and does the bank reconcile it daily?"**

---

## 4. The 12% cashback: who pays

### What interchange actually pays

- **Exempt banks (under $10B assets) or exempt reloadable prepaid:** Visa CPS/Retail Prepaid interchange is **1.15% + $0.15** per purchase. The regulated rate is 0.05% + $0.21 ([Visa US interchange, 2026](https://usa.visa.com/dam/VCOM/download/merchants/visa-usa-interchange-reimbursement-fees.pdf)).
- **Program's share:** program managers typically keep **70–80% of net interchange** ([Unit guide](https://www.unit.co/guides/ultimate-guide-interchange-revenue); [Synctera](https://www.synctera.com/post/interchange-revenue-guide)). An early-stage program on Lithic's Starter plan got 0.2–0.4% (older figures).
- **Durbin cap:** 21¢ + 0.05% (+1¢) at large banks like Chase. A federal court vacated the cap's fee standard in Aug 2025 (*Corner Post*), but that is **stayed** pending the Eighth Circuit appeal (argued 13 May 2026, no decision as of Sept 2026) ([ABA Banking Journal, Jan 2026](https://bankingjournal.aba.com/2026/01/aba-associations-urge-appeals-court-to-reverse-debit-card-interchange-fee-ruling/); [PayKings, Sep 2026](https://paykings.com/blog/debit-interchange-cap-regulation-ii-2026/)).
- **Durbin exemption for reloadable prepaid:** the card must be reloadable, not marketed as a gift card, and the only way to reach the funds. The issuer must also charge **no overdraft fees** and **no fee on the first in-network ATM withdrawal each month** ([12 CFR 235.5](https://www.bankersonline.com/book/export/html/145595)).

### Worked example: one member, one month

The member loads $1,000 and spends it as 10 purchases of $100.

| Item | Amount |
|---|---|
| Gross interchange at an exempt bank: 10 × (1.15% × $100 + $0.15) | **$13.00** |
| Finesse's share at 70–80% | **$9.10–$10.40** (about 0.9–1.0%) |
| Finesse's share at a startup tier (~0.2–0.4%) | $2–4 |
| Gross interchange if issued by Chase (regulated): 10 × ($0.21 + 0.05% × $100) | $2.60 (Finesse would likely get little or none of it) |
| **12% cashback on $1,000** | **$120.00** |
| **Gap Finesse must fund** | **about $110–118** |

**What this means:**
1. Interchange covers at most about **1/12th** of a 12% reward. The other ~11% has to come from **Finesse's margin** or partner merchants.
2. **Limit the 12% to Finesse purchases** (memberships, events, partner experiences) where Finesse earns the margin. On those, the 12% is really a **member discount paid as cashback**. On spending outside Finesse, use 0–1% at most.
3. **Watch the loop.** If a member pays Finesse *with* the Vault card, Finesse as the merchant also pays card acceptance fees (about 2.5–3%, e.g. Stripe's standard 2.9% + 30¢). Paying 12% cashback plus ~3% processing to earn back ~1% interchange costs about **14% net**. **[UNVERIFIED design idea]** Ask the provider whether members can pay Finesse straight from their prepaid balance by an internal account-to-account transfer, which avoids card fees.
4. **Set caps:** for example, 12% up to $X per month, credited after the refund window. A tier-based rate also helps. Without caps, cashback on refundable purchases is easy to abuse.

### Compliance notes on rewards

- **Rewards are Finesse's own money** until they land in a member's account, so paying them does not breach the "never hold member funds" rule. Pay them from Finesse's operating account into the member's bank-held prepaid account (Stripe and Highnote both describe funding cardholder accounts from a platform account).
- **Disclose the program terms** clearly: rate, caps, which purchases qualify, when it is credited, and when it can be clawed back after a refund. Misleading reward claims are a UDAAP (unfair, deceptive or abusive practices) risk. Fee terms belong in the Prepaid Rule disclosures.
- **Tax:** cashback earned through spending is generally treated as a **rebate, not income**. Sign-up and referral bonuses that require no spending can be taxable and may need a 1099 ([Forbes Advisor](https://www.forbes.com/advisor/credit-cards/are-credit-card-rewards-taxable/); [Banks.com](https://www.banks.com/articles/banking/debit-card-rewards-taxable/)). These are secondary sources, so confirm with a CPA.
- **Durbin:** don't add overdraft or first-ATM fees, or the card loses exempt interchange.

---

## 5. Regulatory checklist for a US reloadable prepaid program

| Area | What applies | Who owns it |
|---|---|---|
| **CFPB Prepaid Rule (Reg E §1005.18 / Reg Z)** | Before a member opens the account, give a **short form and a long form fee disclosure**. Prepaid accounts get Reg E error-resolution and limited-liability protections. Agreements must be posted and **submitted to the CFPB within 30 days**. Adding an overdraft or credit feature brings in Reg Z ([12 CFR 1005.18](https://www.consumerfinance.gov/rules-policy/regulations/1005/18/); [CFPB small-entity guide](https://files.consumerfinance.gov/f/documents/cfpb_prepaid_small-entity-compliance-guide.pdf)) | Bank is the legal issuer. The program manager drafts. **Finesse must show the disclosures in the app.** |
| **FinCEN prepaid access / MSB** | One participant is the "provider of prepaid access" and registers as an MSB. **If the bank has principal oversight and control, no one registers**, and the brand distributing the cards is not an MSB ([FIN-2012-R003](https://www.fincen.gov/sites/default/files/administrative_ruling/FIN-2012-R003.pdf); [FinCEN FAQ](https://www.fincen.gov/system/files/2021-07/20111102_1.pdf)) | Get it **in writing** that the bank or program manager is the provider and Finesse is not. |
| **State money transmitter laws** | Banks are exempt, but the exemption doesn't automatically cover a fintech. About 35 states recognise an "agent of a bank" exemption. Where the fintech only sends instructions and never touches the money, there is a reasonable argument it is not transmitting ([Venable, 2023](https://www.venable.com/insights/publications/2023/01/fbo-accounts-what-banks-and-fintechs-need); [JFC 2026](https://jfcattorneys.com/en/news/money-transmission-usa-licencias-fintech-2026)). With Stripe, the licensed money transmitter is Stripe Payments Company | Counsel opinion. **Finesse must never receive member loads into its own account.** |
| **KYC/CIP, OFAC, AML** | Name, DOB, address and SSN checks; sanctions screening; transaction monitoring; suspicious activity reports | Program manager and bank. Finesse provides the onboarding screens and data, and names a compliance contact. |
| **Network rules (Visa/Mastercard)** | BIN product type, card art standards, issuer statement on the card, Visa's high-integrity-risk rules for dating as a *merchant* (MCC 7273, Tier 1) ([Visa VIRP](https://www.legitscript.com/regulatory-and-card-brand-compliance/visa-integrity-risk-program/)) | Bank and program manager. Finesse's own merchant account (if it accepts cards for dating memberships) may need VIRP registration ($500 plus fees, per [Segpay](https://segpay.com/blog/understanding-visas-new-pricing-high-risk-tiers/)). |
| **FDIC pass-through insurance and recordkeeping** | Pass-through insurance only works if custodial (FBO) records identify each member's share. The FDIC's custodial-account recordkeeping rule (proposed 2 Oct 2024; daily reconciliation) is **not final**. It sits in "Long-Term Actions" on the Unified Agenda ([reginfo](https://www.reginfo.gov/public/do/eAgendaViewRule?pubId=202510&RIN=3064-AG07&operation=OPERATION_PRINT_RULE); [Steptoe](https://www.steptoe.com/en/news-publications/fdic-board-of-directors-rolls-back-several-biden-era-rulemaking-actions.html)) | Bank and program manager. Finesse's ledger must reconcile to theirs. |
| **Marketing: no "bank" claims** | FDIC Part 328 (effective Apr 2024) bars non-banks from misrepresenting deposit insurance. Digital-sign rules for banks apply from 2027 ([Federal Register](https://www.federalregister.gov/documents/2025/11/28/2025-21461/fdic-official-signs-and-advertising-requirements-false-advertising-misrepresentation-of-insured)) | Finesse. Say "Finesse is not a bank. Card issued by [Bank], Member FDIC." Never "Finesse Bank" or "Finesse bank account". Only say "FDIC-insured" when pass-through conditions are met, and phrase it as "through [Bank]". "Vault" as a brand name is fine **[UNVERIFIED, counsel to confirm]**. |
| **Complaints, privacy, unclaimed property** | Complaint log and escalation to the bank, GLBA privacy notice, escheatment of dormant balances | Shared. Finesse owns first-line support. |

---

## 6. Recommended path, application steps and timeline

### Best-fit paths for Finesse

| # | Path | Pros | Cons |
|---|---|---|---|
| **A (recommended)** | **Stripe Issuing consumer prepaid** (Lead Bank / Cross River) for the Vault wallet and card. Pay cashback from Finesse's Stripe balance. | One vendor for payments and cards; Stripe handles KYC, disputes and complaints; licensed entity holds funds; published per-card pricing; metal cards possible. | Private preview with approval uncertain; **dating is prohibited for Financial Accounts**; 2,500-card minimum for custom/metal; Cross River's consent order. |
| **B** | **Highnote or Lithic** managed program (Lithic: Patriot/Stearns banks) | Built for startups launching consumer prepaid; GPR support; program management included. | Pricing not public; you build more of the app; each bank reviews the vertical. |
| **C (in parallel)** | **J.P. Morgan banking plus Prepaid Card for reward payouts only** (the Grifols model) | Chase brand prestige; Finesse funds it from its own account. | Not a member-loaded wallet; low odds pre-launch; regulated interchange; slow. |

**Fallback if the dating label blocks A and B:** launch the Vault as a **Finesse-funded rewards card** (path C, or a Stripe/Lithic "incentive card"). Members earn and spend rewards but do not load their own money. That is far lighter on regulation, and the member-loaded wallet can be added later.

### Documents and roles a program manager or bank will ask for

- **Company:** formation documents (Delaware C-corp or LLC), EIN, good-standing certificate, beneficial-owner IDs (25%+ owners), cap table, org chart.
- **Financials:** bank statements, funding evidence or projections, and a reserve or collateral if requested (Marqeta mentions reserve funding).
- **Program description:** use case, member profile (18+, US), projected cards, loads and spend, the funding flow diagram, and the reward terms.
- **Compliance package:** an AML/BSA policy adopted by the company even if the bank is the provider; a named **compliance/BSA owner** (a fractional compliance officer is common); complaint-handling procedure; marketing review procedure; vendor list; information-security policy; privacy policy.
- **Agreements:** program agreement with the program manager, bank addendum, cardholder agreement and Prepaid Rule disclosures, rewards terms, and app terms of service.
- **Brand:** card art for each finish (bank and network approval), carrier letter, app screenshots, and marketing copy (bank approval).

### Costs (public figures; most real pricing is private)

| Item | Range | Source |
|---|---|---|
| Virtual card | $0.10 | Stripe |
| Standard physical card | $3.50 | Stripe |
| Metal card manufacture | **$5–15 per card**; up to $10–50 for luxury builds | [Dataintelo](https://dataintelo.com/report/metal-payment-card-market); [Accio](https://www.accio.com/business/metal-cards-with-chip) |
| Custom card minimum order | 2,500 cards (Stripe) | Stripe docs |
| Disputes | $15 each | Stripe |
| Setup / BIN sponsorship (where charged) | $10k–50k setup; $2.5k–20k per month at some vendors | [Business-plan template](https://avvale.co.uk/pages/prepaid-credit-card-business-plan-template); [Fyatu comparison](https://fyatu.com/pricing/) **[UNVERIFIED, vendor/low-quality]** |
| Fintech counsel, compliance set-up, fractional compliance officer | **[UNVERIFIED estimate]** $25k–75k legal; $5k–15k per month compliance | My estimate; get quotes |

### Card finishes: Nano Black, Platinum, Rose Gold

- **What the finishes are:** black, gold and rose gold metal cards are usually stainless steel with a **PVD coating**; silver/platinum is bare or brushed steel ([PrintPeppermint guide](https://www.printpeppermint.com/guides/metal/metal-business-cards-guide)). They need EMV chips and, ideally, contactless. Contactless adds about $1.20–2.50 per card ([Dataintelo](https://dataintelo.com/report/metal-payment-card-market)).
- **Network rules:** the Visa Brand Mark may only be printed in **Visa blue, white, silver, gold or black**, so the Rose Gold card needs a white, silver or black mark. The mark can sit in any corner and needs clear space around it. A "prepaid" source-of-funds identifier may be required ([Visa Physical Card Brand Standards, Jan 2026](https://corporate.visa.com/content/dam/VCOM/corporate/about-visa/documents/visa-physical-card-brand-standards-jan2026.pdf); [Visa Fundamental Brand Standards, Sep 2025](https://corporate.visa.com/content/dam/VCOM/corporate/about-visa/documents/visa-brand-standards-sept2025.pdf)). Detailed product rules sit in Visa's private client portal, so your bank or program manager submits the designs.
- **"Platinum" as a name:** Visa sells a product tier called "Visa Platinum", so printing "Platinum" on a prepaid card may be restricted. Ask your bank. **[UNVERIFIED]**
- **Approval flow:** you design → the program manager checks it → the **issuing bank approves** → the **network approves** → the manufacturer makes a pre-production sample → the bank or network signs off → secure personalisation bureau → mailing. **Each finish is a separate design approval.**
- **Who makes them:** CompoSecure (dominant; makes most Chase and Amex metal cards, so it favours large programs), CPI Card Group, Idemia, Thales, G+D, Kona I ([Good Investors](https://www.thegoodinvestors.sg/company-notes-series-9-composecure/); [Dataintelo](https://dataintelo.com/report/metal-payment-card-market)).
- **Budget if each finish needs its own 2,500-card run:** 7,500 cards × $5–15 is **about $37k–113k**, plus design and setup. **[UNVERIFIED: ask Stripe whether the minimum is per design.]** Lead time is roughly **8–16 weeks** from approved art **[UNVERIFIED estimate]**.
- **Cheaper start:** launch with virtual cards in all three colourways (digital art is cheap), then make metal **Nano Black** the first physical card for top-tier members.

### What the Finesse app must build

1. **Onboarding and KYC:** collect name, DOB, address, SSN, and accept the disclosures before account opening. Use the provider's hosted or API KYC, and handle failed or manual-review cases.
2. **Loading money:**
   - ACH pull from a linked bank (e.g. via Plaid) and/or a debit card pull, **straight into the bank-held account, never through Finesse's own account**;
   - load limits and holds;
   - optional direct deposit (account and routing numbers).
3. **Card management:** issue a virtual card instantly, add to Apple Pay / Google Pay, order the physical card in the chosen finish, freeze/unfreeze, PIN, spending controls.
4. **Ledger and reconciliation:** keep your own read-only mirror of balances and transactions from the provider's webhooks, and reconcile daily against the provider. The provider's ledger is the source of truth.
5. **Rewards engine:** decide which purchases qualify (Finesse transactions), apply caps, credit cashback from Finesse's account after the refund window, and claw back on refunds.
6. **Statements and history:** transaction history and electronic statements to satisfy Reg E's periodic-statement alternative.
7. **Disputes and support:** an in-app "report a problem" flow routed to the provider within Reg E timelines; lost/stolen card handling; complaint logging.
8. **Closing an account:** a way to pay out the remaining balance; dormant-balance handling.
9. **Marketing guardrails:** "not a bank" disclosure on every money screen, plus bank-approved copy.

### Step-by-step timeline from today (Oct 2026)

| When | Step |
|---|---|
| **Weeks 0–2 (Oct 2026)** | Confirm the issuer on your Grifols card. Engage fintech counsel. Write the program brief. Decide how dating is positioned. Contact Stripe Issuing sales (consumer prepaid preview), Highnote and Lithic. Optionally book a J.P. Morgan Innovation Economy banker. |
| **Weeks 2–8 (Nov–Dec 2026)** | Partner due diligence: submit documents and the compliance package; appoint a fractional compliance officer; bank review of the vertical; negotiate pricing and revenue share; sign the program agreement. |
| **Weeks 6–16 (Dec 2026–Feb 2027)** | Build in sandbox: KYC flow, loading, ledger, rewards, disputes. Draft disclosures and the cardholder agreement. Submit card art (3 designs) for bank and network approval. |
| **Weeks 12–24 (Jan–Apr 2027)** | Bank sign-off on marketing and disclosures. Certification and testing. CFPB agreement submission within 30 days of offering. Pilot with friends-and-family virtual cards. |
| **~Q2 2027** | Public launch with virtual cards. |
| **~Q2–Q3 2027** | Metal cards ship once samples are approved and production finishes. |

Benchmarks for a 5–8 month total: Marqeta says 4–6 months; Galileo says 6–7 months; implementation guides say 3–6 months ([Marqeta guide](https://www.marqeta.com/resources/program-management-guide); [PaymentsJournal](https://www.paymentsjournal.com/from-idea-to-swipe-how-to-launch-a-winning-card-program/)).

---

## Sources

All sources were reached through web search on 12 Oct 2026. The date in brackets is the page or event date as reported.

**Chase / J.P. Morgan**
- J.P. Morgan Prepaid Card [Mar 2024] – https://www.jpmorgan.com/payments/solutions/prepaid-card
- J.P. Morgan: How Prepaid Card can solve B2C flow challenges – https://www.jpmorgan.com/insights/treasury/cards-expense-management/streamline-payments-prepaid-card
- J.P. Morgan Payments contact – https://www.jpmorgan.com/payments/contact-us
- J.P. Morgan Startup Banking – https://www.jpmorgan.com/commercial-banking/startups
- JPM Embedded Payments docs – https://developer.payments.jpmorgan.com/docs/embedded-finance-solutions/embedded-payments
- PYMNTS, JPM and Walmart embedded finance [24 Mar 2025] – https://www.pymnts.com/news/payment-methods/2025/jpmorgan-chase-and-walmart-introduce-embedded-finance-for-marketplace-sellers/
- JPMC IR, Chase to become Apple Card issuer [7 Jan 2026] – https://www.jpmorganchase.com/ir/news/2026/chase-to-become-new-issuer-of-apple-card
- Chase–DoorDash co-brand – https://media.chase.com/news/Chase-DoorDash-Mastercard-Announce-Partnership
- JPMC IR, exit from prepaid card business [Jan 2014] – https://www.jpmorganchase.com/ir/news/2014/id-818125
- CNBC [9 Jan 2014] – https://www.cnbc.com/2014/01/09/jpmorgan-chase-plans-to-exit-prepaid-card-business.html
- Digital Transactions, Chase Liquid replaced [20 Mar 2019] – https://www.digitaltransactions.net/chase-replacing-prepaid-liquid-card-with-a-bank-account/
- JPM Commercial Banking segments – https://www.calstatela.edu/sites/default/files/JP%20Morgan%202025%20CB%20Internship%20Flyers.pdf
- Chase First Banking reviews – https://www.finder.com/banking/chase-bank/chase-first-banking ; https://www.moneycrashers.com/chase-first-banking-review/

**Grifols card identification**
- Grifols, Why we compensate – https://www.grifolsplasma.com/en/importance-of-plasma/why-we-compensate
- Chase Prepaid Card Grifols (low-quality indexed page) – https://ftp.kontos.com/QAf/675/new_bvpaqe_chase_prepaid_card_grifols
- Grifols Plasma Card Chase (low-quality) – https://volta.temple.edu/dwd/grifols-plasma-card-chase
- Grifols card login (low-quality) – https://loginslink.com/grifols-card-login
- Inverse, plasma donor prepaid cards [~2015] – https://www.inverse.com/article/7618-the-10-bleed-how-plasma-donors-got-stuck-with-prepaid-card-fees-and-why-it-matters
- prepaid.chase.com unofficial guide – https://sites.google.com/view/prepaidchasecom-logintoyouracc/home

**Platforms**
- Stripe consumer prepaid docs – https://docs.stripe.com/issuing/consumer-prepaid-debit-cards
- Stripe Issuing consumer – https://stripe.com/issuing/consumer
- Stripe Consumer Prepaid Card terms – https://stripe.com/legal/consumer/prepaid-debit-card
- Stripe Issuing pricing – https://stripe.com/en-sk/issuing
- Stripe physical cards / custom bundles – https://docs.stripe.com/issuing/cards/physical
- Stripe restricted businesses – https://stripe.com/en-mx/legal/restricted-businesses
- Stripe Financial Accounts requirements – https://edge-docs.stripe.com/financial-accounts/connect/requirements
- Highnote consumer prepaid – https://highnote.com/blog/highnote-product-spotlight-issue-consumer-prepaid-cards-with-highnote ; https://highnote.com/docs/basics/get-started/consumer-prepaid
- Lithic + Stearns [2026] – https://www.lithic.com/blog/lithic-expands-partner-bank-network-with-addition-of-stearns-bank
- Contrary Research on Lithic [~2023] – https://research.contrary.com/company/lithic
- Marqeta program management guide – https://www.marqeta.com/resources/program-management-guide
- Marqeta managed program docs – https://www.marqeta.com/docs/developer-guides/building-your-managed-card-program
- SoFi Q4 2024 release (Galileo) – https://www.sec.gov/Archives/edgar/data/1818874/000181887425000006/q42024earningsrelease.htm
- Unit layoffs [Jun 2024] – https://www.bankingdive.com/news/unit-finance-cuts-15-percent-staff/719266/
- Axios on Unit [May 2024] – https://www.axios.com/pro/fintech-deals/2024/05/28/unit-regulatory-scrutiny-banks-baas
- Synctera MSB – https://www.thisweekinfintech.com/p/exclusive-synctera-becomes-a-money-services-business-making-a-long-term-bet-on-baas
- Synctera funding [Mar 2025] – https://finovate.com/baas-provider-synctera-secures-15-million-in-funding/
- Treasury Prime pivot [29 Feb 2024] – https://www.fintechnexus.com/fintech-nexus-newsletter-february-29-2024-treasury-prime-cuts-staff-and-pivots-to-a-direct-approach-with-banks/
- Increase card programs – https://increase.com/documentation/launch-a-card-program
- Column card programs – https://docs.column.com/guides/card-programs/
- ConnectPay platforms roundup [2026] – https://connectpay.com/blog/card-issuing-platforms/

**Sponsor banks and Synapse**
- BoldRails Sponsor Bank Register [Aug 2026] – https://boldrails.com/resources/sponsor-bank-acceptance
- Fed action on Evolve [Jun 2024] – https://www.bankingdive.com/news/federal-reserve-synapse-partner-evolve-enforcement-action-aml-risk-fintech-baas-compliance/719027/
- FDIC orders on Sutton and Piermont [Feb 2024] – https://www.americanbanker.com/news/fdic-rebukes-sutton-bank-piermont-bank-over-fintech-partners
- Rupture Labs, Sutton [Aug 2026] – https://rupturelabs.io/companies/sutton-bank
- Blue Ridge order terminated [Nov 2025] – https://www.bankingdive.com/news/occ-terminates-blue-ridge-bank-consent-order/805617/
- Lead Bank profile – https://wiki.private.law/en/lead-bank
- Dave moves to Coastal [2025] – https://www.bankingdive.com/news/dave-coastal-community-bank-team-up-in-pivot-away-from-evolve/741683/
- NCLC comments, Pathward [Oct 2024] – https://www.nclc.org/wp-content/uploads/2024/10/2024.10.30_Comments_Bank-fintech-lending-risks-comments-NCLC-CRL-SBPC.pdf
- CFPB sues Synapse [Aug 2025] – https://www.bankingdive.com/news/cfpb-sues-synapse-plans-use-victims-fund-pay-end-users/758776/
- Synapse bankruptcy dismissed [~Nov 2025] – https://www.americanbanker.com/news/synapse-bankruptcy-dismissed-cfpb-may-start-paying-victims

**Regulation**
- 12 CFR 1005.18 – https://www.consumerfinance.gov/rules-policy/regulations/1005/18/
- CFPB Prepaid small-entity guide [Apr 2019] – https://files.consumerfinance.gov/f/documents/cfpb_prepaid_small-entity-compliance-guide.pdf
- FinCEN FIN-2012-R003 – https://www.fincen.gov/sites/default/files/administrative_ruling/FIN-2012-R003.pdf
- FinCEN prepaid access FAQ [2011] – https://www.fincen.gov/system/files/2021-07/20111102_1.pdf
- Venable, FBO accounts [2023] – https://www.venable.com/insights/publications/2023/01/fbo-accounts-what-banks-and-fintechs-need
- JFC Attorneys, money transmission [2026] – https://jfcattorneys.com/en/news/money-transmission-usa-licencias-fintech-2026
- FDIC custodial rule, Unified Agenda – https://www.reginfo.gov/public/do/eAgendaViewRule?pubId=202510&RIN=3064-AG07&operation=OPERATION_PRINT_RULE
- Steptoe on FDIC withdrawals [Mar 2025] – https://www.steptoe.com/en/news-publications/fdic-board-of-directors-rolls-back-several-biden-era-rulemaking-actions.html
- FDIC Part 328 [Federal Register, Nov 2025] – https://www.federalregister.gov/documents/2025/11/28/2025-21461/fdic-official-signs-and-advertising-requirements-false-advertising-misrepresentation-of-insured
- Reg II exemptions §235.5 – https://www.bankersonline.com/book/export/html/145595
- Visa US interchange schedule [2026] – https://usa.visa.com/dam/VCOM/download/merchants/visa-usa-interchange-reimbursement-fees.pdf
- ABA on Corner Post appeal [Jan 2026] – https://bankingjournal.aba.com/2026/01/aba-associations-urge-appeals-court-to-reverse-debit-card-interchange-fee-ruling/
- PayKings on Reg II [Sep 2026] – https://paykings.com/blog/debit-interchange-cap-regulation-ii-2026/
- Unit interchange guide – https://www.unit.co/guides/ultimate-guide-interchange-revenue
- Synctera interchange guide – https://www.synctera.com/post/interchange-revenue-guide
- Visa VIRP (LegitScript) – https://www.legitscript.com/regulatory-and-card-brand-compliance/visa-integrity-risk-program/
- Segpay on VIRP fees – https://segpay.com/blog/understanding-visas-new-pricing-high-risk-tiers/
- Forbes Advisor, rewards tax – https://www.forbes.com/advisor/credit-cards/are-credit-card-rewards-taxable/

**Card design and manufacturing**
- Visa Physical Card Brand Standards [Jan 2026] – https://corporate.visa.com/content/dam/VCOM/corporate/about-visa/documents/visa-physical-card-brand-standards-jan2026.pdf
- Visa Fundamental Brand Standards [Sep 2025] – https://corporate.visa.com/content/dam/VCOM/corporate/about-visa/documents/visa-brand-standards-sept2025.pdf
- Arroweye Visa design guide [~2021] – https://www.arroweye.com/wp-content/uploads/2021/09/Visa-Plastic-Card-Artwork-Design-Guide_V9.pdf
- Dataintelo, metal card market – https://dataintelo.com/report/metal-payment-card-market
- Accio, metal cards [2026] – https://www.accio.com/business/metal-cards-with-chip
- CompoSecure notes – https://www.thegoodinvestors.sg/company-notes-series-9-composecure/
- PVD finishes guide – https://www.printpeppermint.com/guides/metal/metal-business-cards-guide

**Cost and timeline benchmarks (low reliability)**
- Business-plan template – https://avvale.co.uk/pages/prepaid-credit-card-business-plan-template
- Fyatu pricing comparison – https://fyatu.com/pricing/
- PaymentsJournal (Galileo timeline) – https://www.paymentsjournal.com/from-idea-to-swipe-how-to-launch-a-winning-card-program/
