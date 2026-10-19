#!/usr/bin/env python3
"""Generate Galada's original, synthetic demonstration music and SVG artwork.

All melodies, synthesis, and visual compositions below were authored for this
project. No recordings, samples, artwork, or melodies from third parties are
used. Requires Python 3 and ffmpeg; uses no network and no Python dependencies.
Run from any directory: python3 scripts/generate_demo.py
"""

from array import array
import math
from pathlib import Path
import random
import shutil
import subprocess
import tempfile
import wave

ROOT = Path(__file__).resolve().parents[1]
MEDIA = ROOT / 'public' / 'media'
ART = ROOT / 'public' / 'artwork'
SR = 22050
DURATION = 24
TAU = math.tau

TRACKS = [
    ('antes-do-sol', 'Antes do sol', 'electronic', 57, 100),
    ('orbita-lenta', 'Órbita lenta', 'electronic', 62, 90),
    ('mar-de-dentro', 'Mar de dentro', 'ambient', 53, 80),
    ('horizonte-suspenso', 'Horizonte suspenso', 'ambient', 60, 80),
    ('chuva-na-varanda', 'Chuva na varanda', 'lofi', 55, 80),
    ('ultima-luz', 'Última luz', 'lofi', 58, 80),
]


def frequency(midi):
    return 440 * 2 ** ((midi - 69) / 12)


def synthesize(style, root, bpm, seed):
    """Make a quiet, melodic stereo sketch with an original pentatonic motif."""
    samples = SR * DURATION
    sound = array('f', [0]) * samples
    random_source = random.Random(seed)
    beat = 60 / bpm
    progression = [0, 5, 3, 7]

    def tone(start, length, midi, amplitude, voice='pad'):
        first = max(0, int(start * SR))
        last = min(samples, int((start + length) * SR))
        f = frequency(midi)
        attack = 0.32 if voice == 'pad' else 0.015
        for index in range(first, last):
            t = (index - first) / SR
            if voice == 'pad':
                envelope = min(1, t / attack) * min(1, (length - t) / 0.8)
                value = math.sin(TAU * f * t) + 0.28 * math.sin(TAU * f * 1.003 * t)
                value += 0.12 * math.sin(TAU * f * 2 * t)
                value *= envelope * 0.7
            elif voice == 'bell':
                value = (math.sin(TAU * f * t) + 0.2 * math.sin(TAU * f * 3 * t))
                value *= min(1, t / attack) * math.exp(-t * 3) * min(1, (length - t) / 0.07)
            else:
                value = math.sin(TAU * f * t) * min(1, t / 0.025)
                value *= min(1, (length - t) / 0.1) * math.exp(-t * 0.7)
            sound[index] += value * amplitude

    # Four evolving major-seventh and suspended chords with a low, warm bass.
    chord_length = DURATION / 4
    for measure, offset in enumerate(progression):
        chord_root = root + offset
        for interval in [0, 4, 7, 11]:
            tone(measure * chord_length, chord_length + 0.8, chord_root + interval,
                 0.052 if style == 'ambient' else 0.031)
        tone(measure * chord_length, chord_length, chord_root - 24,
             0.08 if style != 'ambient' else 0.045, 'bass')

    # A hand-written motif, not a quotation from any existing piece.
    motifs = [[12, 16, 19, 16, 14, 12, 7, 14], [19, 16, 14, 7, 12, 14, 16, 12]]
    step = beat if style == 'electronic' else beat * 2
    for note in range(int(DURATION / step)):
        start = note * step + (0.035 if style == 'lofi' and note % 2 else 0)
        degree = motifs[seed % 2][note % 8]
        chord_offset = progression[min(3, int(start / chord_length))]
        amplitude = 0.09 if style != 'ambient' else 0.065
        tone(start, 1.8 if style != 'ambient' else 3.0,
             root + chord_offset + degree, amplitude, 'bell')

    if style != 'ambient':
        for hit in range(int(DURATION / beat)):
            start = hit * beat
            first = int(start * SR)
            for j in range(min(int(0.22 * SR), samples - first)):
                t = j / SR
                kick = math.sin(TAU * (45 * t + 1.1 * (1 - math.exp(-28 * t))))
                sound[first + j] += 0.12 * kick * math.exp(-t * 24)
            # Soft brushed noise on alternating beats, with a swung hi-hat.
            noise_start = first + int((0.5 * beat + (0.028 if style == 'lofi' else 0)) * SR)
            for j in range(min(int(0.07 * SR), samples - noise_start)):
                t = j / SR
                sound[noise_start + j] += random_source.uniform(-1, 1) * 0.025 * math.exp(-t * 70)
            if hit % 2:
                for j in range(min(int(0.14 * SR), samples - first)):
                    t = j / SR
                    sound[first + j] += random_source.uniform(-1, 1) * 0.032 * math.exp(-t * 25)

    peak = max(abs(value) for value in sound) or 1
    gain = min(1.8, 0.74 / peak)
    delay = int(SR * (0.37 if style == 'ambient' else 0.23))
    output = array('h')
    for i, value in enumerate(sound):
        fade = min(1, i / (SR * 0.6), (samples - i) / (SR * 1.5))
        left_delay = sound[i - delay] * 0.15 if i >= delay else 0
        right_delay = sound[i - delay * 2] * 0.19 if i >= delay * 2 else 0
        left = math.tanh((value + left_delay) * gain) * fade
        right = math.tanh((value + right_delay) * gain) * fade
        output.extend((int(left * 28500), int(right * 28500)))
    return output


