import { Global, Module } from '@nestjs/common';
import { ContactDirectory } from './contact-directory.service';

@Global()
@Module({
  providers: [ContactDirectory],
  exports: [ContactDirectory],
})
export class DirectoryModule {}
