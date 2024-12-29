import { DynamoDB } from 'aws-sdk';

export interface Item {
  id: string;
  name: string;
}

export class LambdaClient {
  private readonly lambdaUrl: string;

  constructor(lambdaUrl: string) {
    this.lambdaUrl = lambdaUrl;
  }

  async addItem(item: Item): Promise<Response> {
    const response = await fetch(`${this.lambdaUrl}?action=add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    return response;
  }

  async fetchItem(id: string): Promise<Item | null> {
    const response = await fetch(`${this.lambdaUrl}?action=fetch&id=${id}`, {
      method: 'GET',
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch item with ID ${id}`);
    }
    const data = await response.json();
    return data;
  }
}
