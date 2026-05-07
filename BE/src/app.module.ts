import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { RolesModule } from './modules/roles/roles.module';
import { JwtAuthGuard } from './common/guard/jwt-auth.guard';
import { RolesGuard } from './common/guard/roles.guard';
import { UserModule } from './modules/user/user.module';
import { StoreModule } from './modules/store/store.module';
import { CategoryModule } from './modules/category/category.module';
import { ProductModule } from './modules/product/product.module';

@Module({
  imports: [PrismaModule, AuthModule, RolesModule, UserModule, StoreModule, CategoryModule, ProductModule],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule { }
