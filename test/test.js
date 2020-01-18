'use strict'

const test = require('tape')
const OpenAPISnippets = require('../index')

const InstagramOpenAPI = require('./instagram_swagger.json')
const BloggerOpenAPI = require('./blogger_swagger.json')
const GitHubOpenAPI = require('./github_swagger.json')
const WatsonOpenAPI = require('./watson_alchemy_language_swagger.json')
const IBMOpenAPI = require('./ibm_watson_alchemy_data_news_api.json')
const PetStoreOpenAPI = require('./petstore_swagger.json')
const PetStoreOpenAPI3 = require('./petstore_oas.json')

test('Getting snippets should not result in error or undefined', function (t) {
  t.plan(1)

  const result = OpenAPISnippets.getSnippets(InstagramOpenAPI, ['c_libcurl'])
  t.notEqual(result, undefined)
})

test('An invalid target should result in error', function (t) {
  t.plan(1)

  try {
    const result = OpenAPISnippets.getSnippets(BloggerOpenAPI, ['node_asfd'])
    console.log(result)
  } catch (err) {
    t.equal(err.toString(), 'Error: Invalid target: node_asfd')
  }
})

test('Getting snippets for endpoint should not result in error or undefined', function (t) {
  t.plan(1)

  const result = OpenAPISnippets.getEndpointSnippets(InstagramOpenAPI, '/geographies/{geo-id}/media/recent', 'get', ['c_libcurl'])
  t.notEqual(result, undefined)
})

test('Getting snippets for IBM Watson Alchemy Language should work', function (t) {
  t.plan(1)

  const result = OpenAPISnippets.getEndpointSnippets(IBMOpenAPI, '/data/GetNews', 'get', ['node_request'])
  t.notEqual(result, undefined)
})

test('Getting snippets for endpoint should contain body', function (t) {
  t.plan(2)
  // checks the 'Pages' schema...
  const result = OpenAPISnippets.getEndpointSnippets(BloggerOpenAPI, '/blogs/{blogId}/pages', 'post', ['node_request'])
  t.true(/body/.test(result.snippets[0].content))
  t.true(/subPage/.test(result.snippets[0].content))
})

test('Getting snippets from OpenAPI 3.0.x shoudl work', function (t) {
  t.plan(1)
  // checks the 'Pages' schema...
  const result = OpenAPISnippets.getEndpointSnippets(PetStoreOpenAPI3, '/pets/{id}', 'get', ['node_request'])
  t.notEqual(result, undefined)
})

test('Testing optionally provided parameter values', function (t) {
  t.plan(2)
  // checks the 'Pages' schema...
  const result = OpenAPISnippets.getEndpointSnippets(InstagramOpenAPI, '/locations/search', 'get', ['node_request'],
    {
      'distance': 5000,
      'not-a-query-param': 'foo'
    })
  t.true(/5000/.test(result.snippets[0].content))
  t.false(/not-a-query-param/.test(result.snippets[0].content))
})

test('Testing the case when default is present but a value is provided, use the provided value', function (t) {
  t.plan(2)
  // checks the 'Pages' schema...
  const result = OpenAPISnippets.getEndpointSnippets(GitHubOpenAPI, '/issues', 'get', ['node_request'],
    {
      'filter': 'assigned'
    })
  t.true(/assigned/.test(result.snippets[0].content))
  t.false(/all/.test(result.snippets[0].content)) // The default value of `filter` is `all`
})

test('Testing the case when default is present but no value is provided, use the default', function (t) {
  t.plan(2)
  // checks the 'Pages' schema...
  const result = OpenAPISnippets.getEndpointSnippets(GitHubOpenAPI, '/issues', 'get', ['node_request'])
  t.false(/assigned/.test(result.snippets[0].content))
  t.true(/all/.test(result.snippets[0].content))  // The default value of `filter` is `all`
})

test('Referenced query parameters should be resolved', function (t) {
  const result = OpenAPISnippets.getEndpointSnippets(WatsonOpenAPI, '/html/HTMLExtractDates', 'get', ['node_request'])
  const snippet = result.snippets[0].content
  t.true(/apikey: 'SOME_STRING_VALUE'/.test(snippet))
  t.true(/showSourceText: 'SOME_INTEGER_VALUE'/.test(snippet))
  t.end()
})

const refTestOpenAPI = {
  'paths': {
    '/users/{id}': {
      'get': {
        'parameters': [
          {
            'name': 'email',
            'in': 'query',
            'schema': { '$ref': '#/components/schemas/SearchFilter' },
          },
          {
            'name': 'created_at',
            'in': 'query',
            'schema': { '$ref': '#/components/schemas/DateFilter' },
            'example': '2019-07-21T17:32:28Z'
          }
        ]
      }
    }
  },
  'components': {
    'schemas': {
      'SearchFilter': {
        'type': 'array',
        'items': {
          'type': 'string'
        }
      },
      'DateFilter': {
        'type': 'object',
        'properties': {
          'after': {
            'type': 'string',
            'format': 'date'
          },
          'before': {
            'type': 'string',
            'format': 'date'
          }
        }
      }
    }
  }
}

test('Referenced query parameters schemas should be resolved [placeholder]', function (t) {
  const result = OpenAPISnippets.getEndpointSnippets(refTestOpenAPI, '/users/{id}', 'get', ['node_request'])
  const snippet = result.snippets[0].content
  t.true(/email: 'SOME_ARRAY_VALUE'/.test(snippet))
  t.end()
})

