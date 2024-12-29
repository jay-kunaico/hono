import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export class HonoServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Define the Lambda function
    const fn = new NodejsFunction(this, 'lambda', {
      entry: 'lambda/index.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
    });
    const functionUrl = fn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    });

    // Create a DynamoDB table
    const table = new dynamodb.Table(this, 'MyTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      tableName: 'HockeyStats',
      removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT recommended for production
    });

    // Grant the Lambda function read/write permissions
    table.grantReadWriteData(fn);

    // Pass the table name to the Lambda function as an environment variable
    fn.addEnvironment('TABLE_NAME', table.tableName);

    // Set up API Gateway
    new apigw.LambdaRestApi(this, 'HonoApiGateway', {
      handler: fn,
      deployOptions: {
        stageName: 'dev',
      },
    });

    // Output the Lambda function URL
    new cdk.CfnOutput(this, 'LambdaFunctionUrl', {
      value: functionUrl.url,
      description: 'The URL for the Lambda function',
    });
  }
}