GRAIN = '''<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".14"/></feComponentTransfer><feBlend in="SourceGraphic" mode="soft-light"/></filter>'''


def cover(slug, title, number, background, light, dark, design):
    designs = {
        0: '<circle cx="260" cy="235" r="153" fill="url(#orb)"/><path d="M-10 350Q170 255 540 345V540H-10" fill="#451c13"/><path d="M-10 389Q230 300 540 383" fill="none" stroke="#fbab57" stroke-width="1" opacity=".4"/><ellipse cx="260" cy="235" rx="214" ry="55" fill="none" stroke="#f6c48c" stroke-width="16" transform="rotate(-32 260 235)"/>',
        1: '<g transform="translate(260 260) rotate(-27)"><ellipse rx="160" ry="199" fill="none" stroke="url(#orb)" stroke-width="70"/><ellipse rx="160" ry="199" fill="none" stroke="#d9d1fa" stroke-width="1" opacity=".6"/></g><circle cx="260" cy="260" r="56" fill="url(#orb)"/>',
        2: '<circle cx="257" cy="231" r="139" fill="url(#orb)"/><path d="M-20 310Q100 252 258 320T540 316V540H-20" fill="#1b575c"/><path d="M-20 365Q130 278 300 367T540 362V540H-20" fill="#2a7478"/><path d="M-20 422Q130 333 300 415T540 401V540H-20" fill="#143b43"/><path d="M-20 365Q130 278 300 367T540 362" fill="none" stroke="#a9c9ab" opacity=".55"/>',
        3: '<g transform="translate(260 256) rotate(-18)"><rect x="-143" y="-168" width="286" height="336" rx="143" fill="url(#orb)"/><ellipse cy="-42" rx="143" ry="62" fill="#212a40"/><ellipse cy="-43" rx="143" ry="62" fill="none" stroke="#d3d3e6" stroke-width="2" opacity=".5"/><path d="M-142 16Q0 116 142 16" fill="none" stroke="#c1c9e4" stroke-width="1" opacity=".4"/></g>',
        4: '<g transform="translate(260 270) rotate(-16)"><rect x="-150" y="-172" width="300" height="344" rx="6" fill="url(#orb)"/><g stroke="#623b30" stroke-width="11"><path d="M-98-162V160M-30-162V160M38-162V160M106-162V160"/></g><path d="M-150-15H150" stroke="#623b30" stroke-width="11"/></g><circle cx="287" cy="189" r="70" fill="#e4c19c" opacity=".55"/>',
        5: '<circle cx="256" cy="255" r="163" fill="url(#orb)"/><g stroke="#dfbc91" fill="none" opacity=".7"><ellipse cx="256" cy="255" rx="206" ry="52" transform="rotate(29 256 255)" stroke-width="2"/><ellipse cx="256" cy="255" rx="216" ry="64" transform="rotate(29 256 255)" stroke-width="1"/></g><path d="M0 420Q210 300 520 410V520H0" fill="#453226"/>',
    }
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="520" height="520" viewBox="0 0 520 520" role="img" aria-label="Arte original de {title}">
<defs>{GRAIN}<radialGradient id="back" cx="35%" cy="22%" r="90%"><stop stop-color="{background}"/><stop offset="1" stop-color="{dark}"/></radialGradient><radialGradient id="orb" cx="28%" cy="20%" r="80%"><stop stop-color="{light}"/><stop offset=".5" stop-color="{background}"/><stop offset="1" stop-color="{dark}"/></radialGradient></defs>
<rect width="520" height="520" fill="url(#back)"/><g filter="url(#grain)">{designs[design]}</g>
<g fill="{light}" font-family="Arial, sans-serif" font-size="10" letter-spacing="3" opacity=".8"><text x="28" y="36">GALADA LAB</text><text x="460" y="36">0{number}</text></g><path d="M28 475H492" stroke="{light}" opacity=".3"/><text x="28" y="497" fill="{light}" font-family="Arial, sans-serif" font-size="10" letter-spacing="2" opacity=".8">ESTUDOS SONOROS / 2026</text></svg>'''


HERO = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="600" viewBox="0 0 1100 600" role="img" aria-label="Paisagem abstrata original com um sol e anéis dourados sobre dunas">
<defs>{GRAIN}
<linearGradient id="sky" x2="1" y2="1"><stop stop-color="#172a26"/><stop offset=".52" stop-color="#374633"/><stop offset="1" stop-color="#797448"/></linearGradient>
<radialGradient id="glow"><stop stop-color="#d3a563" stop-opacity=".52"/><stop offset="1" stop-color="#d3a563" stop-opacity="0"/></radialGradient>
<radialGradient id="sun" cx="26%" cy="20%" r="85%"><stop stop-color="#f4c67e"/><stop offset=".43" stop-color="#c17a3a"/><stop offset=".8" stop-color="#804124"/><stop offset="1" stop-color="#41251c"/></radialGradient>
<linearGradient id="gold" x1=".12" y1="0" x2=".8" y2="1"><stop stop-color="#734c2f"/><stop offset=".23" stop-color="#e7c389"/><stop offset=".4" stop-color="#c99450"/><stop offset=".64" stop-color="#775030"/><stop offset=".86" stop-color="#e4b476"/><stop offset="1" stop-color="#987044"/></linearGradient>
<linearGradient id="sand" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#b77341"/><stop offset=".56" stop-color="#784329"/><stop offset="1" stop-color="#3a2d20"/></linearGradient>
<linearGradient id="foreground" x2="0" y2="1"><stop stop-color="#785136"/><stop offset="1" stop-color="#211e18"/></linearGradient>
<linearGradient id="shade"><stop stop-color="#152622" stop-opacity=".8"/><stop offset=".52" stop-color="#152622" stop-opacity=".15"/><stop offset="1" stop-color="#152622" stop-opacity="0"/></linearGradient>
<filter id="blur"><feGaussianBlur stdDeviation="18"/></filter>
</defs>
<rect width="1100" height="600" fill="url(#sky)"/>
<g filter="url(#grain)"><ellipse cx="810" cy="218" rx="390" ry="340" fill="url(#glow)"/>
<path d="M0 406Q174 301 364 369T705 330Q890 307 1100 373V600H0" fill="#525239"/>
<path d="M0 475Q235 348 470 404Q692 446 833 338Q960 285 1100 348V600H0" fill="url(#sand)"/>
<ellipse cx="823" cy="456" rx="191" ry="25" fill="#22251b" opacity=".65" filter="url(#blur)"/>
<g transform="translate(828 253)">
<ellipse rx="178" ry="73" transform="rotate(-32)" fill="none" stroke="#49371f" stroke-width="58"/>
<circle r="116" fill="url(#sun)"/>
<path d="M-155 103C-72 162 126 56 170-63" fill="none" stroke="url(#gold)" stroke-width="56" stroke-linecap="round"/>
<path d="M-165 91C-99 164 128 54 168-66" fill="none" stroke="#f1d5a0" stroke-width="1.4" opacity=".6"/>
<ellipse rx="178" ry="73" transform="rotate(-32)" fill="none" stroke="url(#gold)" stroke-width="3" opacity=".7"/>
</g>
<path d="M0 553Q153 418 351 481Q550 546 711 472Q896 380 1100 464V600H0" fill="url(#foreground)"/>
<path d="M0 553Q153 418 351 481Q550 546 711 472Q896 380 1100 464" fill="none" stroke="#c18b59" stroke-width="1.2" opacity=".4"/>
<path d="M685 544Q895 436 1100 508" fill="none" stroke="#b17b4d" opacity=".17"/>
</g><rect width="1100" height="600" fill="url(#shade)"/></svg>'''


