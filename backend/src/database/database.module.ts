import { Module, Global } from "@nestjs/common";
import { Pool } from "pg";

@Global()
@Module({
  providers: [
    {
      provide: "DATABASE_POOL",
      useFactory: () => {
        return new Pool({
          user: process.env.DB_USER, // REPLACE with your DB username
          host: process.env.DB_HOST,
          database: process.env.DB_NAME, // REPLACE with your DB name
          password: process.env.DB_PASSWORD, // REPLACE with your DB password
          port: parseInt(process.env.DB_PORT) || 5432,
          ssl:
            process.env.DB_SSL === "true"
              ? { rejectUnauthorized: false }
              : false,
        });
      },
    },
  ],
  exports: ["DATABASE_POOL"],
})
export class DatabaseModule {}
