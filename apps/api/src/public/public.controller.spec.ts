import { Test } from '@nestjs/testing';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';

describe('PublicController', () => {
  it('returns home payload from service', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PublicController],
      providers: [
        {
          provide: PublicService,
          useValue: {
            homeDashboard: jest.fn().mockResolvedValue({ tournamentName: 'Test' }),
          },
        },
      ],
    }).compile();

    const controller = moduleRef.get(PublicController);
    await expect(controller.home()).resolves.toEqual({ tournamentName: 'Test' });
  });
});
