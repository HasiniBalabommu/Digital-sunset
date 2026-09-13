
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, UpdateCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*"
};

exports.handler = async (event) => {
  try {
    const userId = event.requestContext.authorizer?.claims?.sub || "test-user";
    const itemId = event.pathParameters.id;

    const command = new UpdateCommand({
      TableName: process.env.TABLE_NAME,
      Key: { userId, itemId },
      UpdateExpression: "SET lastCheckIn = :now, escalationStage = :stage",
      ExpressionAttributeValues: {
        ":now": new Date().toISOString(),
        ":stage": "none"
      },
      ReturnValues: "ALL_NEW"
    });

    const result = await docClient.send(command);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(result.Attributes)
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Failed to check in" })
    };
  }
};