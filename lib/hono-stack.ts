import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';

export class HonoServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a DynamoDB table
    const table = new dynamodb.Table(this, 'MyTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      tableName: 'HockeyStats',
      removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT recommended for production
    });

    // Define the Lambda function
    const fn = new NodejsFunction(this, 'lambda', {
      entry: path.join(__dirname, '../lambda/index.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
    });
    fn.addEnvironment('TABLE_NAME', table.tableName);

    const functionUrl = fn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    });

    // Grant the Lambda function read/write permissions
    table.grantReadWriteData(fn);
    fn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['dynamodb:GetItem', 'dynamodb:PutItem'],
        resources: [table.tableArn],
      })
    );

    // Create an API Gateway REST API
    const api = new apigateway.RestApi(this, 'HonoServiceApi', {
      restApiName: 'Hono Service',
      description: 'This service serves Hono requests.',
    });

    // Create an API key
    const apiKey = api.addApiKey('ApiKey');

    // Create a usage plan
    const usagePlan = api.addUsagePlan('UsagePlan', {
      name: 'Basic',
      throttle: {
        rateLimit: 10,
        burstLimit: 2,
      },
    });

    // Associate the API key with the usage plan
    usagePlan.addApiKey(apiKey);

    // Associate the usage plan with the API Gateway stage
    usagePlan.addApiStage({
      stage: api.deploymentStage,
    });

    // Create a Lambda integration
    const lambdaIntegration = new apigateway.LambdaIntegration(fn);

    // Define API Gateway resources and methods
    const addResource = api.root.addResource('add');
    addResource.addMethod('POST', lambdaIntegration, {
      apiKeyRequired: true,
    });

    const fetchResource = api.root.addResource('fetch');
    fetchResource.addMethod('GET', lambdaIntegration, {
      apiKeyRequired: true,
    });
  }
}
