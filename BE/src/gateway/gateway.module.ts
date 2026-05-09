import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AppGateway } from './app.gateway';
import { EventsService } from './events.service';

@Global()
@Module({
    imports: [
        JwtModule.registerAsync({
            useFactory: () => ({
                secret: process.env.JWT_SECRET ?? 'super-secret',
            }),
        }),
    ],
    providers: [AppGateway, EventsService],
    exports: [EventsService],
})
export class GatewayModule {}
