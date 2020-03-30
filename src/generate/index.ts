import { GraphQLSchema, GraphQLFieldResolver } from 'graphql';
import {
  addResolversToSchema as _addResolversToSchema,
  buildSchemaFromTypeDefinitions,
  checkForResolveTypeResolver,
  concatenateTypeDefs,
  extendResolversFromInterfaces as _extendResolversFromInterfaces,
  extractExtensionDefinitions,
  filterExtensionDefinitions,
  SchemaError,
} from '@graphql-toolkit/core';

import {
  IAddResolversToSchemaOptions,
  IResolvers,
  IResolverValidationOptions,
} from '../Interfaces';

import addSchemaLevelResolver from './addSchemaLevelResolver';
import assertResolversPresent from './assertResolversPresent';

// extendResolversFromInterfaces //

export function addResolversToSchema(
  schemaOrOptions: GraphQLSchema | IAddResolversToSchemaOptions,
  legacyInputResolvers?: IResolvers,
  legacyInputValidationOptions?: IResolverValidationOptions,
): GraphQLSchema {
  return _addResolversToSchema(
    schemaOrOptions,
    legacyInputResolvers as any,
    legacyInputValidationOptions,
  );
}

export function extendResolversFromInterfaces(
  schema: GraphQLSchema,
  resolvers: IResolvers,
): IResolvers {
  return _extendResolversFromInterfaces(schema, resolvers);
}

export {
  buildSchemaFromTypeDefinitions,
  addSchemaLevelResolver,
  assertResolversPresent,
  checkForResolveTypeResolver,
  concatenateTypeDefs,
  extractExtensionDefinitions,
  filterExtensionDefinitions,
  SchemaError,
};
export { default as attachDirectiveResolvers } from './attachDirectiveResolvers';
export { default as attachConnectorsToContext } from './attachConnectorsToContext';
export { chainResolvers } from './chainResolvers';
export { default as decorateWithLogger } from './decorateWithLogger';
export * from './makeExecutableSchema';

// These functions are preserved for backwards compatibility.
// They are not simply rexported with new (old) names so as to allow
// typedoc to annotate them.
export function addResolveFunctionsToSchema(
  schemaOrOptions: GraphQLSchema | IAddResolversToSchemaOptions,
  legacyInputResolvers?: IResolvers,
  legacyInputValidationOptions?: IResolverValidationOptions,
): GraphQLSchema {
  return addResolversToSchema(
    schemaOrOptions,
    legacyInputResolvers,
    legacyInputValidationOptions,
  );
}

export function addSchemaLevelResolveFunction(
  schema: GraphQLSchema,
  fn: GraphQLFieldResolver<any, any>,
): void {
  addSchemaLevelResolver(schema, fn);
}

export function assertResolveFunctionsPresent(
  schema: GraphQLSchema,
  resolverValidationOptions: IResolverValidationOptions = {},
): void {
  assertResolversPresent(schema, resolverValidationOptions);
}
