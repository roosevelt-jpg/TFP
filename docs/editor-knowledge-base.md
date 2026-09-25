# Editor knowledge base

Versioned house rules for in-house editing. The editor follows this document; the CTO agent writes briefs from it and checks renders against the same source (`src/lib/content/qc-checks.ts`).

**Change control:** Kane approves changes to §2, §5 and §6. Date every change. CTO uses the new version from the next brief.

---

## 1. How work arrives

1. CTO (or Lemoni for creator clips) drops source media into Frame.io with a locked edit brief.
2. Import through the Frame.io Premiere panel. Keep Frame folder / asset naming as delivered.
3. Hand back the final render to the same Frame asset (new version). Tag the version in Frame comments with the brief ID.
4. Turnaround: per Weekly Posting Plan deadline on the brief. Flag blockers in Frame before the deadline, not after.

What arrives with every job: clips, locked brief, target platforms, deadline, reference examples (Frame `Examples/`).

---

## 2. Non-negotiables

- **Never re-frame Kane's talking-head** — no crop, zoom or matte on his face.
- **Edit from Kane's cut** — grade and punch-ins on his file; do not rebuild sync from scratch.
- **Brief locked before first render** — no speculative first pass.
- **Verify by transcribing the rendered file**, not the cut list. Automated QC expects a transcript that matches the brief.

---

## 3. House cut style

### Spoken / talking-head

- Tight-cut: remove off-message content.
- Captions on.
- Pace to the target platform length (§4).

### Multi-clip long-form / sales

- Clip order and section titles from the brief.
- No clipped word endings.
- No repeated sentences surviving to the final render.

---

## 4. Platform formats

| Platform | Aspect | Notes |
|---|---|---|
| Reels / TikTok / Shorts | 9:16 | Safe zones for UI chrome; cover frame required when the brief asks |
| YouTube long-form | 16:9 | End card with complete silver wordmark |

Export settings: match Frame / Premiere starter presets per platform. Captions burned where the brief requires them.

---

## 5. Brand look

- **Logo:** only the complete silver wordmark file. Other logo files are cropped — do not use them.
- **Captions:** house caption style (Essential Graphics template in the starter kit).
- **End cards:** TFP complete silver wordmark only.
- **Colour:** warm black / bone / silver base; orange only for calls to action (confirm any gold-accent legacy with Kane before using).

---

## 6. Compliance for editors

Words and on-screen text that **cannot** appear: hormone, testosterone, TRT, anabolic, steroid, Clomid, enclomiphene, and other medical claims.

- TikTok is a strict tier — assume rejection for banned claims.
- Creator licence must be confirmed in the affiliate register before creator likeness ships.
- Automatic compliance (OCR + ASR + caption) will FAIL with a `t=MM:SS` marker when banned terms appear.

---

## 7. Footage handling

- Probe iPhone rotation metadata **before** any crop or reformat.
- Masters never recompressed for archival.
- Versioning: `v1`, `v2`, … on Frame.
- Masters and exports live in the Frame hub folders defined for the week.

---

## 8. Quality checklist before hand-back

Mirrors CTO automated / manual checks:

| Item | Mode |
|---|---|
| Kane talking-head frame untouched | Automated |
| Transcript matches brief (no clipped / repeated words) | Automated |
| Captions correct and readable | Manual |
| Logo = complete silver wordmark | Manual |
| Format, length, safe zones correct per platform | Automated |
| No restricted words on screen or in captions | Automated |
| Cover / thumbnail frame set if required | Manual |
| Brief reference ID noted in Frame.io comment | Manual |

---

## 9. Premiere starter kit

- Project template
- Export presets per platform
- Caption style templates (Essential Graphics)
- Logo and font files
- Grade preset

Store binaries in Frame.io starter kit folder; this markdown is the rules source of truth in-repo.

---

## 10. Examples

Approved reference edits per content type live under Frame.io `Examples/`:

- talking-head
- product
- UGC
- training
- Reels / Shorts
- gym cue
- kitchen / meal prep
- WhatsApp coach demo
- week check-in

Past mistakes (what was wrong) are tagged in Frame comments and surfaced weekly when the same `CHANGES` reason repeats.
