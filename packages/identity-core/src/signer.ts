import * as ed from '@noble/ed25519';

const encoder = new TextEncoder();

function toBytes(message: string | Uint8Array): Uint8Array {
  return typeof message === 'string' ? encoder.encode(message) : message;
}

export async function signMessage(
  message: string | Uint8Array,
  privateKey: Uint8Array
): Promise<Uint8Array> {
  return ed.signAsync(toBytes(message), privateKey);
}

export async function verifySignature(
  message: string | Uint8Array,
  signature: Uint8Array,
  publicKey: Uint8Array
): Promise<boolean> {
  return ed.verifyAsync(signature, toBytes(message), publicKey);
}
