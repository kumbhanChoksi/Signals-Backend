import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const tenants = [
  { name: 'Acme Corp', domain: 'acme.com' },
  { name: 'Globex Corp', domain: 'globex.com' },
  { name: 'Initech', domain: 'initech.com' },
];

function generateCandles(
  count: number,
  startTime: Date,
  tenantId: string
): Prisma.CandleCreateManyInput[] {
  const candles: Prisma.CandleCreateManyInput[] = [];
  let price = 30000;

  for (let i = 0; i < count; i += 1) {
    const timestamp = new Date(startTime.getTime() + i * 60_000);
    const drift = (Math.random() - 0.5) * 50;
    const open = price;
    const close = Math.max(1000, open + drift);
    const high = Math.max(open, close) + Math.random() * 25;
    const low = Math.min(open, close) - Math.random() * 25;
    const volume = Math.random() * 5 + 1;

    candles.push({
      tenantId,
      symbol: 'BTCUSDT',
      timeframe: '1m',
      timestamp,
      open,
      high,
      low,
      close,
      volume,
    });

    price = close;
  }

  return candles;
}

async function main() {
  await prisma.candle.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  const passwordHash = await bcrypt.hash('password123', 10);
  const startTime = new Date();
  startTime.setSeconds(0, 0);

  for (const tenantInfo of tenants) {
    const tenant = await prisma.tenant.create({
      data: { name: tenantInfo.name },
    });

    await prisma.user.createMany({
      data: [
        {
          firstName: 'John',
          lastName: 'Doe',
          email: `john@${tenantInfo.domain}`,
          passwordHash,
          tenantId: tenant.id,
        },
        {
          firstName: 'Jane',
          lastName: 'Doe',
          email: `jane@${tenantInfo.domain}`,
          passwordHash,
          tenantId: tenant.id,
        },
      ],
    });

    const candles = generateCandles(100, startTime, tenant.id);
    await prisma.candle.createMany({
      data: candles,
    });
  }

  console.log('Seed completed successfully!');
  console.log('Tenants:', tenants.map((tenant) => tenant.name).join(', '));
  console.log('Sample email: john@acme.com');
  console.log('Plaintext password: password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
