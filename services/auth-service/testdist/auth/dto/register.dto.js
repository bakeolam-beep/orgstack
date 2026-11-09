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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegisterDto = void 0;
var class_validator_1 = require("class-validator");
var RegisterDto = function () {
    var _a;
    var _businessName_decorators;
    var _businessName_initializers = [];
    var _businessName_extraInitializers = [];
    var _adminEmail_decorators;
    var _adminEmail_initializers = [];
    var _adminEmail_extraInitializers = [];
    var _adminPassword_decorators;
    var _adminPassword_initializers = [];
    var _adminPassword_extraInitializers = [];
    return _a = /** @class */ (function () {
            function RegisterDto() {
                this.businessName = __runInitializers(this, _businessName_initializers, void 0);
                this.adminEmail = (__runInitializers(this, _businessName_extraInitializers), __runInitializers(this, _adminEmail_initializers, void 0));
                this.adminPassword = (__runInitializers(this, _adminEmail_extraInitializers), __runInitializers(this, _adminPassword_initializers, void 0));
                __runInitializers(this, _adminPassword_extraInitializers);
            }
            return RegisterDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _businessName_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsNotEmpty)()];
            _adminEmail_decorators = [(0, class_validator_1.IsEmail)()];
            _adminPassword_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsNotEmpty)(), (0, class_validator_1.MinLength)(8)];
            __esDecorate(null, null, _businessName_decorators, { kind: "field", name: "businessName", static: false, private: false, access: { has: function (obj) { return "businessName" in obj; }, get: function (obj) { return obj.businessName; }, set: function (obj, value) { obj.businessName = value; } }, metadata: _metadata }, _businessName_initializers, _businessName_extraInitializers);
            __esDecorate(null, null, _adminEmail_decorators, { kind: "field", name: "adminEmail", static: false, private: false, access: { has: function (obj) { return "adminEmail" in obj; }, get: function (obj) { return obj.adminEmail; }, set: function (obj, value) { obj.adminEmail = value; } }, metadata: _metadata }, _adminEmail_initializers, _adminEmail_extraInitializers);
            __esDecorate(null, null, _adminPassword_decorators, { kind: "field", name: "adminPassword", static: false, private: false, access: { has: function (obj) { return "adminPassword" in obj; }, get: function (obj) { return obj.adminPassword; }, set: function (obj, value) { obj.adminPassword = value; } }, metadata: _metadata }, _adminPassword_initializers, _adminPassword_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.RegisterDto = RegisterDto;
