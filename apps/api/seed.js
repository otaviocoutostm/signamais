const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

async function seed() {
  const prisma = new PrismaClient();
  
  try {
    const hash = await bcrypt.hash('123456', 10);
    
    // Create admin users
    const admins = [
      { name: 'Admin', email: 'admin@signamais.com' },
      { name: 'Otávio', email: 'otaviocouto.stm@gmail.com' },
    ];
    
    for (const admin of admins) {
      await prisma.user.upsert({
        where: { email: admin.email },
        update: { password: hash },
        create: { name: admin.name, email: admin.email, password: hash, role: 'admin' },
      });
      console.log(`✅ User: ${admin.email}`);
    }

    // Create default queue services if none exist
    const serviceCount = await prisma.queueService.count();
    if (serviceCount === 0) {
      await prisma.queueService.create({ data: { name: 'Convencional', prefix: 'N', color: '#0055FF', priority: 0 } });
      await prisma.queueService.create({ data: { name: 'Prioritário', prefix: 'P', color: '#FF0044', priority: 10 } });
      await prisma.queueDesk.create({ data: { name: 'Guichê 1', number: 1 } });
      await prisma.queueDesk.create({ data: { name: 'Guichê 2', number: 2 } });
      console.log('✅ Default queue data created');
    }
  } catch (err) {
    console.error('❌ Seed error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
