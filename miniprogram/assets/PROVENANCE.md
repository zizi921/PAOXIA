# Runner

Generated using ImageGen from the user-approved reference `output/approved-concept.png` on 2026-09-25. The extracted drawing preserves the character, blue trousers, yellow soles and motion strokes; it is a generated extraction, not an exact pixel crop.

Prompt: Extract only the large running character illustration from the LEFT phone in the provided approved design. Preserve EXACT silhouette, oversized forward shoe, scribbled black charcoal line, white shirt, blue scribbled pants, yellow scribbled sole, three black motion strokes on the left. No redesign. Output a tight portrait illustration asset with a transparent background, full character and motion strokes visible, minimal margin. Absolutely no text, buttons, phone frame, UI, paper backdrop or shadow. This is for a native WeChat miniprogram.

## Month resting pose

`runner-rest.png` was generated with the built-in ImageGen tool on 2026-09-26 using `runner.png` as the exact character and style reference. It gives the Month summary a seated post-run pose while the Year summary keeps the original running pose. The full production prompt is stored in `runner-rest-prompt.txt`.

## Days Out pose set

`history-runner-01.png` through `history-runner-10.png` form the stable per-record pose set used on the Days Out detail page. The first two are optimized copies of the approved running and resting assets. The other eight were generated with the built-in ImageGen tool on 2026-09-27 using both approved assets as style and character references.

Prompt set: draw the same round-headed runner with three hair strokes, white top, blue crayon trousers, yellow soles and thick black charcoal lines on a transparent background. The eight actions are sprinting, celebrating with raised arms, catching breath with hands on knees, stretching a calf, tying a shoelace, lying down tired, walking and waving, and jumping playfully. No text, scenery, border, UI or extra objects.

# Typography

Inter Latin subset, sourced from Google Fonts on 2026-09-27 under the SIL Open Font License. The license is included as `Inter-OFL.txt`, and the font is embedded in `styles/inter.wxss` as a data URL for the English interface.

## Additional notice icons

`notice-outline-car.svg`, `notice-outline-bicycle.svg`, `notice-outline-bird.svg`, and `notice-outline-house.svg` are original vector icons authored for PAOXIA, with transparent backgrounds and rounded black strokes matching the existing notice set.

## Colored notice icons

`notice-color-*.png` (12 icons) were generated with OpenAI image generation from the user-provided existing notice grid and approved in this conversation on 2026-10-15. The approved sheet was extracted into individual 128px assets with transparent exterior padding. Labels remain native localized UI text. These assets are shared by recap and history; the original outline assets remain available.

The dog icon was subsequently edited with OpenAI image generation to use white fur, retaining its black outline and transparent exterior.

## Additional history poses

`history-runner-11.png` through `history-runner-15.png` were generated with OpenAI image generation on 2026-10-15 using a contact sheet of the existing ten mascots as the visual reference. Poses: side stretch, quadriceps stretch, cross-legged rest, hands-behind-back walk, and hands-on-knees rest. Extracted into transparent 320px square assets for the existing history illustration slot.

`history-runner-16.png` through `history-runner-20.png` were generated in a second batch with the same reference and processing: shoulder stretch, seated forward stretch, side lunge, skipping, and reclining rest.

`history-runner-21.png` through `history-runner-25.png` were generated with the same reference and processing: airplane arms, relaxed squat, hand-on-chest wave, seated knee hug, and tiptoe overhead stretch.

The flower icon was edited with OpenAI image generation to use coral-red petals, preserving the green leaves and black outline.

## Year summary poses

`year-runner-01.png` through `year-runner-05.png` were generated with OpenAI image generation from the user-provided mascot reference: relaxed sitting, palms-together greeting, back stretch, kneeling rest, and butterfly stretch. Extracted as transparent 320px palette PNGs. These five are used only in Year summaries alongside the existing running pose; the Day collection remains 25 poses.

## Month summary poses

`month-runner-01.png` through `month-runner-12.png` are twelve new poses generated with OpenAI image generation using the user-provided mascot reference. Assigned in calendar order: holding a heart, walking with a flower, sitting on a rock, one-arm stretch, looking into the distance, tending a sprout, hands behind head, seated wave, knee hug, reading, holding a cup, overhead heart. Extracted as transparent 240px palette PNGs, used exclusively for Month summaries.
