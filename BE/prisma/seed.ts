import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter } as any);

// ─── Roles ──────────────────────────────────────────────────────────────────

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

// ─── Seed accounts ──────────────────────────────────────────────────────────
// Mật khẩu mặc định cho tất cả tài khoản seed: Admin@123
// ⚠️  Hãy đổi mật khẩu ngay sau khi đăng nhập lần đầu!

const SEED_ACCOUNTS = [
    {
        email: 'admin@fooddelivery.dev',
        fullName: 'Super Admin',
        phone: '0900000001',
        role: 'ADMIN',
    },
    {
        email: 'customer@fooddelivery.dev',
        fullName: 'Nguyễn Văn A (Customer)',
        phone: '0900000002',
        role: 'CUSTOMER',
    },
    {
        email: 'storeowner@fooddelivery.dev',
        fullName: 'Trần Thị B (Store Owner)',
        phone: '0900000003',
        role: 'STORE_OWNER',
    },
    {
        email: 'driver@fooddelivery.dev',
        fullName: 'Lê Văn C (Driver)',
        phone: '0900000004',
        role: 'DRIVER',
    },
];

const DEFAULT_PASSWORD = 'Admin@123';

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
    // 1. Seed roles
    console.log('🌱 Seeding default roles...');
    for (const role of DEFAULT_ROLES) {
        const created = await prisma.role.upsert({
            where: { name: role.name },
            update: { description: role.description },
            create: role,
        });
        console.log(`  ✅ Role: ${created.name}`);
    }

    // 2. Seed accounts
    console.log('\n👤 Seeding seed accounts...');
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    for (const account of SEED_ACCOUNTS) {
        // Lấy role entity
        const roleEntity = await prisma.role.findUnique({
            where: { name: account.role },
        });
        if (!roleEntity) {
            console.error(`  ❌ Role "${account.role}" not found, skipping ${account.email}`);
            continue;
        }

        // Tạo hoặc cập nhật user
        const user = await prisma.user.upsert({
            where: { email: account.email },
            update: {
                fullName: account.fullName,
                status: 'ACTIVE',
                isEmailVerified: true,
                roles: { set: [{ id: roleEntity.id }] },
            },
            create: {
                email: account.email,
                password: hashedPassword,
                fullName: account.fullName,
                phone: account.phone,
                status: 'ACTIVE',
                isEmailVerified: true,
                provider: 'LOCAL',
                roles: { connect: [{ id: roleEntity.id }] },
            },
        });

        console.log(`  ✅ [${account.role}] ${user.fullName} — ${user.email}`);
    }

    console.log('\n─────────────────────────────────────────────');
    console.log('🎉 Seed completed!');
    console.log('📋 Tài khoản mặc định:');
    console.log('   Email              | Role        | Password');
    console.log('   ───────────────────────────────────────────');
    for (const acc of SEED_ACCOUNTS) {
        console.log(`   ${acc.email.padEnd(27)}| ${acc.role.padEnd(12)}| ${DEFAULT_PASSWORD}`);
    }
    console.log('─────────────────────────────────────────────');
    console.log('⚠️  Nhớ đổi mật khẩu sau khi đăng nhập lần đầu!');
    console.log('─────────────────────────────────────────────\n');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
