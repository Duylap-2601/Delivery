import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter } as any);

const DEFAULT_ROLES = [
    {
        name: 'ADMIN',
        description: 'Quản trị viên hệ thống — toàn quyền truy cập',
    },
    {
        name: 'CUSTOMER',
        description: 'Khách hàng — đặt đơn, theo dõi giao hàng',
    },
    {
        name: 'STORE_OWNER',
        description: 'Chủ cửa hàng — quản lý sản phẩm, xử lý đơn hàng',
    },
    {
        name: 'DRIVER',
        description: 'Tài xế — nhận đơn và giao hàng',
    },
];

async function main() {
    console.log('🌱 Seeding default roles...');

    for (const role of DEFAULT_ROLES) {
        const created = await prisma.role.upsert({
            where: { name: role.name },
            update: { description: role.description },
            create: role,
        });
        console.log(`  ✅ Role: ${created.name}`);
    }

    console.log('\n🎉 Seed completed!');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
