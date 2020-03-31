import { GraphQLError, graphql } from 'graphql';

import { relocatedError } from '../stitch/errors';
import { getErrors, ERROR_SYMBOL } from '../stitch/proxiedResult';
import { checkResultAndHandleErrors } from '../delegate/checkResultAndHandleErrors';
import { makeExecutableSchema } from '../generate/index';
import { mergeSchemas } from '../stitch/index';
import { IGraphQLToolsResolveInfo } from '../Interfaces';

class ErrorWithExtensions extends GraphQLError {
  constructor(message: string, code: string) {
    super(message, null, null, null, null, null, { code });
  }
}

describe('Errors', () => {
  describe('relocatedError', () => {
    test('should adjust the path of a GraphqlError', () => {
      const originalError = new GraphQLError('test', null, null, null, [
        'test',
      ]);
      const newError = relocatedError(originalError, null, ['test', 1]);
      const expectedError = new GraphQLError('test', null, null, null, [
        'test',
        1,
      ]);
      expect(newError).toEqual(expectedError);
    });

    test('should also locate a non GraphQLError', () => {
      const originalError = new Error('test');
      const newError = relocatedError(originalError, null, ['test', 1]);
      const expectedError = new GraphQLError('test', null, null, null, [
        'test',
        1,
      ]);
      expect(newError).toEqual(expectedError);
    });
  });

  describe('getErrors', () => {
    test('should return all errors including if path is not defined', () => {
      const error = {
        message: 'Test error without path',
      };
      const mockErrors: any = {
        responseKey: '',
        [ERROR_SYMBOL]: [error],
      };

      expect(getErrors(mockErrors, 'responseKey')).toEqual([
        mockErrors[ERROR_SYMBOL][0],
      ]);
    });
  });

  describe('checkResultAndHandleErrors', () => {
    test('persists single error', () => {
      const result = {
        errors: [new GraphQLError('Test error')],
      };
      try {
        checkResultAndHandleErrors(
          result,
          {},
          ({} as unknown) as IGraphQLToolsResolveInfo,
          'responseKey',
        );
      } catch (e) {
        expect(e.message).toEqual('Test error');
        expect(e.originalError.errors).toBeUndefined();
      }
    });

    test('persists single error with extensions', () => {
      const result = {
        errors: [new ErrorWithExtensions('Test error', 'UNAUTHENTICATED')],
      };
      try {
        checkResultAndHandleErrors(
          result,
          {},
          ({} as unknown) as IGraphQLToolsResolveInfo,
          'responseKey',
        );
      } catch (e) {
        expect(e.message).toEqual('Test error');
        expect(e.extensions && e.extensions.code).toEqual('UNAUTHENTICATED');
        expect(e.originalError.errors).toBeUndefined();
      }
    });

    test('combines errors and persists the original errors', () => {
      const result = {
        errors: [new GraphQLError('Error1'), new GraphQLError('Error2')],
      };
      try {
        checkResultAndHandleErrors(
          result,
          {},
          ({} as unknown) as IGraphQLToolsResolveInfo,
          'responseKey',
        );
      } catch (e) {
        expect(e.message).toEqual('Error1\nError2');
        expect(e.originalError).toBeDefined();
        expect(e.originalError.errors).toBeDefined();
        expect(e.originalError.errors).toHaveLength(result.errors.length);
        result.errors.forEach((error, i) => {
          expect(e.originalError.errors[i]).toEqual(error);
        });
      }
    });
  });
});

describe('passes along errors for missing fields on list', () => {
  test('if non-null', async () => {
    const typeDefs = `
      type Query {
        getOuter: Outer
      }
      type Outer {
        innerList: [Inner!]!
      }
      type Inner {
        mandatoryField: String!
      }
    `;

    const schema = makeExecutableSchema({
      typeDefs,
      resolvers: {
        Query: {
          getOuter: () => ({
            innerList: [{ mandatoryField: 'test' }, {}],
          }),
        },
      },
    });

    const mergedSchema = mergeSchemas({
      schemas: [schema],
    });
    const result = await graphql(
      mergedSchema,
      '{ getOuter { innerList { mandatoryField } } }',
    );
    expect(result).toEqual({
      data: {
        getOuter: null,
      },
      errors: [
        {
          locations: [
            {
              column: 26,
              line: 1,
            },
          ],
          message:
            'Cannot return null for non-nullable field Inner.mandatoryField.',
          path: ['getOuter', 'innerList', 1, 'mandatoryField'],
        },
      ],
    });
  });

  test('even if nullable', async () => {
    const typeDefs = `
      type Query {
        getOuter: Outer
      }
      type Outer {
        innerList: [Inner]!
      }
      type Inner {
        mandatoryField: String!
      }
    `;

    const schema = makeExecutableSchema({
      typeDefs,
      resolvers: {
        Query: {
          getOuter: () => ({
            innerList: [{ mandatoryField: 'test' }, {}],
          }),
        },
      },
    });

    const mergedSchema = mergeSchemas({
      schemas: [schema],
    });
    const result = await graphql(
      mergedSchema,
      '{ getOuter { innerList { mandatoryField } } }',
    );
    expect(result).toEqual({
      data: {
        getOuter: {
          innerList: [{ mandatoryField: 'test' }, null],
        },
      },
      errors: [
        {
          locations: [
            {
              column: 26,
              line: 1,
            },
          ],
          message:
            'Cannot return null for non-nullable field Inner.mandatoryField.',
          path: ['getOuter', 'innerList', 1, 'mandatoryField'],
        },
      ],
    });
  });
});

describe('passes along errors when list field errors', () => {
  test('if non-null', async () => {
    const typeDefs = `
      type Query {
        getOuter: Outer
      }
      type Outer {
        innerList: [Inner!]!
      }
      type Inner {
        mandatoryField: String!
      }
    `;

    const schema = makeExecutableSchema({
      typeDefs,
      resolvers: {
        Query: {
          getOuter: () => ({
            innerList: [{ mandatoryField: 'test' }, new Error('test')],
          }),
        },
      },
    });

    const mergedSchema = mergeSchemas({
      schemas: [schema],
    });
    const result = await graphql(
      mergedSchema,
      '{ getOuter { innerList { mandatoryField } } }',
    );
    expect(result).toEqual({
      data: {
        getOuter: null,
      },
      errors: [
        {
          locations: [
            {
              column: 14,
              line: 1,
            },
          ],
          message: 'test',
          path: ['getOuter', 'innerList', 1],
        },
      ],
    });
  });

  test('even if nullable', async () => {
    const typeDefs = `
      type Query {
        getOuter: Outer
      }
      type Outer {
        innerList: [Inner]!
      }
      type Inner {
        mandatoryField: String!
      }
    `;

    const schema = makeExecutableSchema({
      typeDefs,
      resolvers: {
        Query: {
          getOuter: () => ({
            innerList: [{ mandatoryField: 'test' }, new Error('test')],
          }),
        },
      },
    });

    const mergedSchema = mergeSchemas({
      schemas: [schema],
    });
    const result = await graphql(
      mergedSchema,
      '{ getOuter { innerList { mandatoryField } } }',
    );
    expect(result).toEqual({
      data: {
        getOuter: {
          innerList: [{ mandatoryField: 'test' }, null],
        },
      },
      errors: [
        {
          locations: [
            {
              column: 14,
              line: 1,
            },
          ],
          message: 'test',
          path: ['getOuter', 'innerList', 1],
        },
      ],
    });
  });
});
