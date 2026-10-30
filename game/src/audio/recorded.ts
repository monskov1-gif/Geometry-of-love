// Recorded music made for the game by the author (Suno), stored as MP3 in
// assets/music; originals in materials/music. Several ids may share one file:
// they play different sections of it, and switching between them continues
// the same playback instead of restarting (cutscene → chase).
import corruptedPulse from '../assets/music/corrupted-pulse.mp3';
import finalHush from '../assets/music/final-hush.mp3';
import melodySong from '../assets/music/melody-song.mp3';

export interface RecordedTrack {
  url: string;
  /** Where playback starts when the track begins fresh (seconds). */
  start: number;
  /** Loop section; the end defaults to the end of the file. */
  loopStart: number;
  loopEnd?: number;
  /** Mix level against the synthesised tracks. */
  gain: number;
  /** Play once, then crossfade to this theme (a song); without it the track loops. */
  then?: string;
}

export const RECORDED: Record<string, RecordedTrack> = {
  // «メロディのまほう»: Melody sings her welcome song when the app first starts (chapter 2),
  // with her own voicebank (scripts/voice/sing_song.py); once, then her app theme carries on.
  'melody-song': { url: melodySong, start: 0, loopStart: 0, gain: 0.95, then: 'app-sweet' },
  // «The Final Hush» — slow and sad: the death of the Ruler (chapter 11).
  'final-hush': { url: finalHush, start: 0, loopStart: 0, gain: 0.9 },
  // «Corrupted Pulse»: the quiet first 20 s build-up under Melody's
  // transformation (chapter 14), then the chase on the section after the rise at ~21 s.
  'corrupted-pulse-intro': { url: corruptedPulse, start: 0, loopStart: 21, gain: 0.85 },
  'corrupted-pulse': { url: corruptedPulse, start: 21, loopStart: 21, gain: 0.85 },
};

export const RECORDED_IDS = Object.keys(RECORDED);
