// The generative soundtrack, as Strudel code. Rebuilt whenever the run moves on, and Strudel swaps
// it in on the next cycle. All synths, no samples, so nothing is fetched at runtime.
//   progress  0..1, offerings towards the mask
//   mask      the mask is taken and the whole swarm is loose
//   over      the sky is empty
//   at        the cycle this act began on, so long forms start from their first bar
export function score(cue = {}) {
  if (cue.over) return aftermath();
  return cue.mask ? hunt(cue.at) : harvest(cue.progress ?? 0);
}

const CHORDS = '<[d3,f3,a3,c4] [bb2,d3,f3,a3] [g2,bb2,d3,f3] [a2,c3,e3,g3]>';
const ROOTS = '<d2 bb1 g1 a1>';
const out = (layers) => `stack(${layers.join(', ')}).analyze(1).fft(4)`;

const pad = (lo, hi, gain) => `note("${CHORDS}")
  .s("supersaw").unison(5).detune(.2)
  .lpf(sine.range(${lo}, ${hi}).slow(16)).lpq(4)
  .attack(1.5).release(3).room(.8).size(6).gain(${gain})`;

const crystals = `n("0 [~ 4] <7 6> [4 ~ 2 ~]").scale("D4:minor")
  .s("triangle").decay(.2).sustain(0)
  .degradeBy(.4)
  .delay(.6).delaytime(.381).delayfeedback(.55)
  .room(.6).gain(.3)`;

// Wandering and gathering. A heartbeat kick arrives with the first offering and opens up,
// with hats over it, as the mask gets closer.
function harvest(progress) {
  const layers = ['pad', 'crystals', 'sub'];
  if (progress > 0) layers.push('kick');
  if (progress >= 0.5) layers.push('hats');
  return `
setcpm(118/4)
const pad = ${pad(300, 900, 0.4)}
const crystals = ${crystals}
const sub = note("${ROOTS}").struct("x ~ ~ x ~ ~ x ~")
  .s("sine").decay(.35).sustain(0).gain(.7)
const kick = s("sbd").struct("x ~ ~ ~ ~ ~ x ~ ~ ~ x ~ ~ ~ ~ ~")
  .decay(.35).penv(30).pdecay(.12).lpf(${Math.round(200 + progress * 1400)}).gain(${(0.8 + progress * 0.3).toFixed(2)})
const hats = s("white*16").decay(.03).sustain(0).hpf(7000)
  .gain(perlin.range(.08, .3)).degradeBy(.3)
${out(layers)}
`;
}

