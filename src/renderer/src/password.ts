// Animal.word.word##!  — mirrors PasswordReset.ps1's New-Password format,
// using crypto.getRandomValues (parity with the PS RandomNumberGenerator approach).

const ANIMALS = [
  'Tiger', 'Falcon', 'Otter', 'Badger', 'Heron', 'Lynx', 'Raven', 'Bison',
  'Marten', 'Osprey', 'Stoat', 'Kestrel'
]
const WORDS = [
  'amber', 'river', 'cloud', 'stone', 'maple', 'ember', 'frost', 'willow',
  'harbor', 'cedar', 'meadow', 'quartz'
]

function randInt(maxExclusive: number): number {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0] % maxExclusive
}

function pick<T>(arr: T[]): T {
  return arr[randInt(arr.length)]
}

export function newPassword(): string {
  const animal = pick(ANIMALS)
  const w1 = pick(WORDS)
  const w2 = pick(WORDS)
  const num = 10 + randInt(90) // two digits
  return `${animal}.${w1}.${w2}${num}!`
}
