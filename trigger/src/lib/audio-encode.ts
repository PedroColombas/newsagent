import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// The ffmpeg build extension sets FFMPEG_PATH in the deployed runtime (and the Debian build is also
// on PATH). Resolving via FFMPEG_PATH works for either; "ffmpeg" is only a local-dev fallback.
const FFMPEG = process.env.FFMPEG_PATH ?? "ffmpeg";

// Hard ceiling so a wedged ffmpeg can't eat the whole task maxDuration. ~2 min of audio encodes in
// seconds; this is pure safety margin. On timeout we kill → reject → caller falls back to voice-only.
const FFMPEG_TIMEOUT_MS = 120_000;

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    // stdin ignored (no TTY); stdout ignored (we write to a file); stderr captured for diagnostics.
    const proc = spawn(FFMPEG, args, { stdio: ["ignore", "ignore", "pipe"] });

    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      proc.kill("SIGKILL");
      reject(new Error(`ffmpeg timed out after ${FFMPEG_TIMEOUT_MS}ms`));
    }, FFMPEG_TIMEOUT_MS);

    proc.stderr?.on("data", (d) => {
      // Cap retained stderr so a chatty run can't balloon memory.
      if (stderr.length < 16_000) stderr += d.toString();
    });

    // Fires on ENOENT (binary missing / not on PATH) and other spawn failures.
    proc.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(err);
    });

    proc.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-2000)}`));
    });
  });
}

// concat-FILTER argv for N inputs. Each input is decoded, resampled to 44.1 kHz and up-mixed to
// stereo (aformat auto-inserts the mono→stereo upmix) BEFORE concat — concat itself does not
// resample/remix, which is exactly why the raw byte-join dropped the sting. Output: one
// single-profile 44.1 kHz / stereo / CBR-128k mp3 (libmp3lame writes a Xing/LAME header → correct
// iOS duration + seek).
function buildConcatArgs(inputFiles: string[], outputFile: string): string[] {
  const n = inputFiles.length;
  const args = ["-y", "-hide_banner", "-nostdin", "-loglevel", "error"];
  for (const f of inputFiles) args.push("-i", f);

  const norm: string[] = [];
  const labels: string[] = [];
  for (let i = 0; i < n; i++) {
    norm.push(`[${i}:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo[a${i}]`);
    labels.push(`[a${i}]`);
  }
  const filter = `${norm.join(";")};${labels.join("")}concat=n=${n}:v=0:a=1[out]`;

  args.push(
    "-filter_complex", filter,
    "-map", "[out]",
    "-c:a", "libmp3lame",
    "-b:a", "128k",
    "-ar", "44100",
    "-ac", "2",
    outputFile,
  );
  return args;
}

/**
 * Concatenate ordered mp3 pieces into ONE uniform mp3 (44.1 kHz / stereo / 128k), fully decoding +
 * re-encoding so mismatched inputs (24 kHz mono TTS + 44.1 kHz stereo sting) play correctly on iOS.
 * Empty/zero-length buffers are dropped (e.g. an empty `rest`). Always cleans up its temp dir.
 * Throws on any ffmpeg failure — the caller is expected to fall back.
 */
export async function encodeUniformMp3(pieces: Buffer[]): Promise<Buffer> {
  const inputs = pieces.filter((b) => b && b.length > 0);
  if (inputs.length === 0) return Buffer.alloc(0);

  // Unique dir under the writable /tmp scratch space → no collisions across concurrent runs.
  const dir = await mkdtemp(join(tmpdir(), "podcast-"));
  try {
    const inputFiles: string[] = [];
    for (let i = 0; i < inputs.length; i++) {
      const f = join(dir, `in-${i}.mp3`);
      await writeFile(f, inputs[i]);
      inputFiles.push(f);
    }

    const outPath = join(dir, "out.mp3");
    await runFfmpeg(buildConcatArgs(inputFiles, outPath));

    // Guard against a 0-byte / missing output that somehow exited 0.
    const info = await stat(outPath);
    if (info.size === 0) throw new Error("ffmpeg produced an empty output file");

    return await readFile(outPath);
  } finally {
    // Remove the whole dir (inputs + output + anything ffmpeg dropped) even on throw.
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
