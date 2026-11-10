import { AbsoluteFill, Composition, Sequence, interpolate, registerRoot, useCurrentFrame } from "raea";

/*
  Two pieces for sharing the site, rendered with raea:
    og      a 1200 x 630 still for link previews
    teaser  a short clip that runs through the site's colour worlds

  raea render card.tsx --composition og --frame 0 -o out/og.png
  raea render card.tsx --composition teaser -o out/teaser.mp4
*/

const FONTS = `
@font-face { font-family: "Anybody"; src: url("media/fonts/anybody-latin-wdth-normal.woff2"); font-weight: 100 900; font-stretch: 50% 150%; }
@font-face { font-family: "Brygada"; src: url("media/fonts/brygada-1918-latin-wght-normal.woff2"); font-weight: 400 700; }
@font-face { font-family: "Brygada"; src: url("media/fonts/brygada-1918-latin-wght-italic.woff2"); font-weight: 400 700; font-style: italic; }
`;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = (t: number) => 1 - Math.pow(1 - t, 4);

function Line({ text, size, wdth, color }: { text: string; size: number; wdth: number; color: string }) {
  return (
    <div
      style={{
        fontFamily: "Anybody",
        fontWeight: 900,
        fontSize: size,
        lineHeight: 0.82,
        color,
        whiteSpace: "nowrap",
        fontStretch: `${wdth}%`,
        fontVariationSettings: `"wdth" ${wdth}, "wght" 900`,
      }}
    >
      {text}
    </div>
  );
}

function Og() {
  return (
    <AbsoluteFill style={{ background: "#4A1237", padding: "44px 48px", justifyContent: "space-between" }}>
      <style>{FONTS}</style>
      <div>
        <Line text="Marcben" size={176} wdth={112} color="#C6D63A" />
        <Line text="James" size={176} wdth={150} color="#C6D63A" />
        <Line text="Samuel" size={176} wdth={138} color="#C6D63A" />
      </div>
      <div style={{ fontFamily: "Brygada", fontSize: 34, lineHeight: 1.25, color: "#F5DFEC", maxWidth: 900 }}>
        Vision models that find what is wrong with things: steel, blood cells, onions, hard drives.
      </div>
    </AbsoluteFill>
  );
}

const SCENES = [
  { text: "Marcben James Samuel", ground: "#EDE3EA", ink: "#2A1023", size: 212, wdth: 50, note: "builds vision models that find what is wrong with things" },
  { text: "SPOT-TAP", ground: "#1D3657", ink: "#EDCB6B", size: 272, wdth: 112, note: "names a defect from a handful of examples" },
  { text: "Emergent attention", ground: "#E3A534", ink: "#0E5A53", size: 270, wdth: 50, note: "a cellular automaton in place of self-attention" },
  { text: "PRGA", ground: "#4A1237", ink: "#C6D63A", size: 390, wdth: 150, note: "learns an inspection task from one photo per class" },
  { text: "SysHealth+", ground: "#0E4536", ink: "#F0A23B", size: 282, wdth: 88, note: "predicts drive failure before it happens" },
  { text: "Say hello", ground: "#C6D63A", ink: "#4A1237", size: 318, wdth: 104, note: "marcbenjames007@gmail.com" },
];
const HOLD = 42;

function Scene({ i }: { i: number }) {
  const f = useCurrentFrame();
  const s = SCENES[i];
  const prev = SCENES[(i + SCENES.length - 1) % SCENES.length];
  const flood = ease(interpolate(f, [0, 16], [0, 1], clamp));
  const open = ease(interpolate(f, [3, 26], [0, 1], clamp));
  const wdth = interpolate(open, [0, 1], [50, s.wdth], clamp);
  const drift = interpolate(f, [0, HOLD], [0, 3], clamp);
  return (
    <AbsoluteFill style={{ background: prev.ground }}>
      <AbsoluteFill style={{ background: s.ground, clipPath: `circle(${flood * 130}% at 50% 55%)` }} />
      <AbsoluteFill style={{ padding: "110px 70px", justifyContent: "space-between", opacity: interpolate(f, [2, 9], [0, 1], clamp) }}>
        <Line text={s.text} size={s.size} wdth={Math.min(150, wdth + drift)} color={s.ink} />
        <div style={{ fontFamily: "Brygada", fontStyle: "italic", fontSize: 58, color: i === 0 || i === 2 || i === 5 ? "#2A1023" : "#F3EAF0" }}>{s.note}</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function Teaser() {
  return (
    <AbsoluteFill>
      <style>{FONTS}</style>
      {SCENES.map((_, i) => (
        <Sequence key={i} from={i * HOLD} durationInFrames={HOLD}>
          <Scene i={i} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}

registerRoot(() => (
  <>
    <Composition id="og" width={1200} height={630} fps={30} durationInFrames={1} component={Og} />
    <Composition id="teaser" width={1920} height={1080} fps={30} durationInFrames={SCENES.length * HOLD} component={Teaser} />
  </>
));
