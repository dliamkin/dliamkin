// Minimal 16-bit PCM WAV encoder. Used by the sample-generation script to
// commit the synthesized demo clips as playable files; no dependency so it
// runs identically in Node and (if ever needed) the browser.

/** Encode mono Float32 PCM as a 16-bit little-endian WAV file. */
export function encodeWavPcm16(pcm: Float32Array, sampleRate: number): Uint8Array {
	const dataBytes = pcm.length * 2;
	const buffer = new ArrayBuffer(44 + dataBytes);
	const view = new DataView(buffer);
	const writeAscii = (offset: number, text: string): void => {
		for (let i = 0; i < text.length; i++) {
			view.setUint8(offset + i, text.charCodeAt(i));
		}
	};
	writeAscii(0, "RIFF");
	view.setUint32(4, 36 + dataBytes, true);
	writeAscii(8, "WAVE");
	writeAscii(12, "fmt ");
	view.setUint32(16, 16, true); // PCM chunk size
	view.setUint16(20, 1, true); // PCM format
	view.setUint16(22, 1, true); // mono
	view.setUint32(24, sampleRate, true);
	view.setUint32(28, sampleRate * 2, true); // byte rate
	view.setUint16(32, 2, true); // block align
	view.setUint16(34, 16, true); // bits per sample
	writeAscii(36, "data");
	view.setUint32(40, dataBytes, true);
	for (let i = 0; i < pcm.length; i++) {
		const clamped = Math.max(-1, Math.min(1, pcm[i] ?? 0));
		view.setInt16(44 + i * 2, Math.round(clamped * 32767), true);
	}
	return new Uint8Array(buffer);
}
