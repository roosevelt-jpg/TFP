# Editor knowledge base

**Source of truth for in-house Premiere editing.** The editor follows this document; the CTO agent writes briefs from it and checks renders against it. Kane approves changes to Non-negotiables, Brand look, and Compliance.

Version: starter · Part 07 §12 · 2026-09-25

---

## 1. How work arrives

What the CTO sends with each job:

- Source clips (Frame.io hub or linked master)
- **Locked brief** (format, length, arc, shot order, VO, platforms, deadline)
- Reference examples (approved edits of the same content type)
- Naming: `YYYY-MM-DD_type_platform_vN`

**Import:** Frame.io panel in Premiere Pro → bins by filming day.  
**Hand-back:** share the sequence/version to Frame.io for review; do not email masters.  
**Turnaround:** as stated on the brief; flag blockers the same day.

---

## 2. Non-negotiables

1. **Never re-frame Kane’s talking-head.** No crop, zoom, or matte on his face. Keep his exact frame.
2. **Edit from Kane’s cut.** Grade and punch-ins go on his file; never rebuild the sync from scratch.
3. **Brief locked before first render.** Format, arc, shot order, and VO must be set first.
4. **Verify by transcribing the rendered file**, not the cut list — catch clipped words and repeated sentences.
5. Masters are never recompressed for storage convenience.

---

## 3. House cut style

**Spoken / talking-head**

- Tight-cut: remove off-message tangents
- Captions on (burned-in or sidecar per platform brief)
- Pace to the target length on the brief

**Multi-clip long-form / sales**

- Respect brief clip order and section titles
- No clipped word endings
- No repeated sentences across joins
- End card: TFP complete silver wordmark only

---

## 4. Platform formats

| Platform | Aspect | Notes |
|---|---|---|
| Instagram Reels | 9:16 | Safe zones for UI; cover frame required |
| TikTok | 9:16 | Strictest compliance tier — see §6 |
| YouTube Shorts | 9:16 | Under Shorts length limit |
| YouTube long-form | 16:9 | Section titles OK; end card |

Export presets live in the Premiere starter kit (§9). Caption placement: lower-third safe zone; never over faces.

---

## 5. Brand look

- **Logo:** only the complete silver wordmark file. Other logo files are cropped — do not use them.
- **Fonts / caption style:** Essential Graphics templates in the starter kit.
- **Grade / LUT:** house grade preset unless the brief names another.
- **Lower thirds / end cards:** templates only; no improvised type.
- **Colour (confirm with Kane):** records disagree between gold accent vs warm black / bone / silver with orange CTAs only. Until confirmed, follow the locked design files in the starter kit.

---

## 6. Compliance for editors (no-gos)

**Must never appear** in speech, burned-in captions, titles, or on-screen text:

- Hormone / testosterone / TRT / anabolic / steroid claims
- Disease or medical claims
- Supplement claims outside TFP’s claims register

**TikTok** gets the strictest check (open policy history on the TFP account).  
**Creator UGC** requires a signed likeness licence before edit starts.  
A health-claim FAIL is never overridable by the editor — only Kane.

The automated compliance check will fail the same words; do not ship hoping review will miss them.

---

## 7. Footage handling

- Probe **iPhone rotation metadata** before any crop or reframe
- Versioning: `v1`, `v2`, … — never overwrite a shared review version
- Masters and exports live in the Frame.io hub (+ Google Drive archive for long-term)

---

## 8. Quality checklist before hand-back

- [ ] Kane talking-head frame untouched
- [ ] No clipped words / no repeated sentences (transcript of render matches brief)
- [ ] Captions correct and readable
- [ ] Logo = complete silver wordmark
- [ ] Format, length, safe zones correct per platform
- [ ] No restricted words on screen or in captions
- [ ] Cover / thumbnail frame set if required
- [ ] Brief reference ID noted in Frame.io comment

---

## 9. Premiere starter kit

Expected pack (Frame.io + shared drive):

- Project template
- Export presets per platform
- Caption style templates (Essential Graphics)
- Logo and font files
- Grade / LUT preset

If a file is missing, stop and ask — do not substitute.

---

## 10. Brief template (locked before first render)

```
BRIEF ID:
Content type:
Source asset / Frame.io link:
Platforms:
Target length:
Arc / shot order:
VO / captions notes:
Hook (first 1.5s):
End card:
Compliance notes:
Deadline:
Reference examples:
```

---

## 11. Examples

- **Approved:** reference edits per content type (talking-head, product, UGC, training) — linked from Frame.io `Examples/` bin.
- **Past mistakes (do not repeat):** re-framed talking-head; sync rebuilt; clipped words; render before brief lock; iPhone rotation wrong; cropped logo; burned-in testosterone caption.

---

## Change control

- Kane approves changes to §§2, 5, 6.
- Every change is dated; CTO uses the new version from the next brief.
- Repeated `CHANGES` reasons (framing, pacing, captions, brand, compliance) feed weekly KB update proposals.
