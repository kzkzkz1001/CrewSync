import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Manager
  const manager = await prisma.user.upsert({
    where: { email: 'manager@crewsync.dev' },
    update: {},
    create: {
      name: 'Alice Manager',
      email: 'manager@crewsync.dev',
      role: Role.MANAGER,
      phone: '+353 1 000 0001',
    },
  });

  // Driver
  const driver = await prisma.user.upsert({
    where: { email: 'driver@crewsync.dev' },
    update: {},
    create: {
      name: 'Bob Driver',
      email: 'driver@crewsync.dev',
      role: Role.DRIVER,
      phone: '+353 1 000 0002',
    },
  });

  // Vehicle
  const vehicle = await prisma.vehicle.upsert({
    where: { plateNumber: '191-D-12345' },
    update: {},
    create: {
      plateNumber: '191-D-12345',
      driverId: driver.id,
    },
  });

  // Staff — scatter around Dublin city centre
  const staffData = [
    { name: 'Carol Staff', email: 'carol@crewsync.dev', homeLat: 53.3419, homeLng: -6.2675 }, // Drumcondra
    { name: 'Dave Staff',  email: 'dave@crewsync.dev',  homeLat: 53.3224, homeLng: -6.2395 }, // Ballsbridge
    { name: 'Eve Staff',   email: 'eve@crewsync.dev',   homeLat: 53.3473, homeLng: -6.2591 }, // Glasnevin
    { name: 'Frank Staff', email: 'frank@crewsync.dev', homeLat: 53.3129, homeLng: -6.2624 }, // Ranelagh
    { name: 'Grace Staff', email: 'grace@crewsync.dev', homeLat: 53.3558, homeLng: -6.2495 }, // Finglas
  ];

  const staff = await Promise.all(
    staffData.map((s) =>
      prisma.user.upsert({
        where: { email: s.email },
        update: {},
        create: { ...s, role: Role.STAFF },
      }),
    ),
  );

  // Draft shift
  await prisma.shift.upsert({
    where: { id: 'seed-shift-001' },
    update: {},
    create: {
      id: 'seed-shift-001',
      eventName: 'Marlay Park Food Festival',
      destLat: 53.2893,
      destLng: -6.2655,
      startTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      vehicleId: vehicle.id,
      staff: {
        create: staff.map((s) => ({ userId: s.id })),
      },
    },
  });

  console.log('Seed complete.');
  console.log(`  Manager : ${manager.email}`);
  console.log(`  Driver  : ${driver.email}`);
  console.log(`  Vehicle : ${vehicle.plateNumber}`);
  console.log(`  Staff   : ${staff.map((s) => s.name).join(', ')}`);
  console.log(`  Shift   : seed-shift-001 (DRAFT)`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
