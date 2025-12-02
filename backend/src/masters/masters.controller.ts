import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  Put,
  Delete,
} from "@nestjs/common";
import { MastersService } from "./masters.service";

@Controller("api/masters")
export class MastersController {
  constructor(private readonly mastersService: MastersService) {}

  @Get(":type")
  async findAll(@Param("type") type: string, @Query() query: any) {
    console.log("📌 [CONTROLLER] Type:", type.toUpperCase());
    console.log("📌 [CONTROLLER] Query received:", query);
    return this.mastersService.findAll(type.toUpperCase(), query);
  }

  @Post(":type")
  async create(@Param("type") type: string, @Body() body: any) {
    return this.mastersService.create(type.toUpperCase(), body);
  }

  @Put(":type/:id")
  async update(
    @Param("type") type: string,
    @Param("id") id: string,
    @Body() body: any
  ) {
    return this.mastersService.update(type.toUpperCase(), id, body);
  }

  @Delete(":type/:id")
  async remove(@Param("type") type: string, @Param("id") id: string) {
    return this.mastersService.remove(type.toUpperCase(), id);
  }
}
