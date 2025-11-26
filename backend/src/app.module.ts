import { Module } from "@nestjs/common";
import { DatabaseModule } from "./database/database.module";
import { MastersModule } from "./masters/masters.module";

@Module({
  imports: [
    DatabaseModule, // Global Database Pool
    MastersModule, // Feature Module
  ],
})
export class AppModule {}
