"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MastersController = void 0;
const common_1 = require("@nestjs/common");
const masters_service_1 = require("./masters.service");
let MastersController = class MastersController {
    constructor(mastersService) {
        this.mastersService = mastersService;
    }
    async findAll(type, query) {
        return this.mastersService.findAll(type.toUpperCase(), query);
    }
    async create(type, body) {
        return this.mastersService.create(type.toUpperCase(), body);
    }
};
exports.MastersController = MastersController;
__decorate([
    (0, common_1.Get)(":type"),
    __param(0, (0, common_1.Param)("type")),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MastersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(":type"),
    __param(0, (0, common_1.Param)("type")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MastersController.prototype, "create", null);
exports.MastersController = MastersController = __decorate([
    (0, common_1.Controller)("api/masters"),
    __metadata("design:paramtypes", [masters_service_1.MastersService])
], MastersController);
//# sourceMappingURL=masters.controller.js.map