def main():
    if not shutil.which('ffmpeg'):
        raise SystemExit('ffmpeg is required to encode the original demo audio.')
    MEDIA.mkdir(parents=True, exist_ok=True)
    ART.mkdir(parents=True, exist_ok=True)
    palettes = [
        ('#d96e34', '#ffce8c', '#4f271b'),
        ('#857a9f', '#e4d5f4', '#333047'),
        ('#5b9792', '#d0d6a6', '#153a3f'),
        ('#68789c', '#d7dfec', '#242c46'),
        ('#b07570', '#f1caa2', '#54362f'),
        ('#9c6043', '#edbc79', '#3a3026'),
    ]
    with tempfile.TemporaryDirectory(prefix='galada-demo-') as scratch:
        for index, (slug, title, style, root, bpm) in enumerate(TRACKS):
            wav_path = Path(scratch) / f'{slug}.wav'
            pcm = synthesize(style, root, bpm, index + 1)
            with wave.open(str(wav_path), 'wb') as output:
                output.setnchannels(2)
                output.setsampwidth(2)
                output.setframerate(SR)
                output.writeframes(pcm.tobytes())
            subprocess.run([
                'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
                '-i', str(wav_path), '-codec:a', 'libmp3lame', '-b:a', '128k',
                '-metadata', f'title={title}', '-metadata', 'artist=Galada Lab',
                '-metadata', 'comment=Original synthetic demonstration music for Galada',
                str(MEDIA / f'{slug}.mp3'),
            ], check=True)
            background, light, dark = palettes[index]
            (ART / f'{slug}.svg').write_text(
                cover(slug, title, index + 1, background, light, dark, index), encoding='utf-8')
            print(f'Created {slug}.mp3 and {slug}.svg')
    (ART / 'hero.svg').write_text(HERO, encoding='utf-8')
    (ROOT / 'public' / 'favicon.svg').write_text('''<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="18" fill="#e77945"/><path d="M43 22a17 17 0 1 0 2 19V32H31" fill="none" stroke="#fff4e6" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>''', encoding='utf-8')
    print('Created hero.svg and favicon.svg. All media is original and synthetic.')


if __name__ == '__main__':
    main()
