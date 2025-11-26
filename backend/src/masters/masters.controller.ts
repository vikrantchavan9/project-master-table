import { Controller, Get, Post, Body, Query, Param } from "@nestjs/common";
import { MastersService } from "./masters.service";

@Controller("api/masters")
export class MastersController {
  constructor(private readonly mastersService: MastersService) {}

  @Get(":type")
  async findAll(@Param("type") type: string, @Query() query: any) {
    return this.mastersService.findAll(type.toUpperCase(), query);
  }

  @Post(":type")
  async create(@Param("type") type: string, @Body() body: any) {
    return this.mastersService.create(type.toUpperCase(), body);
  }
}
