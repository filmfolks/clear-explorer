# Paste-ready submission — Superteam Earn: "Redesign Your Favourite App on Solana"
Listing: https://earn.superteam.fun/listing/redesign-your-favourite-app-on-solana
Deadline: 23 Oct 2026, 11:59 PM IST. Region: India only. Prizes: 700 / 500 / 300 USDC.

## Main link field
https://filmfolks.github.io/clear-explorer/site/   (the Figma link goes here instead, if you made one)

## Q1. Which app did you redesign, and which features did you pick?
Solana Explorer (explorer.solana.com). I redesigned the transaction detail page (/tx/<signature>), which is where every wallet's "view transaction" link sends you. Features: (1) a plain-language "what happened" headline with Paid → Got cards, (2) a "who gained and who paid" net-balance view that replaces the 21-row account list, (3) a step-by-step explanation of each instruction, (4) failed-transaction explanations (slippage, insufficient funds, compute, expired), (5) a warning for new or unverified tokens, and (6) a mobile layout with a sticky Copy / Share / Technical bar. All raw data is still there, collapsed under "Technical details". The live prototype works on real mainnet transactions: paste any signature.

## Q4. What was the biggest problem you found in the current design, in 2–3 sentences?
The Explorer never tells you what happened. It opens with 15 rows of protocol data (blockhash, slot, compute units, bytes) and a list of 21 accounts, so a new user can't tell whether they just swapped, sent or received money, or why a transaction failed. On mobile the 88-character signature takes five lines and the useful information sits four screens down.

## Q3. Live link to your redesign (optional)
https://filmfolks.github.io/clear-explorer/site/

## Anything else / write-up (if there's a free-text field)
Full write-up with before/after screens (desktop and mobile) and the reasoning behind 10 design decisions: https://github.com/filmfolks/clear-explorer/blob/main/WRITEUP.md
