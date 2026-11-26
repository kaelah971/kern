# Kern post 2 — the vendor receipt

Attach **`docs/screenshots/04-receipt.png`** or a short clip from the demo.

## Post

> A customer says: “Your ad promised free shipping. I was charged $9.”
>
> The vendor has a screenshot, a support ticket, and no way to prove what the checkout actually did.
>
> That is the gap I built Kern to close.
>
> Every discount is a promise: free shipping over $50, 20% off, a member price. The ad makes it; the checkout is where it becomes real. But the ad platform sees the click, analytics sees the order, the test sees the code, and support sees the complaint after the customer is already angry. Nobody sees the promise at the rendered checkout for the exact cart.
>
> Kern freezes the ad and the merchant’s interpretation into a contract. It builds the $60 eligible cart, the exact $50 boundary and the $35 control. It sends @kane_cli through the real store and reads the shipping quote the customer sees. The oracle decides; the agent does not grade itself.
>
> In the demo, the pre-repair checkout charged $9 on the $60 and $50 carts. The $35 control paid $9 correctly. One line of shipping code was wrong. Pi made the bounded fix; a human merged it; Kane reran the same six objectives. $60 and $50 came back $0. The control stayed $9. All 6/6 objective hashes matched. The gate opened.
>
> The part I care about most is the receipt. When something goes wrong, the vendor can show the promise, the cart, the quote, the code revision and the evidence — and say exactly what the test does not prove. Not a recording of every shopper. A reproducible customer-side record for the conditions that matter.
>
> That is what @testmuai’s Kane CLI makes possible: a real browser witness, not a logo.
>
> Live: https://tryoutkern.vercel.app  
> Repo: https://github.com/kaelah971/kern
>
> #KaneCLIHackathon #KaneCLI

## Image / alt text

`docs/screenshots/04-receipt.png` — the Promise Receipt. Alt text: “Kern Promise Receipt showing the HONORED post-repair audit, the $60 and $50 carts at $0.00, the $35 control at $9.00, the one-line patch, human approval and 6/6 objective hashes.”

If posting as a thread, split after “The oracle decides; the agent does not grade itself.”
