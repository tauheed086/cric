import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { AdminUsersService, hashPassword, verifyPassword } from './admin-users.service.js';

describe('AdminUsersService & Password Security', () => {
  const buildService = () => {
    const prisma = {
      adminUser: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    } as any;

    const config = {
      get: jest.fn().mockReturnValue('local-admin-token'),
    } as any;

    const service = new AdminUsersService(prisma, config);
    return { service, prisma, config };
  };

  it('should hash and verify passwords using scrypt with salt', () => {
    const hash = hashPassword('scorer-secure-pass');
    expect(hash).toContain(':');
    expect(verifyPassword('scorer-secure-pass', hash)).toBe(true);
    expect(verifyPassword('wrong-pass', hash)).toBe(false);
  });

  it('should create default super admin if none exists', async () => {
    const { service, prisma } = buildService();
    prisma.adminUser.findFirst.mockResolvedValue(null);
    prisma.adminUser.create.mockResolvedValue({ id: 'sa-1' });

    await service.ensureDefaultSuperAdmin();
    expect(prisma.adminUser.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          username: 'admin',
          role: AdminRole.SUPER_ADMIN,
        }),
      }),
    );
  });

  it('should list users with formatted summary', async () => {
    const { service, prisma } = buildService();
    const mockDate = new Date();
    prisma.adminUser.findMany.mockResolvedValue([
      {
        id: 'usr-1',
        username: 'scorer1',
        name: 'Scorer One',
        role: AdminRole.SCORER,
        isActive: true,
        createdAt: mockDate,
        _count: { tournaments: 2 },
      },
    ]);

    const result = await service.listUsers();
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 'usr-1',
      username: 'scorer1',
      name: 'Scorer One',
      role: AdminRole.SCORER,
      isActive: true,
      tournamentsCount: 2,
      createdAt: mockDate.toISOString(),
    });
  });

  it('should create a new scorer and lowercase the username', async () => {
    const { service, prisma } = buildService();
    const mockDate = new Date();
    prisma.adminUser.findUnique.mockResolvedValue(null);
    prisma.adminUser.create.mockResolvedValue({
      id: 'new-1',
      username: 'john_scorer',
      name: 'John Scorer',
      role: AdminRole.SCORER,
      isActive: true,
      createdAt: mockDate,
    });

    const created = await service.createUser({
      username: 'John_Scorer',
      password: 'password123',
      name: 'John Scorer',
      role: AdminRole.SCORER,
    });

    expect(prisma.adminUser.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          username: 'john_scorer',
          role: AdminRole.SCORER,
        }),
      }),
    );
    expect(created.username).toBe('john_scorer');
  });

  it('should reject creating user if username already exists', async () => {
    const { service, prisma } = buildService();
    prisma.adminUser.findUnique.mockResolvedValue({ id: 'existing' });

    await expect(
      service.createUser({
        username: 'existing',
        password: 'password123',
        name: 'Existing',
        role: AdminRole.SCORER,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should reject short password when creating user', async () => {
    const { service } = buildService();
    await expect(
      service.createUser({
        username: 'newuser',
        password: '12',
        name: 'Short',
        role: AdminRole.SCORER,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should update user and hash password if provided', async () => {
    const { service, prisma } = buildService();
    const mockDate = new Date();
    prisma.adminUser.findUnique.mockResolvedValue({
      id: 'usr-1',
      role: AdminRole.SCORER,
    });
    prisma.adminUser.update.mockResolvedValue({
      id: 'usr-1',
      username: 'scorer1',
      name: 'Updated Scorer',
      role: AdminRole.SCORER,
      isActive: false,
      createdAt: mockDate,
      _count: { tournaments: 1 },
    });

    const updated = await service.updateUser('usr-1', {
      name: 'Updated Scorer',
      isActive: false,
      password: 'newpassword123',
    });

    expect(updated.name).toBe('Updated Scorer');
    expect(updated.isActive).toBe(false);
    expect(prisma.adminUser.update).toHaveBeenCalled();
  });

  it('should prevent deleting a Super Admin', async () => {
    const { service, prisma } = buildService();
    prisma.adminUser.findUnique.mockResolvedValue({
      id: 'sa-1',
      role: AdminRole.SUPER_ADMIN,
    });

    await expect(service.deleteUser('sa-1')).rejects.toThrow(BadRequestException);
  });

  it('should delete a scorer account', async () => {
    const { service, prisma } = buildService();
    prisma.adminUser.findUnique.mockResolvedValue({
      id: 'sc-1',
      username: 'deleteme',
      role: AdminRole.SCORER,
    });
    prisma.adminUser.delete.mockResolvedValue({});

    const result = await service.deleteUser('sc-1');
    expect(result.success).toBe(true);
    expect(prisma.adminUser.delete).toHaveBeenCalledWith({ where: { id: 'sc-1' } });
  });
});
