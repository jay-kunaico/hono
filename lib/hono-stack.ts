import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
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

    // Add permission for function URL invocation
    fn.addPermission('LambdaUrlPermission', {
      principal: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      action: 'lambda:InvokeFunctionUrl',
      functionUrlAuthType: lambda.FunctionUrlAuthType.NONE,
    });

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

    // Output the Lambda function name and ARN
    new cdk.CfnOutput(this, 'LambdaFunctionName', {
      value: fn.functionName,
      description: 'Lambda function name',
    });

    new cdk.CfnOutput(this, 'LambdaFunctionArn', {
      value: fn.functionArn,
      description: 'Lambda function ARN',
    });
  }
}
