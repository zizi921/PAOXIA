# Runner

Generated using ImageGen from the user-approved reference `output/approved-concept.png` on 2026-09-25. The extracted drawing preserves the character, blue trousers, yellow soles and motion strokes; it is a generated extraction, not an exact pixel crop.

Prompt: Extract only the large running character illustration from the LEFT phone in the provided approved design. Preserve EXACT silhouette, oversized forward shoe, scribbled black charcoal line, white shirt, blue scribbled pants, yellow scribbled sole, three black motion strokes on the left. No redesign. Output a tight portrait illustration asset with a transparent background, full character and motion strokes visible, minimal margin. Absolutely no text, buttons, phone frame, UI, paper backdrop or shadow. This is for a native WeChat miniprogram.

## Month resting pose

`runner-rest.png` was generated with the built-in ImageGen tool on 2026-09-26 using `runner.png` as the exact character and style reference. It gives the Month summary a seated post-run pose while the Year summary keeps the original running pose. The full production prompt is stored in `runner-rest-prompt.txt`.

## Days Out pose set

`history-runner-01.png` through `history-runner-10.png` form the stable per-record pose set used on the Days Out detail page. The first two are optimized copies of the approved running and resting assets. The other eight were generated with the built-in ImageGen tool on 2026-09-27 using both approved assets as style and character references.

Prompt set: draw the same round-headed runner with three hair strokes, white top, blue crayon trousers, yellow soles and thick black charcoal lines on a transparent background. The eight actions are sprinting, celebrating with raised arms, catching breath with hands on knees, stretching a calf, tying a shoelace, lying down tired, walking and waving, and jumping playfully. No text, scenery, border, UI or extra objects.

# Typography

Caveat variable font, from https://github.com/google/fonts/tree/main/ofl/caveat. SIL Open Font License included as `Caveat-OFL.txt`. Embedded in `styles/handwriting.wxss` for the Run, Recap and Days Out. pages.

Kalam Regular and Bold Latin subsets, from https://github.com/google/fonts/tree/main/ofl/kalam. SIL Open Font License included as `Kalam-OFL.txt`. Embedded in `styles/typography.wxss` for the Home page.

Both families are bundled as data URLs, so no runtime network access is required.
