import { isSuperAdmin, roleNames } from './roles';

describe('roles', () => {
  it('accepte les rôles en texte et en objet, sans doublon', () => {
    expect(roleNames(['super_admin', 'Admin'], [{ name: 'super_admin' }, null])).toEqual(['super_admin', 'Admin']);
  });

  it('reconnaît le super admin sous son nouveau et son ancien nom', () => {
    expect(isSuperAdmin(['super_admin'])).toBe(true);
    expect(isSuperAdmin([{ name: 'Admin' }])).toBe(true);
    expect(isSuperAdmin(['citizen', 'SimpleUser'])).toBe(false);
    expect(isSuperAdmin(undefined)).toBe(false);
  });
});