// The mask is on and everything is coming. Club drums under something wider and sadder: a wall of
// detuned saws gated so it pumps against the kick, vowel chops in a long delay, risers and booms.
// It runs as a 32 bar form, counted from the bar the mask was taken (at):
//    1-8   groove          kick, bass, wall half open, first chop line
//    9-16  lift            clap, rim and open hats join, wall opens further
//   17-20  breakdown       drums and bass out, the chords held as a pad, chops alone
//   21-24  build           kick back under a long riser, wall closing in then opening
//   25-32  peak            everything, wall wide open and doubled an octave up, second chop line
// The kick also drops out of the back half of every eighth bar. Chords move over 8 bars.
// Inside the form nothing quite repeats: uneven loop lengths, euclidean rhythms and a little chance.
function hunt(at = 0) {
  return `
setcpm(124/4)
const kick = s("sbd*4").mask("<1!7 [1 0]>").mask("<1!16 0!4 1!12>")
  .decay(.4).penv(36).pdecay(.1).shape(.35).gain(1.3)
const ghost = s("sbd").struct("x(3,16,<3 5 3 7>)").mask("<1!16 0!8 1!8>")
  .decay(.2).penv(24).pdecay(.08).lpf(900).gain(.7)
const boom = s("<sbd ~!7 sbd ~!7 sbd ~!7 sbd ~!7>").decay(1.6).penv(48).pdecay(.5).lpf(500)
  .room(.9).size(8).gain("<1.1 1.1 .9 1.4>/8")
const clap = s("~ pink ~ pink").mask("<0!8 1!8 0!8 1!8>").decay(.16).sustain(0)
  .bpf(1300).bpq(1.5).room(.7).size(6).gain(.9)
const rim = s("white").struct("<[~ ~ ~ ~ ~ ~ ~ x ~ x ~ ~ ~ ~ x ~] [~ ~ x ~ ~ ~ ~ x ~ ~ ~ x ~ ~ x x]>")
  .mask("<0!8 1!8 0!8 1!8>")
  .decay(.025).sustain(0).bpf(3200).bpq(4).room(.4).gain(.5)
const hats = stack(
  s("white*16").sometimesBy(.08, x => x.ply(2)).swingBy(1/12, 8)
    .decay(.025).sustain(0).hpf(8000).gain(perlin.range(.06, .18)).mask("<1!16 0!4 1!12>"),
  s("[~ white]*4").decay(.09).sustain(0).hpf(6000).gain(.3).mask("<0!8 1!8 0!8 1!8>")
)
const riser = stack(
  s("<~!7 white>").attack(1.8).release(.05).hpf(2500).room(.6).gain(.2),
  s("white/4").mask("<0!20 1!4 0!8>").attack(7.5).release(.1)
    .hpf(saw.range(600, 7000).slow(4)).room(.6).gain(.3)
)
const bass = note("<d2 bb1 f1 c2 d2 bb1 g1 a1>").struct("~ x x x ~ x x x ~ x x x ~ x x x")
  .mask("<1!16 0!8 1!8>")
  .sometimesBy(.15, x => x.add(note(12)))
  .s("sawtooth").lpf(perlin.range(.8, 1.4).mul("<500!8 800!8 500!8 1200!8>")).lpq(8)
  .decay(.13).sustain(0).shape(.4).gain(.6)
const chords = "<[d3,a3,e4,f4] [bb2,f3,c4,d4] [f3,c4,g4,a4] [c3,g3,d4,e4] [d3,a3,e4,f4] [bb2,f3,c4,d4] [g3,bb3,d4,f4] [a3,c4,e4,g4]>"
const wall = note(chords).struct("<[x*16]!3 [x x ~ x x ~ x x ~ x x ~ x x x x]>").legato(1).mask("<1!16 0!4 1!12>")
  .s("supersaw").unison(7).detune(.3).spread(.8)
  .lpf(sine.range(.75, 1.25).slow(4).mul("<900!8 1800!8 600!4 500 800 1400 2600 5000!8>")).lpq(2)
  .attack(.01).release(.08)
  .gain("[.08 .3 .5 .55]*4").room(.7).size(8)
const held = note(chords).mask("<0!16 1!4 0!12>")
  .s("supersaw").unison(7).detune(.3).spread(.8)
  .lpf(sine.range(400, 1400).slow(4)).lpq(3)
  .attack(.8).release(1.5).room(.9).size(9).gain(.4)
const high = note(chords).add(note(12)).struct("x*16").legato(1).mask("<0!24 1!8>")
  .s("supersaw").unison(3).detune(.35).spread(1)
  .lpf(6000).attack(.01).release(.08)
  .gain("[.04 .12 .2 .22]*4").room(.8).size(8)
// the hook: five notes over a sixteen step bar, so it lands differently every time round,
// on a euclidean rhythm that changes density bar to bar
const hook = note("<d3 f3 e3 a2 c3>*16").struct("x(<7 7 9 5>,16,<0 0 2 0>)")
  .sometimesBy(.12, x => x.add(note(12))).mask("<0!4 1!12 0!4 1!12>")
  .s("sawtooth").lpf(perlin.range(700, 2200)).lpenv(2).lpdecay(.08).lpq(7)
  .decay(.11).sustain(0).delay(.45).delaytime(.242).delayfeedback(.45).room(.4).gain(.38)
const chopsA = note("<[~ ~ a4 ~ ~ ~ f4 ~] [~ ~ a4 ~ ~ d5 ~ ~] [~ ~ g4 ~ ~ ~ a4 ~] [~ ~ e4 ~ ~ ~ ~ ~] [~ ~ a4 ~ ~ ~ f4 ~] ~ [~ ~ d5 ~ ~ ~ bb4 ~] [~ ~ ~ ~ ~ e4 ~ ~]>")
  .mask("<1!20 0!12>")
const chopsB = note("<[~ ~ d5 ~ ~ ~ a4 ~] [~ f5 ~ ~ d5 ~ ~ ~] [~ ~ c5 ~ ~ ~ a4 g4] [~ ~ e5 ~ ~ ~ ~ ~] [~ ~ d5 ~ ~ ~ a4 ~] [~ f5 ~ ~ d5 ~ ~ c5] [~ ~ d5 ~ ~ bb4 ~ ~] [~ ~ e5 ~ ~ ~ a4 ~]>")
  .mask("<0!24 1!8>")
const chops = stack(chopsA, chopsB)
  .s("sawtooth").vowel("<a o e o>").lpf(3000)
  .attack(.02).decay(.25).sustain(0).release(.2)
  .delay(.7).delaytime(.363).delayfeedback(.6).room(.8).size(8).gain(.35)
stack(kick, ghost, boom, clap, rim, hats, riser, bass, wall, held, high, hook, chops)
  .late(${at}).analyze(1).fft(4)
`;
}

// The sky is empty.
function aftermath() {
  return `
setcpm(118/4)
const pad = ${pad(300, 1200, 0.45)}
const crystals = ${crystals}
${out(['pad', 'crystals'])}
`;
}
