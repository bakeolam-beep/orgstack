"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantConnectionService = void 0;
var common_1 = require("@nestjs/common");
var TenantConnectionService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var TenantConnectionService = _classThis = /** @class */ (function () {
        function TenantConnectionService_1(dataSource) {
            this.dataSource = dataSource;
            this.tenantIdPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,62}$/;
        }
        TenantConnectionService_1.prototype.validateTenantId = function (tenantId) {
            if (typeof tenantId !== 'string' || !this.tenantIdPattern.test(tenantId)) {
                throw new Error('Invalid tenant ID');
            }
            return tenantId;
        };
        TenantConnectionService_1.prototype.getTenantSchema = function (tenantId) {
            return "tenant_".concat(this.validateTenantId(tenantId));
        };
        TenantConnectionService_1.prototype.quoteIdentifier = function (identifier) {
            return "\"".concat(identifier.replace(/"/g, '""'), "\"");
        };
        TenantConnectionService_1.prototype.withTenantScope = function (tenantId, operation, options) {
            return __awaiter(this, void 0, void 0, function () {
                var schema, searchPath, queryRunner;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            schema = this.getTenantSchema(tenantId);
                            searchPath = (options === null || options === void 0 ? void 0 : options.includePlatformSchema)
                                ? "".concat(this.quoteIdentifier(schema), ", ").concat(this.quoteIdentifier('platform'), ", public")
                                : "".concat(this.quoteIdentifier(schema), ", public");
                            queryRunner = this.dataSource.createQueryRunner();
                            return [4 /*yield*/, queryRunner.connect()];
                        case 1:
                            _a.sent();
                            _a.label = 2;
                        case 2:
                            _a.trys.push([2, , 5, 7]);
                            return [4 /*yield*/, queryRunner.query("SET search_path TO ".concat(searchPath))];
                        case 3:
                            _a.sent();
                            return [4 /*yield*/, operation(queryRunner, schema)];
                        case 4: return [2 /*return*/, _a.sent()];
                        case 5: return [4 /*yield*/, queryRunner.release()];
                        case 6:
                            _a.sent();
                            return [7 /*endfinally*/];
                        case 7: return [2 /*return*/];
                    }
                });
            });
        };
        TenantConnectionService_1.prototype.createTenantSchema = function (tenantId_1) {
            return __awaiter(this, arguments, void 0, function (tenantId, entities) {
                var schema, quotedSchema, searchPath, queryRunner, error_1;
                if (entities === void 0) { entities = []; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            schema = this.getTenantSchema(tenantId);
                            quotedSchema = this.quoteIdentifier(schema);
                            searchPath = "".concat(quotedSchema, ", public");
                            queryRunner = this.dataSource.createQueryRunner();
                            return [4 /*yield*/, queryRunner.connect()];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, queryRunner.startTransaction()];
                        case 2:
                            _a.sent();
                            _a.label = 3;
                        case 3:
                            _a.trys.push([3, 8, 10, 12]);
                            return [4 /*yield*/, queryRunner.query("CREATE SCHEMA IF NOT EXISTS ".concat(quotedSchema))];
                        case 4:
                            _a.sent();
                            return [4 /*yield*/, queryRunner.query("SET search_path TO ".concat(searchPath))];
                        case 5:
                            _a.sent();
                            return [4 /*yield*/, this.runTenantTableMigrations(queryRunner, quotedSchema, entities)];
                        case 6:
                            _a.sent();
                            return [4 /*yield*/, queryRunner.commitTransaction()];
                        case 7:
                            _a.sent();
                            return [3 /*break*/, 12];
                        case 8:
                            error_1 = _a.sent();
                            return [4 /*yield*/, queryRunner.rollbackTransaction()];
                        case 9:
                            _a.sent();
                            throw error_1;
                        case 10: return [4 /*yield*/, queryRunner.release()];
                        case 11:
                            _a.sent();
                            return [7 /*endfinally*/];
                        case 12: return [2 /*return*/];
                    }
                });
            });
        };
        TenantConnectionService_1.prototype.runTenantTableMigrations = function (_queryRunner, _quotedSchema, entities) {
            return __awaiter(this, void 0, void 0, function () {
                var _i, entities_1, entity, tableName, quotedTable, columns, checkConstraints, _a, _b, column, colType, isUuidPrimary, defaultValue, enumValues, enumValuesStr, constraintName, columnMeta, colDef, fkDefs, _c, _d, rel, fkName, fkColName, fkCol, refEntity, refTable, refCol, allConstraints, sql;
                var _e, _f, _g, _h, _j, _k;
                return __generator(this, function (_l) {
                    switch (_l.label) {
                        case 0:
                            _i = 0, entities_1 = entities;
                            _l.label = 1;
                        case 1:
                            if (!(_i < entities_1.length)) return [3 /*break*/, 4];
                            entity = entities_1[_i];
                            tableName = entity.tableName;
                            if (!tableName)
                                return [3 /*break*/, 3];
                            quotedTable = this.quoteIdentifier(tableName);
                            columns = [];
                            checkConstraints = [];
                            for (_a = 0, _b = entity.columns; _a < _b.length; _a++) {
                                column = _b[_a];
                                colType = void 0;
                                isUuidPrimary = false;
                                defaultValue = null;
                                if (column.type === String)
                                    colType = 'varchar';
                                else if ((column.type === Number || column.type === 'uuid' || column.type === 'UUID') && column.isPrimary) {
                                    colType = 'uuid';
                                    isUuidPrimary = true;
                                }
                                else if (column.type === Number)
                                    colType = 'integer';
                                else if (column.type === Date)
                                    colType = 'timestamp';
                                else if (column.type === Boolean)
                                    colType = 'boolean';
                                else if (typeof column.type === 'string' && column.enum && Array.isArray(column.enum) && column.enum.length > 0) {
                                    // Handle enum columns - use varchar with check constraint
                                    colType = 'varchar';
                                    enumValues = column.enum;
                                    enumValuesStr = enumValues.map(function (v) { return "'".concat(v, "'"); }).join(', ');
                                    constraintName = this.quoteIdentifier("".concat(tableName, "_").concat(column.propertyName, "_check"));
                                    checkConstraints.push("CONSTRAINT ".concat(constraintName, " CHECK (").concat(this.quoteIdentifier(column.propertyName), " IN (").concat(enumValuesStr, "))"));
                                }
                                else if (typeof column.type === 'string')
                                    colType = column.type;
                                else
                                    colType = 'varchar';
                                columnMeta = column;
                                if (columnMeta.createDate) {
                                    defaultValue = 'DEFAULT CURRENT_TIMESTAMP';
                                }
                                else if (columnMeta.updateDate) {
                                    defaultValue = 'DEFAULT CURRENT_TIMESTAMP';
                                }
                                else if (column.default !== undefined && column.default !== null) {
                                    if (typeof column.default === 'function') {
                                        defaultValue = "DEFAULT ".concat(column.default());
                                    }
                                    else if (typeof column.default === 'string') {
                                        defaultValue = "DEFAULT '".concat(String(column.default).replace(/'/g, "''"), "'");
                                    }
                                    else {
                                        defaultValue = "DEFAULT ".concat(column.default);
                                    }
                                }
                                colDef = "".concat(this.quoteIdentifier(column.propertyName), " ").concat(colType);
                                if (column.isPrimary)
                                    colDef += ' PRIMARY KEY';
                                if (column.isGenerated) {
                                    if (isUuidPrimary) {
                                        colDef += ' DEFAULT gen_random_uuid()';
                                    }
                                    else {
                                        colDef += ' GENERATED ALWAYS AS IDENTITY';
                                    }
                                }
                                if (column.isUnique)
                                    colDef += ' UNIQUE';
                                if (column.isNullable)
                                    colDef += ' NULL';
                                else
                                    colDef += ' NOT NULL';
                                if (defaultValue)
                                    colDef += " ".concat(defaultValue);
                                columns.push(colDef);
                            }
                            fkDefs = [];
                            for (_c = 0, _d = entity.relations; _c < _d.length; _c++) {
                                rel = _d[_c];
                                if (rel.isManyToOne || rel.isOneToOne) {
                                    fkName = this.quoteIdentifier("fk_".concat(tableName, "_").concat(rel.propertyName));
                                    fkColName = (_f = (_e = rel.joinColumns[0]) === null || _e === void 0 ? void 0 : _e.propertyName) !== null && _f !== void 0 ? _f : "".concat(rel.propertyName, "Id");
                                    fkCol = this.quoteIdentifier(fkColName);
                                    refEntity = rel.inverseEntityMetadata;
                                    if (!refEntity)
                                        continue;
                                    refTable = this.quoteIdentifier(refEntity.tableName);
                                    refCol = this.quoteIdentifier((_j = (_h = (_g = rel.joinColumns[0]) === null || _g === void 0 ? void 0 : _g.referencedColumn) === null || _h === void 0 ? void 0 : _h.propertyName) !== null && _j !== void 0 ? _j : 'id');
                                    fkDefs.push("CONSTRAINT ".concat(fkName, " FOREIGN KEY (").concat(fkCol, ") REFERENCES ").concat(refTable, "(").concat(refCol, ") ON DELETE ").concat((_k = rel.onDelete) !== null && _k !== void 0 ? _k : 'CASCADE'));
                                }
                            }
                            allConstraints = __spreadArray(__spreadArray(__spreadArray([], columns, true), fkDefs, true), checkConstraints, true);
                            sql = "CREATE TABLE IF NOT EXISTS ".concat(quotedTable, " (").concat(allConstraints.join(', '), ")");
                            return [4 /*yield*/, _queryRunner.query(sql)];
                        case 2:
                            _l.sent();
                            _l.label = 3;
                        case 3:
                            _i++;
                            return [3 /*break*/, 1];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        return TenantConnectionService_1;
    }());
    __setFunctionName(_classThis, "TenantConnectionService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        TenantConnectionService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return TenantConnectionService = _classThis;
}();
exports.TenantConnectionService = TenantConnectionService;
