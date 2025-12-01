import { Controller, Get } from '@nestjs/common';
import { timestamp } from 'rxjs';

@Controller('health')
export class HealthController {
    @Get()
    getHealth() {
        return { status: 'OK' };
        timestamp: new Date().toISOString();
    }
}
