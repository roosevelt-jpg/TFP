# Retiring the waitlist

Once payments are live the site stops being a waitlist, and the `Waitlist *`
custom fields in GHL go with it. This is what has to happen first, because
six of the nine intake answers currently have nowhere else to go.

## The blocker

The coaching form collects nine answers. Only three have a programme field in
GHL today:

| Answer | Waitlist field | Programme field |
|---|---|---|
| goal | Waitlist Goal | **Goal** ✓ |
| sex | Waitlist Sex | **Gender** ✓ |
| weight | Waitlist Weight Kg | Weight (see below) |
| age | Waitlist Age | none |
| height | Waitlist Height Cm | none |
| goal weight | Waitlist Goal Weight Kg | none |
| diet | Waitlist Diet | none |
| injuries | Waitlist Injuries | none |
| level | Waitlist Level | none |

Stop writing the `Waitlist *` fields today and the coach loses six answers.

**Weight is not a straight swap.** `Weight` (`contact.weight`) looks like the
bot's ongoing weekly check-in field rather than an intake snapshot. Writing a
purchase-time weight into it could overwrite her tracking. Confirm with Indigo
before mapping it.

## What Indigo needs to create

Six programme fields, or confirmation that the coach reads the `Waitlist *`
ones and they should simply be renamed:

- Age (numeric)
- Height (numeric, cm)
- Goal Weight (numeric, kg)
- Diet (dropdown: the values our form offers)
- Injuries (long text)
- Level (dropdown: Beginner / Intermediate / Advanced)

Renaming is cheaper and keeps the ids stable, so nothing in our code changes.
Ask that first.

## Then, in this repo

1. Point the remaining answers at the new ids in
   `src/lib/ghl/membership-fields.ts`, alongside goal and sex.
2. Drop the `toGhlCustomFields` call from `intakeFields`.
3. Delete `src/lib/ghl/fields.ts` and the waitlist sync task once the waitlist
   form itself is gone.

## Not just GHL

Retiring the waitlist also touches: the `/join` route and its form, the
`Waitlist` table and its `?t=` prefill on checkout, `sync-ghl-contact`, and the
`waitlist` tag we currently remove on purchase. None of it blocks launch — the
waitlist can keep running alongside payments — but it is all dead weight
afterwards.