test('Referenced query parameters schemas should be resolved [param example, array, single, explode]', function (t) {
  refTestOpenAPI['paths']['/users/{id}']['get']['parameters'][0]['example'] = 'marty.mcfly@example.com'
  const result = OpenAPISnippets.getEndpointSnippets(refTestOpenAPI, '/users/{id}', 'get', ['node_request'])
  const snippet = result.snippets[0].content
  delete (refTestOpenAPI['paths']['/users/{id}']['get']['parameters'][0]['example'])
  t.true(/email: 'marty.mcfly@example.com'/.test(snippet))
  t.end()
})

test('Referenced query parameters schemas should be resolved [param example, array, multiple, explode]', function (t) {
  refTestOpenAPI['paths']['/users/{id}']['get']['parameters'][0]['example'] = ['marty.mcfly@example.com', 'doc.brown@example.com']
  const result = OpenAPISnippets.getEndpointSnippets(refTestOpenAPI, '/users/{id}', 'get', ['node_request'])
  const snippet = result.snippets[0].content
  delete (refTestOpenAPI['paths']['/users/{id}']['get']['parameters'][0]['example'])
  t.true(/email: \['marty.mcfly@example.com', 'doc.brown@example.com'\]/.test(snippet))
  t.end()
})

test('Referenced query parameters schemas should be resolved [schema example, array, single, explode]', function (t) {
  refTestOpenAPI['components']['schemas']['SearchFilter']['example'] = 'marty.mcfly@example.com'
  const result = OpenAPISnippets.getEndpointSnippets(refTestOpenAPI, '/users/{id}', 'get', ['node_request'])
  const snippet = result.snippets[0].content
  delete (refTestOpenAPI['components']['schemas']['SearchFilter']['example'])
  t.true(/email: 'marty.mcfly@example.com'/.test(snippet))
  t.end()
})

test('Referenced query parameters schemas should be resolved [schema example, array, multiple, explode]', function (t) {
  refTestOpenAPI['components']['schemas']['SearchFilter']['example'] = ['marty.mcfly@example.com', 'doc.brown@example.com']
  const result = OpenAPISnippets.getEndpointSnippets(refTestOpenAPI, '/users/{id}', 'get', ['node_request'])
  const snippet = result.snippets[0].content
  delete (refTestOpenAPI['components']['schemas']['SearchFilter']['example'])
  t.true(/email: \['marty.mcfly@example.com', 'doc.brown@example.com'\]/.test(snippet))
  t.end()
})

test('Referenced query parameters schemas should be resolved [example, array, csv]', function (t) {
  refTestOpenAPI['paths']['/users/{id}']['get']['parameters'][0]['example'] = ['marty.mcfly@example.com', 'doc.brown@example.com']
  refTestOpenAPI['paths']['/users/{id}']['get']['parameters'][0]['explode'] = false
  const result = OpenAPISnippets.getEndpointSnippets(refTestOpenAPI, '/users/{id}', 'get', ['node_request'])
  const snippet = result.snippets[0].content
  delete (refTestOpenAPI['paths']['/users/{id}']['get']['parameters'][0]['example'])
  delete (refTestOpenAPI['paths']['/users/{id}']['get']['parameters'][0]['explode'])
  t.true(/email: 'marty.mcfly@example.com,doc.brown@example.com'/.test(snippet))
  t.end()
})

test('Referenced query parameters schemas should be resolved [example, array, spaceDelimited]', function (t) {
  refTestOpenAPI['paths']['/users/{id}']['get']['parameters'][0]['example'] = ['marty.mcfly@example.com', 'doc.brown@example.com']
  refTestOpenAPI['paths']['/users/{id}']['get']['parameters'][0]['style'] = 'spaceDelimited'
  refTestOpenAPI['paths']['/users/{id}']['get']['parameters'][0]['explode'] = false
  const result = OpenAPISnippets.getEndpointSnippets(refTestOpenAPI, '/users/{id}', 'get', ['node_request'])
  const snippet = result.snippets[0].content
  delete (refTestOpenAPI['paths']['/users/{id}']['get']['parameters'][0]['example'])
  delete (refTestOpenAPI['paths']['/users/{id}']['get']['parameters'][0]['style'])
  delete (refTestOpenAPI['paths']['/users/{id}']['get']['parameters'][0]['explode'])
  t.true(/email: 'marty.mcfly@example.com doc.brown@example.com'/.test(snippet))
  t.end()
})

test('Referenced query parameters schemas should be resolved [example, array, pipeDelimited]', function (t) {
  refTestOpenAPI['paths']['/users/{id}']['get']['parameters'][0]['example'] = ['marty.mcfly@example.com', 'doc.brown@example.com']
  refTestOpenAPI['paths']['/users/{id}']['get']['parameters'][0]['style'] = 'pipeDelimited'
  refTestOpenAPI['paths']['/users/{id}']['get']['parameters'][0]['explode'] = false
  const result = OpenAPISnippets.getEndpointSnippets(refTestOpenAPI, '/users/{id}', 'get', ['node_request'])
  const snippet = result.snippets[0].content
  delete (refTestOpenAPI['paths']['/users/{id}']['get']['parameters'][0]['example'])
  delete (refTestOpenAPI['paths']['/users/{id}']['get']['parameters'][0]['style'])
  delete (refTestOpenAPI['paths']['/users/{id}']['get']['parameters'][0]['explode'])
  t.true(/email: 'marty.mcfly@example.com|doc.brown@example.com'/.test(snippet))
  t.end()
})

test('Resolve samples from nested examples', function (t) {
  const result = OpenAPISnippets.getEndpointSnippets(PetStoreOpenAPI, '/user', 'post', ['node_request'])
  const snippet = result.snippets[0].content
  t.true(/username.*John78\'/.test(snippet))
  t.true(/email.*john.smith@example.com\'/.test(snippet))
  t.true(/phone.*\+1\-202\-555\-0192/.test(snippet))
  t.true(/password.*drowssaP123/.test(snippet))
  t.end()
})
