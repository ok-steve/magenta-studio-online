import 'https://cdn.jsdelivr.net/npm/@magenta/music@1.23.1/es6/core.js';

// Fake modules because Skypack can't build.
const { sequences, midiToSequenceProto, sequenceProtoToMidi } = window.core;
const { clone, quantizeNoteSequence } = sequences;

const STEPS_PER_BAR = 16;
const STEPS_PER_QUARTER = 4;

export function concatNoteSequences(...args) {
  if (args.length === 2) {
    const [seqA, seqB] = args;
    const outputSequence = clone(seqA);
    seqB.notes.forEach((note) => {
      const clonedNote = Object.assign({}, note);
      clonedNote.startTime += seqA.totalTime;
      clonedNote.endTime += seqA.totalTime;
      outputSequence.notes.push(clonedNote);
    });
    outputSequence.totalTime = seqA.totalTime + seqB.totalTime;
    return outputSequence;
  } else if (args.length > 2) {
    // Recurse.
    const first = args.shift();
    return concatNoteSequences(first, concatNoteSequences(...args));
  } else {
    // Nothing to concat.
    return args[0];
  }
}

export async function reconstructBySize(inSeq, models, temperature = 1) {
  inSeq = quantizeNoteSequence(inSeq, STEPS_PER_QUARTER);

  // Process in as large of chunks as possible.
  const maxChunkSize = models.length * STEPS_PER_BAR;
  const secondsPerStep =
    1 /
    sequences.stepsPerQuarterToStepsPerSecond(
      STEPS_PER_QUARTER,
      inSeq.tempos[0].qpm
    );
  const outputs = [];
  for (
    let startOffset = 0;
    startOffset < inSeq.totalQuantizedSteps;
    startOffset += maxChunkSize
  ) {
    const chunk = clone(inSeq);
    const endOffset = Math.min(
      startOffset + maxChunkSize,
      inSeq.totalQuantizedSteps
    );
    chunk.notes = inSeq.notes
      .map((n) => Object.assign({}, n))
      .filter(
        (n) =>
          startOffset <= n.quantizedStartStep &&
          n.quantizedStartStep < endOffset
      )
      .map((n) => {
        n.startTime -= startOffset * secondsPerStep;
        n.endTime -= startOffset * secondsPerStep;
        n.quantizedStartStep -= startOffset;
        n.quantizedEndStep -= startOffset;
        return n;
      });
    chunk.totalQuantizedSteps = endOffset - startOffset;
    chunk.totalTime = chunk.totalQuantizedSteps * secondsPerStep;

    // Select model based on the number of actual bars in the chunk.
    const numBars = Math.ceil(chunk.totalQuantizedSteps / STEPS_PER_BAR);
    const modelIndex = numBars - 1;
    const z = await models[modelIndex].encode([chunk]);
    const output = await models[modelIndex].decode(
      z,
      temperature,
      undefined,
      undefined,
      inSeq.tempos[0].qpm
    );
    z.dispose();
    outputs.push(output[0]);
  }
  const reconstruction = concatNoteSequences(...outputs);
  return reconstruction;
}

/**
 * Custom
 */

export async function fetchCheckpoints(filters = {}) {
  const res = await fetch(
    'https://raw.githubusercontent.com/tensorflow/magenta-js/master/music/checkpoints/checkpoints.json'
  );

  const data = await res.json();

  return data.filter((checkpoint) =>
    Object.keys(filters).reduce((res, key) => {
      const value = filters[key];
      const matches = Array.isArray(value)
        ? value.includes(checkpoint[key])
        : checkpoint[key] === value;
      return res && matches;
    }, true)
  );
}

export async function readFile(file) {
  const buffer = await file.arrayBuffer();
  return midiToSequenceProto(buffer);
}

export function writeMidiFile(buffer, name) {
  const file = new File([buffer], name, {
    type: 'audio/midi',
  });

  const url = URL.createObjectURL(file);

  const link = document.createElement('a');
  link.toggleAttribute('hidden', true);
  link.setAttribute('href', url);
  link.setAttribute('download', name);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function writeFiles(seqs, prefix) {
  seqs = Array.isArray(seqs) ? seqs : [seqs];
  seqs.forEach((seq) => (seq.tempos[0].time = 0));
  seqs.forEach((seq) => (seq.tempos[0].qpm = 120));
  const midiData = seqs.map(sequenceProtoToMidi);
  midiData.map((buffer, i) => writeMidiFile(buffer, `${prefix} ${i}.mid`));
}
