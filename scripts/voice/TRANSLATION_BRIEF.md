# Japanese voice lines — translation brief

The game text stays Russian on screen; the voice speaks natural Japanese (dub with subtitles).
Source: game/src/content/voice/registry.json (`lines`: id → { speaker, ru, phase, where[] }).
`where` = "<scene id>#<step index>" (scene files: game/src/content/story/act1|act2|act3/*.ts) or
"cutscene:<id>#<cue>" (game/src/content/cutscenes/*.ts). Read the scene around each line for context.

Write a JSON object id → { "ja": "...", "yomi": "...", "emotion": "..." } for your part only.

- ja: natural spoken Japanese a native speaker would say in this situation, in the character's voice
  (not word-for-word). Keep meaning, emotion, relationship and dramatic function. Short lines stay short.
- yomi: the SAME sentence as the voice must pronounce it, in HIRAGANA (katakana allowed for loanwords),
  no kanji, no Latin letters, no digits (write numbers out in kana). Keep 、。？！ and use spaces between
  phrases. Long vowels: ー or the vowel kana. Small っ ゃ ゅ ょ ぁ ぃ ぅ ぇ ぉ allowed. Avoid rare sounds
  ゔ, てぃ, でぃ, とぅ, どぅ if a common reading exists (write めろでぃ only for the name).
- emotion: one of calm | happy | sweet | sad | scared | angry | tense | whisper | excited | cold
  (cold = Melody's flat, unsettling politeness in late phases).

Glossary (use exactly, in ja and yomi):
- Дамео → ダメオ / だめお ; Мелоди → メロディ / めろでぃ ; Сацуки → サツキ / さつき
- Калькулятор (Пушин) → 電卓 / でんたく ; his name Пушин → プーシン / ぷーしん
- Линейка → 定規 / じょうぎ ; Циркулёнок → コンパス / こんぱす ; Ластик → 消しゴム / けしごむ
- Песочница → 砂場 / すなば ; приложение → アプリ / あぷり ; геометрия → 幾何 / きか
Speech styles: Melody — sweet teacher-girlfriend, 〜ね/〜よ, calls him ダメオくん; later possessive, cold.
Dameo — rough casual male (俺, だろ, うるせえ), bitter, insecure; softer with friends later.
Calculator/Pushin — energetic, proud, a bit pompous (僕, 〜だ！計算済みだ！). Ruler — stern, precise,
polite-strict (〜です/〜だ). Compass — small, timid child (ぼく, 〜だよ…). Erasers — each simple,
short phrases; eraser-2 brave, eraser-1 gentle, eraser-3 nervous. Satsuki — calm, kind, polite (〜です).
