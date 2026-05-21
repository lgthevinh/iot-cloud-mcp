import { Module, forwardRef } from '@nestjs/common';
import { ProxyModule } from '../proxy/proxy.module';
import { CommonModule } from '../common/common.module';
import { SchedulerModule } from '../scheduler/scheduler.module';
import { ToolRegistryService } from './services/tool-registry.service';
import { ToolExecutorService } from './services/tool-executor.service';
import { DeviceReferenceService } from './services/device-reference.service';
import { LocationReferenceService } from './services/location-reference.service';

@Module({
  imports: [ProxyModule, CommonModule, forwardRef(() => SchedulerModule)],
  providers: [
    ToolRegistryService,
    ToolExecutorService,
    DeviceReferenceService,
    LocationReferenceService,
  ],
  exports: [
    ToolRegistryService,
    ToolExecutorService,
    DeviceReferenceService,
    LocationReferenceService,
  ],
})
export class ToolsModule {}
