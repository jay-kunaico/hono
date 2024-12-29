import { Hono } from 'hono';
import { DynamoDB } from 'aws-sdk';

const app = new Hono();
const ddb = new DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME!;

// Route to add an item
app.get('/add', async (c) => {
  console.log('Request data:', c.req);
  const id = c.req.query('id');
  const name = c.req.query('name');
  if (!id || !name) {
    return c.json({ error: 'Missing id or name' }, 400);
  }
  const item = { id, name };
  try {
    await ddb.put({ TableName: TABLE_NAME, Item: item }).promise();
    return c.json({ message: 'Item added' }, 200);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    return c.json({ error: errorMessage }, 500);
  }
});

// Route to fetch an item
app.get('/fetch', async (c) => {
  const id = c.req.query('id'); // Get 'id' from query parameters
  try {
    const result = await ddb
      .get({ TableName: TABLE_NAME, Key: { id } })
      .promise();
    if (!result.Item) {
      return c.json({ message: 'Item not found' }, 404);
    }
    return c.json(result.Item, 200);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    return c.json({ error: errorMessage }, 500);
  }
});

// Default route
app.get('/', (c) => c.text('Welcome to Hono + DynamoDB!'));

// Export the Hono app as the handler
export const handler = app.fetch;
