import { isJwtExpired, jwtExpiry } from './jwt';

/** Jeton factice (signature non vérifiée côté client). */
function fakeJwt(payload: object): string {
  const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}.signature`;
}

describe('jwt', () => {
  it('lit la date d’expiration', () => {
    const token = fakeJwt({ sub: 1, exp: 1_900_000_000 });
    expect(jwtExpiry(token)?.getTime()).toBe(1_900_000_000_000);
  });

  it('renvoie null pour un jeton illisible', () => {
    expect(jwtExpiry('pas-un-jwt')).toBeNull();
    expect(jwtExpiry(null)).toBeNull();
  });

  it('détecte un jeton expiré, avec marge', () => {
    const now = new Date('2026-09-30T12:00:00Z');
    const token = fakeJwt({ exp: now.getTime() / 1000 + 300 }); // expire dans 5 min
    expect(isJwtExpired(token, now)).toBe(false);
    expect(isJwtExpired(token, now, 600)).toBe(true); // marge de 10 min
    expect(isJwtExpired(null, now)).toBe(true);
  });
});
