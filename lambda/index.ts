import { Hono } from 'hono';
import { DynamoDB } from 'aws-sdk';
import { Request } from 'node-fetch';

const app = new Hono();
const ddb = new DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME!;

// Basic log statement to confirm function invocation
console.log('Lambda function invoked');

// Middleware to log incoming requests
app.use('*', async (c, next) => {
  console.log('Received request:', {
    method: c.req.method,
    path: c.req.path,
    headers: c.req.header,
    query: c.req.query(),
    body: await c.req.text(),
  });
  await next();
});

// Route to add an item
app.post('/add', async (c) => {
  console.log('Received request for /add');
  try {
    const { id, name } = await c.req.json();
    console.log('Parsed request body:', { id, name });
    if (!id || !name) {
      console.log('Missing id or name');
      return c.json({ error: 'Missing id or name' }, 400);
    }
    const item = { id, name };
    await ddb.put({ TableName: TABLE_NAME, Item: item }).promise();
    console.log('Item added:', item);
    return c.json({ message: 'Item added' }, 200);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    console.error('Error adding item:', errorMessage);
    return c.json({ error: errorMessage }, 500);
  }
});

// Route to fetch an item
app.get('/fetch', async (c) => {
  console.log('Received request for /fetch');
  const id = c.req.query('id'); // Get 'id' from query parameters
  console.log('Query parameter id:', id);
  try {
    const result = await ddb
      .get({ TableName: TABLE_NAME, Key: { id } })
      .promise();
    if (!result.Item) {
      console.log('Item not found');
      return c.json({ message: 'Item not found' }, 404);
    }
    console.log('Fetched item:', result.Item);
    return c.json(result.Item, 200);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    console.error('Error fetching item:', errorMessage);
    return c.json({ error: errorMessage }, 500);
  }
});

// Default route
app.get('/', (c) => c.text('Welcome to Hono + DynamoDB!'));

// Export the Hono app as the handler
export const handler = async (event: any, context: any) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  // Ensure headers are present
  const headers = event.headers || {};
  console.log('Headers:', JSON.stringify(headers, null, 2));

  // Ensure Host header is present
  const host = headers.Host || headers.host || 'localhost';
  const url = `https://${host}${event.path}`;
  //   const url = `https://${event.headers.Host}${event.path}`;
  const request = new Request(url, {
    method: event.httpMethod,
    headers: event.headers,
    body: event.body,
  });

  return app.fetch(request, context);
};
