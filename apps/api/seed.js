const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

async function seed() {
  const prisma = new PrismaClient();
  
  try {
    // Create admin user
    const hash = await bcrypt.hash('123456', 10);
    await prisma.user.upsert({
      where: { email: 'admin@signamais.com' },
      update: { password: hash },
      create: {
        name: 'Admin',
        email: 'admin@signamais.com',
        password: hash,
        role: 'admin',
      },
    });
    console.log('✅ Admin user created');

    // Create default services if none exist
    const serviceCount = await prisma.queueService.count();
    if (serviceCount === 0) {
      await prisma.queueService.create({ data: { name: 'Convencional', prefix: 'N', color: '#0055FF', priority: 0 } });
      await prisma.queueService.create({ data: { name: 'Prioritário', prefix: 'P', color: '#FF0044', priority: 10 } });
      await prisma.queueDesk.create({ data: { name: 'Guichê 1', number: 1 } });
      await prisma.queueDesk.create({ data: { name: 'Guichê 2', number: 2 } });
      console.log('✅ Default queue services and desks created');
    }
  } catch (err) {
    console.error('❌ Seed error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
